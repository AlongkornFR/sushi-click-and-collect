"""Tests du parcours de commande : checkout, paiement Payplug, écran staff.

Payplug et les emails sont simulés : aucun appel réseau n'est fait.
"""
from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase, TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from products.models import Category, Product, SubCategory
from .models import Order, OrderItem
from .opening_hours import PickupError, parse_pickup, pickup_label, public_schedule

User = get_user_model()


def next_weekday_slot(weekday=0, hm="12:30"):
    """Créneau valide : le prochain jour donné (0 = lundi), au moins 1 jour plus tard."""
    d = timezone.localdate() + timedelta(days=1)
    while d.weekday() != weekday:
        d += timedelta(days=1)
    return f"{d:%Y-%m-%d} {hm}"


def paris(y, m, d, h, mi):
    return timezone.make_aware(datetime(y, m, d, h, mi), timezone.get_current_timezone())


def fake_payment_created(payment_id="pay_test_1"):
    return SimpleNamespace(
        id=payment_id,
        hosted_payment=SimpleNamespace(payment_url="https://secure.payplug.test/pay/1"),
    )


def fake_payment(order, *, is_paid=True, amount=None, currency="EUR"):
    return SimpleNamespace(
        is_paid=is_paid,
        amount=order.total_cents if amount is None else amount,
        currency=currency,
        metadata={"order_id": str(order.id)},
    )


class OrderFixturesMixin:
    def setUp(self):
        cache.clear()  # remet à zéro les compteurs de limitation (lot H2)
        self.client = APIClient()
        self.category = Category.objects.create(name="Sushis", slug="sushis")
        self.sub = SubCategory.objects.create(name="Makis", slug="makis", category=self.category)
        self.product = Product.objects.create(
            name="Maki saumon", price=Decimal("6.50"), category=self.category,
            subcategory=self.sub, stock=10, is_available=True,
        )
        self.other = Product.objects.create(
            name="Nigiri thon", price=Decimal("4.20"), category=self.category,
            subcategory=self.sub, stock=10, is_available=True,
        )

    def checkout_payload(self, items=None, **overrides):
        payload = {
            "customer": {"full_name": "Marie Dupont", "email": "marie@example.com", "phone": "0612345678"},
            "pickup_time": next_weekday_slot(),
            "notes": "",
            "items": items if items is not None else [{"product_id": self.product.id, "quantity": 2}],
        }
        payload.update(overrides)
        return payload

    def make_order(self, status="pending", payment_id="pay_test_1", total_cents=1300, **kw):
        order = Order.objects.create(
            full_name="Marie Dupont", email="marie@example.com", phone="0612345678",
            pickup_time="12:30", status=status, total_cents=total_cents,
            payment_id=payment_id, **kw,
        )
        OrderItem.objects.create(
            order=order, product_id=self.product.id, product_name=self.product.name,
            unit_price_cents=650, quantity=2,
        )
        return order


