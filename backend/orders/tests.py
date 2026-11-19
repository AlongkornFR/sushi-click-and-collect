"""Tests du parcours de commande : checkout, paiement Payplug, écran staff.

Payplug et les emails sont simulés : aucun appel réseau n'est fait.
"""
from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
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
        detail = self.client.get(f"/api/orders/{res.data['order_id']}/")
        self.assertIn("à 12h30", detail.data["pickup_label"])


@override_settings(PAYPLUG_SECRET_KEY="sk_test_dummy")
@patch("orders.views.award_point_for_order")
@patch("orders.views._send_receipt_email")
class PaymentConfirmationTests(OrderFixturesMixin, TestCase):

    def ipn(self, order):
        return self.client.post("/api/payplug/ipn/", {"id": order.payment_id}, format="json")

    def verify(self, order):
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
