# orders/tests.py
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from products.models import Category, Product
from .models import Order, OrderItem


def make_product(name="California saumon", price="9.90", stock=10, available=True):
    cat, _ = Category.objects.get_or_create(name="Sushis", slug="sushis")
    return Product.objects.create(
        name=name, price=Decimal(price), category=cat,
        stock=stock, is_available=available,
    )


def fake_payment(payment_id="pay_123", url="https://payplug.test/pay"):
    p = MagicMock()
    p.id = payment_id
    p.hosted_payment.payment_url = url
    return p


def valid_payload(product, qty=2, **overrides):
    payload = {
        "customer": {"full_name": "Jean Dupont", "email": "jean@test.fr", "phone": "0600000000"},
        "pickup_time": "18:30",
        "notes": "",
        "items": [{"product_id": product.id, "quantity": qty}],
    }
    payload.update(overrides)
    return payload


@override_settings(PAYPLUG_SECRET_KEY="sk_test", DEBUG=True)
class CheckoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = make_product()

    @patch("orders.views.payplug")
    def test_checkout_creates_order_with_server_prices(self, mock_payplug):
        mock_payplug.Payment.create.return_value = fake_payment()

        # le client tente de tricher : le prix envoyé est ignoré
        payload = valid_payload(self.product)
        payload["items"][0]["unit_price_cents"] = 1

        res = self.client.post("/api/checkout/", payload, format="json")
        self.assertEqual(res.status_code, 201)

        order = Order.objects.get(id=res.data["order_id"])
        self.assertEqual(order.total_cents, 990 * 2)  # prix BDD, pas client
        self.assertEqual(order.status, "pending")
        self.assertEqual(res.data["order_token"], str(order.public_token))
        self.assertEqual(res.data["payment_url"], "https://payplug.test/pay")

    @patch("orders.views.payplug")
    def test_checkout_does_not_decrement_stock(self, mock_payplug):
        mock_payplug.Payment.create.return_value = fake_payment()
        res = self.client.post("/api/checkout/", valid_payload(self.product, qty=3), format="json")
        self.assertEqual(res.status_code, 201)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)  # inchangé avant paiement

    def test_checkout_rejects_insufficient_stock(self):
        res = self.client.post("/api/checkout/", valid_payload(self.product, qty=11), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Stock insuffisant", res.data["detail"])
        self.assertEqual(Order.objects.count(), 0)

    def test_checkout_rejects_unavailable_product(self):
        p = make_product(name="Maki thon", available=False)
        res = self.client.post("/api/checkout/", valid_payload(p), format="json")
        self.assertEqual(res.status_code, 400)

    def test_checkout_rejects_empty_cart(self):
        res = self.client.post("/api/checkout/", valid_payload(self.product, items=[]), format="json")
        self.assertEqual(res.status_code, 400)

    def test_checkout_rejects_missing_customer_fields(self):
        payload = valid_payload(self.product)
        payload["customer"]["email"] = ""
        res = self.client.post("/api/checkout/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    def test_checkout_rejects_bad_pickup_time(self):
        for bad in ["25:00", "18h30", "abc", "9:5"]:
            res = self.client.post(
                "/api/checkout/", valid_payload(self.product, pickup_time=bad), format="json"
            )
            self.assertEqual(res.status_code, 400, f"pickup_time '{bad}' aurait dû être refusé")

    def test_checkout_rejects_invalid_quantity(self):
        payload = valid_payload(self.product)
        payload["items"][0]["quantity"] = 0
        res = self.client.post("/api/checkout/", payload, format="json")
        self.assertEqual(res.status_code, 400)


def make_order(product, qty=2, status="pending", payment_id="pay_123"):
    order = Order.objects.create(
        full_name="Jean Dupont", email="jean@test.fr", phone="0600000000",
        pickup_time="18:30", status=status,
        total_cents=int(product.price * 100) * qty,
        payment_id=payment_id,
    )
    OrderItem.objects.create(
        order=order, product_id=product.id, product_name=product.name,
        unit_price_cents=int(product.price * 100), quantity=qty,
    )
    return order


def fake_retrieved_payment(order, is_paid=True, amount=None, currency="EUR", payment_id="pay_123"):
    p = MagicMock()
    p.id = payment_id
    p.is_paid = is_paid
    p.amount = amount if amount is not None else order.total_cents
    p.currency = currency
    p.metadata = {"order_id": str(order.id)}
    return p


@override_settings(PAYPLUG_SECRET_KEY="sk_test", DEBUG=True)
class IpnTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = make_product()
        self.order = make_order(self.product, qty=2)

    def _post_ipn(self, payment):
        with patch("orders.views_ipn.payplug") as mock_payplug, \
             patch("orders.views_ipn.send_receipt_email") as mock_email:
            mock_payplug.Payment.retrieve.return_value = payment
            res = self.client.post("/api/payplug/ipn/", {"id": payment.id}, format="json")
        return res, mock_email

    def test_ipn_marks_paid_and_decrements_stock(self):
        res, mock_email = self._post_ipn(fake_retrieved_payment(self.order))
        self.assertEqual(res.status_code, 200)
        self.order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, "paid")
        self.assertEqual(self.product.stock, 8)  # 10 - 2, décrémenté au paiement

    def test_ipn_is_idempotent(self):
        self._post_ipn(fake_retrieved_payment(self.order))
        res, _ = self._post_ipn(fake_retrieved_payment(self.order))
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get("already_paid"))
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)  # pas de double décrément

    def test_ipn_rejects_amount_mismatch(self):
        res, _ = self._post_ipn(fake_retrieved_payment(self.order, amount=1))
        self.assertEqual(res.status_code, 200)
        self.order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, "pending")
        self.assertEqual(self.product.stock, 10)

    def test_ipn_rejects_payment_id_mismatch(self):
        payment = fake_retrieved_payment(self.order, payment_id="pay_autre")
        res, _ = self._post_ipn(payment)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "pending")

    def test_ipn_not_paid_keeps_pending(self):
        res, _ = self._post_ipn(fake_retrieved_payment(self.order, is_paid=False))
        self.order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, "pending")
        self.assertEqual(self.product.stock, 10)

    def test_ipn_retrieve_failure_returns_400_for_retry(self):
        with patch("orders.views_ipn.payplug") as mock_payplug:
            mock_payplug.Payment.retrieve.side_effect = Exception("network")
            res = self.client.post("/api/payplug/ipn/", {"id": "pay_123"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_ipn_stock_never_negative(self):
        self.product.stock = 1
        self.product.save(update_fields=["stock"])
        self._post_ipn(fake_retrieved_payment(self.order))  # qty=2 > stock=1
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)


@override_settings(DEBUG=True)
class OrderDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = make_product()
        self.order = make_order(self.product)

    def test_order_accessible_by_token(self):
        res = self.client.get(f"/api/orders/{self.order.public_token}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["id"], self.order.id)

    def test_order_not_accessible_by_sequential_id(self):
        res = self.client.get(f"/api/orders/{self.order.id}/")
        self.assertEqual(res.status_code, 404)

    def test_order_detail_does_not_leak_payment_id(self):
        res = self.client.get(f"/api/orders/{self.order.public_token}/")
        self.assertNotIn("payment_id", res.data)


@override_settings(DEBUG=True)
class StaffAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_staff_login_rejects_non_staff(self):
        from django.contrib.auth.models import User
        User.objects.create_user("client", password="pass12345", is_staff=False)
        res = self.client.post(
            "/api/staff/login/", {"username": "client", "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, 403)

    def test_staff_login_accepts_staff(self):
        from django.contrib.auth.models import User
        User.objects.create_user("chef", password="pass12345", is_staff=True)
        res = self.client.post(
            "/api/staff/login/", {"username": "chef", "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("token", res.data)

    def test_staff_orders_requires_admin(self):
        res = self.client.get("/api/staff/orders/")
        self.assertEqual(res.status_code, 401)