@override_settings(PAYPLUG_SECRET_KEY="sk_test_dummy")
@patch("orders.views.payplug.Payment.create", return_value=fake_payment_created())
class CheckoutTests(OrderFixturesMixin, TestCase):

    def test_total_is_computed_from_database_prices(self, _create):
        items = [
            {"product_id": self.product.id, "quantity": 2, "price": "0.01"},
            {"product_id": self.other.id, "quantity": 1},
        ]
        res = self.client.post("/api/checkout/", self.checkout_payload(items), format="json")
        self.assertEqual(res.status_code, 201, res.content)
        order = Order.objects.get(id=res.data["order_id"])
        self.assertEqual(order.total_cents, 2 * 650 + 420)
        self.assertEqual(order.status, "pending")
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(res.data["payment_url"], "https://secure.payplug.test/pay/1")

    def test_payplug_receives_the_server_total(self, create):
        self.client.post("/api/checkout/", self.checkout_payload(), format="json")
        self.assertEqual(create.call_args.kwargs["amount"], 1300)
        self.assertEqual(create.call_args.kwargs["currency"], "EUR")

    def test_rejects_unavailable_product(self, _create):
        self.product.is_available = False
        self.product.save()
        res = self.client.post("/api/checkout/", self.checkout_payload(), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_rejects_empty_cart(self, _create):
        res = self.client.post("/api/checkout/", self.checkout_payload(items=[]), format="json")
        self.assertEqual(res.status_code, 400)

    def test_rejects_missing_customer_name(self, _create):
        payload = self.checkout_payload()
        payload["customer"]["full_name"] = ""
        res = self.client.post("/api/checkout/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    # Lot C3 : un produit disponible se commande, le stock n'a plus d'effet.
    def test_available_product_with_zero_stock_can_be_ordered(self, _create):
        self.product.stock = 0
        self.product.save()
        res = self.client.post("/api/checkout/", self.checkout_payload(), format="json")
        self.assertEqual(res.status_code, 201, res.content)

    def test_checkout_does_not_change_stock(self, _create):
        self.client.post("/api/checkout/", self.checkout_payload(), format="json")
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)

    # Lot C4 : la date de retrait est conservée et validée.
    def test_checkout_stores_pickup_date_and_time(self, _create):
        slot = next_weekday_slot(weekday=4, hm="21:45")
        res = self.client.post("/api/checkout/", self.checkout_payload(pickup_time=slot), format="json")
        self.assertEqual(res.status_code, 201, res.content)
        order = Order.objects.get(id=res.data["order_id"])
        self.assertEqual(f"{timezone.localtime(order.pickup_at):%Y-%m-%d %H:%M}", slot)
        self.assertEqual(order.pickup_time, "21:45")

    def test_checkout_rejects_saturday(self, _create):
        res = self.client.post("/api/checkout/", self.checkout_payload(pickup_time=next_weekday_slot(5)), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["field"], "pickup_time")
        self.assertEqual(Order.objects.count(), 0)

    def test_checkout_rejects_time_outside_opening_hours(self, _create):
        res = self.client.post("/api/checkout/", self.checkout_payload(pickup_time=next_weekday_slot(0, "15:00")), format="json")
        self.assertEqual(res.status_code, 400)

    def test_order_detail_exposes_pickup_label(self, _create):
        res = self.client.post("/api/checkout/", self.checkout_payload(), format="json")
        detail = self.client.get(f"/api/orders/t/{res.data['token']}/")
        self.assertIn("à 12h30", detail.data["pickup_label"])

    # Lot C5 : la commande se consulte avec un jeton, pas avec l'ID.
    def test_checkout_returns_token_and_puts_it_in_return_url(self, create):
        res = self.client.post("/api/checkout/", self.checkout_payload(), format="json")
        order = Order.objects.get(id=res.data["order_id"])
        self.assertEqual(res.data["token"], str(order.public_token))
        urls = create.call_args.kwargs["hosted_payment"]
        self.assertIn(f"token={order.public_token}", urls["return_url"])
        self.assertIn(f"order_id={order.id}", urls["return_url"])
        self.assertIn(f"token={order.public_token}", urls["cancel_url"])


@override_settings(PAYPLUG_SECRET_KEY="sk_test_dummy")
@patch("orders.views.payplug.Payment.create", return_value=fake_payment_created())
class CheckoutValidationTests(OrderFixturesMixin, TestCase):
    """Lot H1 : une saisie inattendue donne un 400 lisible, jamais un 500."""

    def post(self, payload):
        return self.client.post("/api/checkout/", payload, format="json")

    def test_non_numeric_quantity_is_400(self, _create):
        res = self.post(self.checkout_payload(items=[{"product_id": self.product.id, "quantity": "deux"}]))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], "Quantité invalide.")

    def test_non_numeric_product_id_is_400(self, _create):
        res = self.post(self.checkout_payload(items=[{"product_id": "abc", "quantity": 1}]))
        self.assertEqual(res.status_code, 400)

    def test_quantity_above_limit_is_400(self, _create):
        res = self.post(self.checkout_payload(items=[{"product_id": self.product.id, "quantity": 51}]))
        self.assertEqual(res.status_code, 400)

    def test_duplicate_lines_are_merged(self, _create):
        items = [{"product_id": self.product.id, "quantity": 1}, {"product_id": self.product.id, "quantity": 2}]
        res = self.post(self.checkout_payload(items=items))
        self.assertEqual(res.status_code, 201, res.content)
        order = Order.objects.get(id=res.data["order_id"])
        self.assertEqual(order.items.get().quantity, 3)
        self.assertEqual(order.total_cents, 3 * 650)

    def test_invalid_email_is_400(self, _create):
        payload = self.checkout_payload()
        payload["customer"]["email"] = "pas-un-email"
        res = self.post(payload)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], "Adresse email invalide.")

    def test_guest_without_phone_is_400(self, _create):
        payload = self.checkout_payload()
        payload["customer"]["phone"] = ""
        self.assertEqual(self.post(payload).status_code, 400)

    def test_logged_in_customer_without_phone_is_accepted(self, _create):
        user = User.objects.create_user("client@example.com", password="motdepasse-solide-1")
        self.client.force_authenticate(user)
        payload = self.checkout_payload()
        payload["customer"]["phone"] = ""
        self.assertEqual(self.post(payload).status_code, 201)

    def test_note_too_long_is_400(self, _create):
        self.assertEqual(self.post(self.checkout_payload(notes="x" * 501)).status_code, 400)

    def test_overlong_pickup_value_is_400_not_500(self, _create):
        res = self.post(self.checkout_payload(pickup_time="x" * 40))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["field"], "pickup_time")

    def test_unavailable_product_message_is_readable(self, _create):
        self.product.is_available = False
        self.product.save()
        res = self.post(self.checkout_payload())
        self.assertEqual(res.data["unavailable_product_id"], self.product.id)
        self.assertNotIn("id=", res.data["detail"])

    def test_payplug_failure_cancels_order_and_hides_details(self, create):
        create.side_effect = RuntimeError("secret internal detail")
        res = self.post(self.checkout_payload())
        self.assertEqual(res.status_code, 502)
        self.assertNotIn("secret internal detail", res.data["detail"])
        self.assertEqual(Order.objects.get().status, "cancelled")

    @override_settings(PAYPLUG_SECRET_KEY="")
    def test_missing_payplug_key_creates_no_order(self, _create):
        res = self.post(self.checkout_payload())
        self.assertEqual(res.status_code, 503)
        self.assertNotIn("PAYPLUG", res.data["detail"])
        self.assertEqual(Order.objects.count(), 0)


@override_settings(PAYPLUG_SECRET_KEY="sk_test_dummy")
@patch("orders.views.award_point_for_order")
@patch("orders.views._send_receipt_email")
class PaymentConfirmationTests(OrderFixturesMixin, TestCase):

    def test_receipt_is_sent_only_after_commit(self, send_email, _award):
        order = self.make_order()
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(order)), \
                self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.client.post("/api/payplug/ipn/", {"id": order.payment_id}, format="json")
        send_email.assert_not_called()          # rien pendant la transaction
        self.assertEqual(len(callbacks), 1)     # programmé pour après la validation

    # Les emails partent après la transaction (lot M1) : on exécute les
    # callbacks on_commit comme le ferait la vraie base.
    def ipn(self, order):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post("/api/payplug/ipn/", {"id": order.payment_id}, format="json")

    def verify(self, order):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(f"/api/orders/{order.id}/verify-payment/")

    def test_ipn_marks_pending_order_paid_and_sends_receipt(self, send_email, award):
        order = self.make_order()
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(order)):
            res = self.ipn(order)
        self.assertEqual(res.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, "paid")
        send_email.assert_called_once()
        award.assert_called_once()

    def test_ipn_amount_mismatch_keeps_order_pending(self, send_email, _award):
        order = self.make_order()
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(order, amount=1)):
            self.ipn(order)
        order.refresh_from_db()
        self.assertEqual(order.status, "pending")
        send_email.assert_not_called()

    def test_ipn_unpaid_keeps_order_pending(self, send_email, _award):
        order = self.make_order()
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(order, is_paid=False)):
            self.ipn(order)
        order.refresh_from_db()
        self.assertEqual(order.status, "pending")
        send_email.assert_not_called()

    def test_ipn_replay_does_not_resend_receipt(self, send_email, _award):
        order = self.make_order()
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(order)):
            self.ipn(order)
            self.ipn(order)
        send_email.assert_called_once()

    def test_verify_payment_marks_pending_order_paid(self, send_email, _award):
        order = self.make_order()
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(order)):
            res = self.verify(order)
        self.assertEqual(res.data["status"], "paid")
        send_email.assert_called_once()

    # Lot C2 : une commande déjà prise en charge ne repasse jamais en « payée ».
    def test_verify_payment_does_not_revert_preparing_order(self, send_email, _award):
        order = self.make_order(status="preparing")
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(order)):
            res = self.verify(order)
        order.refresh_from_db()
        self.assertEqual(order.status, "preparing")
        self.assertEqual(res.data["status"], "preparing")
        send_email.assert_not_called()

    def test_ipn_does_not_revert_ready_order(self, send_email, _award):
        order = self.make_order(status="ready")
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(order)):
            self.ipn(order)
        order.refresh_from_db()
        self.assertEqual(order.status, "ready")
        send_email.assert_not_called()

    def test_cancelled_order_stays_cancelled_when_payment_arrives(self, send_email, _award):
        order = self.make_order(status="cancelled")
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(order)):
            self.ipn(order)
            self.verify(order)
        order.refresh_from_db()
        self.assertEqual(order.status, "cancelled")
        send_email.assert_not_called()


class StaffOrdersTests(OrderFixturesMixin, TestCase):

    def setUp(self):
        super().setUp()
        staff = User.objects.create_user("chef", password="motdepasse-solide-1", is_staff=True)
        self.staff_client = APIClient()
        self.staff_client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=staff).key}")

    def pending_print_ids(self):
        res = self.staff_client.get("/api/staff/orders/pending-print/")
        self.assertEqual(res.status_code, 200)
        return {o["id"] for o in res.data}

    def test_staff_endpoints_require_admin(self):
        self.assertEqual(self.client.get("/api/staff/orders/").status_code, 401)
        self.assertEqual(self.client.get("/api/staff/orders/pending-print/").status_code, 401)

    # Lot C1 : seules les commandes payées partent à l'impression.
    def test_pending_print_excludes_unpaid_orders(self):
        unpaid = self.make_order(status="pending")
        self.assertNotIn(unpaid.id, self.pending_print_ids())

    def test_pending_print_includes_paid_and_in_progress_orders(self):
        paid = self.make_order(status="paid")
        preparing = self.make_order(status="preparing")
        self.assertTrue({paid.id, preparing.id} <= self.pending_print_ids())

    # Lot H7 : écran staff limité aux dernières 24 h + commandes en cours.
    def age(self, order, **delta):
        Order.objects.filter(pk=order.pk).update(created_at=timezone.now() - timedelta(**delta))

    def list_ids(self, **params):
        res = self.staff_client.get("/api/staff/orders/", params)
        self.assertEqual(res.status_code, 200)
        return {o["id"] for o in res.data}

    def test_default_list_hides_old_finished_orders(self):
        old_done = self.make_order(status="collected")
        self.age(old_done, days=3)
        recent_done = self.make_order(status="collected")
        ids = self.list_ids()
        self.assertNotIn(old_done.id, ids)
        self.assertIn(recent_done.id, ids)

    def test_default_list_keeps_old_active_orders(self):
        old_paid = self.make_order(status="paid")
        self.age(old_paid, days=3)
        self.assertIn(old_paid.id, self.list_ids())

    def test_history_scope_returns_old_orders(self):
        old_done = self.make_order(status="collected")
        self.age(old_done, days=30)
        self.assertIn(old_done.id, self.list_ids(scope="all"))

    @patch("orders.views_staff.send_order_status_email")
    def test_ready_order_is_never_auto_collected(self, send_email):
        ready = self.make_order(status="ready", ready_at=timezone.now() - timedelta(hours=5))
        self.list_ids()
        ready.refresh_from_db()
        self.assertEqual(ready.status, "ready")
        send_email.assert_not_called()

    def test_pending_print_excludes_printed_and_finished_orders(self):
        printed = self.make_order(status="paid", printed=True)
        collected = self.make_order(status="collected")
        cancelled = self.make_order(status="cancelled")
        ids = self.pending_print_ids()
        self.assertFalse({printed.id, collected.id, cancelled.id} & ids)


class OpeningHoursTests(SimpleTestCase):
    """Horaires validés : lun-jeu 12h00-14h30 / 19h15-21h45, ven jusqu'à 22h00, week-end fermé."""

    # Jeudi 19/11/2026 à 10h00, heure de Paris
    NOW = paris(2026, 11, 19, 10, 0)

    def ok(self, value, now=None):
        return parse_pickup(value, now=now or self.NOW)

    def refused(self, value, now=None):
        with self.assertRaises(PickupError):
            parse_pickup(value, now=now or self.NOW)

    def test_lunch_first_and_last_slots(self):
        self.assertEqual(self.ok("2026-11-19 12:00").hour, 12)
        self.ok("2026-11-19 14:30")
        self.refused("2026-11-19 14:45")
        self.refused("2026-11-19 11:45")

    def test_evening_monday_to_thursday(self):
        self.ok("2026-11-19 19:15")
        self.ok("2026-11-19 21:45")
        self.refused("2026-11-19 19:00")
        self.refused("2026-11-19 22:00")

    def test_friday_evening_until_22h(self):
        self.ok("2026-11-20 22:00")
        self.refused("2026-11-20 22:15")

    def test_monday_is_open(self):
        self.ok("2026-11-23 12:00")

    def test_weekend_is_closed(self):
        self.refused("2026-11-21 12:00")
        self.refused("2026-11-22 19:15")

    def test_slots_follow_15_minute_grid(self):
        self.ok("2026-11-19 19:30")
        self.refused("2026-11-19 19:20")

    def test_preparation_delay_is_enforced(self):
        now = paris(2026, 11, 19, 12, 5)
        self.refused("2026-11-19 12:15", now=now)
        self.ok("2026-11-19 12:30", now=now)

    def test_past_slot_is_refused(self):
        self.refused("2026-11-18 12:00")

    def test_too_far_ahead_is_refused(self):
        self.refused("2026-12-10 12:00")

    def test_legacy_time_only_means_today(self):
        self.assertEqual(self.ok("12:30").date(), self.NOW.date())

    def test_garbage_is_refused(self):
        self.refused("demain midi")
        self.refused("")

    def test_label_uses_paris_time(self):
        order = SimpleNamespace(pickup_at=self.ok("2026-11-20 19:15"), pickup_time="19:15")
        self.assertEqual(pickup_label(order), "ven. 20/11 à 19h15")

    def test_label_falls_back_for_old_orders(self):
        self.assertEqual(pickup_label(SimpleNamespace(pickup_at=None, pickup_time="18:30")), "18h30")

    def test_public_schedule_uses_javascript_day_numbers(self):
        days = public_schedule()["days"]
        self.assertEqual(days["0"], [])                       # dimanche
        self.assertEqual(days["6"], [])                       # samedi
        self.assertEqual(days["1"], [["12:00", "14:30"], ["19:15", "21:45"]])  # lundi
        self.assertEqual(days["5"][1], ["19:15", "22:00"])    # vendredi


@override_settings(PAYPLUG_SECRET_KEY="sk_test_dummy")
class OrderAccessTests(OrderFixturesMixin, TestCase):
    """Lot C5 : le contenu d'une commande n'est lisible qu'avec son jeton."""

    def setUp(self):
        super().setUp()
        self.order = self.make_order(notes="Allergie aux arachides")

    def test_token_gives_full_order(self):
        res = self.client.get(f"/api/orders/t/{self.order.public_token}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["id"], self.order.id)
        self.assertEqual(len(res.data["items"]), 1)
        self.assertIn("payment_url", res.data)

    def test_token_response_hides_payment_id_and_notes(self):
        res = self.client.get(f"/api/orders/t/{self.order.public_token}/")
        self.assertNotIn("payment_id", res.data)
        self.assertNotIn("notes", res.data)

    def test_unknown_token_is_404(self):
        res = self.client.get("/api/orders/t/00000000-0000-0000-0000-000000000000/")
        self.assertEqual(res.status_code, 404)

    def test_sequential_id_only_gives_status(self):
        res = self.client.get(f"/api/orders/{self.order.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(res.data), {"id", "status"})

    def test_legacy_verify_payment_only_gives_status(self):
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(self.order, is_paid=False)):
            res = self.client.post(f"/api/orders/{self.order.id}/verify-payment/")
        self.assertEqual(set(res.data), {"id", "status"})

    @patch("orders.views.award_point_for_order")
    @patch("orders.views._send_receipt_email")
    def test_verify_payment_by_token_marks_paid(self, send_email, _award):
        with patch("orders.views.payplug.Payment.retrieve", return_value=fake_payment(self.order)), \
                self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(f"/api/orders/t/{self.order.public_token}/verify-payment/")
        self.assertEqual(res.data["status"], "paid")
        self.assertEqual(len(res.data["items"]), 1)
        send_email.assert_called_once()

    def test_each_order_gets_its_own_token(self):
        other = self.make_order()
        self.assertNotEqual(self.order.public_token, other.public_token)


class PublicTokenMigrationTests(TransactionTestCase):
    """La migration 0005 donne un jeton distinct à chaque commande existante."""

    migrate_from = [("orders", "0004_order_pickup_at")]
    migrate_to = [("orders", "0005_order_public_token")]

    def test_existing_orders_get_distinct_tokens(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_from)
        old_apps = executor.loader.project_state(self.migrate_from).apps
        OldOrder = old_apps.get_model("orders", "Order")
        ids = [
            OldOrder.objects.create(full_name=f"Client {i}", email="c@example.com", phone="06",
                                    pickup_time="12:30", total_cents=1000).id
            for i in range(3)
        ]

        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(self.migrate_to)
        new_apps = executor.loader.project_state(self.migrate_to).apps
        NewOrder = new_apps.get_model("orders", "Order")
        tokens = list(NewOrder.objects.filter(id__in=ids).values_list("public_token", flat=True))
        self.assertEqual(len(tokens), 3)
        self.assertNotIn(None, tokens)
        self.assertEqual(len(set(tokens)), 3)
        self.assertEqual(NewOrder.objects.filter(id__in=ids).count(), 3)

        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(executor.loader.graph.leaf_nodes())


@override_settings(PAYPLUG_SECRET_KEY="sk_test_dummy")
class ThrottleTests(OrderFixturesMixin, TestCase):
    """Lot H2 : limites par adresse IP."""

    def test_staff_login_is_limited_to_10_per_minute(self):
        codes = [self.client.post("/api/staff/login/", {"username": "x", "password": "y"}, format="json").status_code
                 for _ in range(11)]
        self.assertEqual(codes[:10], [401] * 10)
        self.assertEqual(codes[10], 429)

    def test_customer_login_is_limited(self):
        codes = [self.client.post("/api/auth/login/", {"email": "a@b.fr", "password": "y"}, format="json").status_code
                 for _ in range(11)]
        self.assertEqual(codes[-1], 429)

    def test_limit_is_per_ip(self):
        for _ in range(10):
            self.client.post("/api/staff/login/", {"username": "x", "password": "y"}, format="json",
                             REMOTE_ADDR="10.0.0.1")
        other = self.client.post("/api/staff/login/", {"username": "x", "password": "y"}, format="json",
                                 REMOTE_ADDR="10.0.0.2")
        self.assertEqual(other.status_code, 401)

    def test_spoofed_forwarded_for_does_not_bypass_limit(self):
        codes = [
            self.client.post("/api/staff/login/", {"username": "x", "password": "y"}, format="json",
                             HTTP_X_FORWARDED_FOR=f"1.2.3.{i}, 203.0.113.9").status_code
            for i in range(11)
        ]
        self.assertEqual(codes[-1], 429)

    @patch("orders.views.payplug.Payment.create", return_value=fake_payment_created())
    def test_checkout_is_limited_to_20_per_minute(self, _create):
        codes = [self.client.post("/api/checkout/", self.checkout_payload(), format="json").status_code
                 for _ in range(21)]
        self.assertEqual(codes[:20], [201] * 20)
        self.assertEqual(codes[20], 429)


class StaffStatusTransitionTests(OrderFixturesMixin, TestCase):
    """Lot M2 : transitions de statut encadrées, plus de suppression."""

    def setUp(self):
        super().setUp()
        staff = User.objects.create_user("chef2", password="motdepasse-solide-1", is_staff=True)
        self.staff_client = APIClient()
        self.staff_client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=staff).key}")

    def set_status(self, order, new_status):
        with self.captureOnCommitCallbacks(execute=True):
            return self.staff_client.patch(f"/api/staff/orders/{order.id}/status/", {"status": new_status},
                                           format="json")

    @patch("orders.views_staff.send_order_status_email")
    def test_normal_flow_is_allowed(self, send_email):
        order = self.make_order(status="paid")
        for step in ["preparing", "ready", "collected"]:
            res = self.set_status(order, step)
            self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(send_email.call_count, 3)

    @patch("orders.views_staff.send_order_status_email")
    def test_pending_cannot_be_marked_paid_or_prepared_by_staff(self, send_email):
        order = self.make_order(status="pending")
        self.assertEqual(self.set_status(order, "paid").status_code, 400)
        self.assertEqual(self.set_status(order, "preparing").status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, "pending")
        send_email.assert_not_called()

    @patch("orders.views_staff.send_order_status_email")
    def test_cancelled_is_final(self, _send_email):
        order = self.make_order(status="cancelled")
        self.assertEqual(self.set_status(order, "paid").status_code, 400)
        self.assertEqual(self.set_status(order, "preparing").status_code, 400)

    @patch("orders.views_staff.send_order_status_email")
    def test_one_step_back_is_allowed(self, _send_email):
        order = self.make_order(status="collected")
        self.assertEqual(self.set_status(order, "ready").status_code, 200)

    @patch("orders.views_staff.send_order_status_email")
    def test_cancelling_a_paid_order_flags_refund(self, _send_email):
        paid = self.make_order(status="preparing")
        self.assertTrue(self.set_status(paid, "cancelled").data["refund_needed"])
        unpaid = self.make_order(status="pending")
        self.assertFalse(self.set_status(unpaid, "cancelled").data["refund_needed"])

    @patch("orders.views_staff.send_order_status_email")
    def test_same_status_sends_no_email(self, send_email):
        order = self.make_order(status="paid")
        self.assertEqual(self.set_status(order, "paid").status_code, 200)
        send_email.assert_not_called()

    def test_delete_no_longer_erases_orders(self):
        order = self.make_order(status="paid")
        res = self.staff_client.delete(f"/api/staff/orders/{order.id}/delete/")
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Order.objects.filter(id=order.id).exists())
