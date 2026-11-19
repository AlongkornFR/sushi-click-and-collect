"""Tests du « mot de passe oublié » (lot H8). Les emails partent dans
mail.outbox (backend mémoire de Django pendant les tests)."""
import re
from urllib.parse import parse_qs, urlparse

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Customer

OLD_PASSWORD = "ancien-motdepasse-42"
NEW_PASSWORD = "nouveau-Sushi-2026"


@override_settings(FRONTEND_BASE_URL="https://site.test")
class PasswordResetTests(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            "marie@example.com", email="marie@example.com", password=OLD_PASSWORD, first_name="Marie",
        )
        Customer.objects.create(user=self.user)

    def request_reset(self, email="marie@example.com"):
        return self.client.post("/api/auth/password-reset/", {"email": email}, format="json")

    def link_params(self):
        url = re.search(r"https://site\.test/account/reset\?\S+", mail.outbox[-1].body).group(0)
        params = parse_qs(urlparse(url).query)
        return params["uid"][0], params["token"][0]

    def confirm(self, uid, token, password=NEW_PASSWORD):
        return self.client.post("/api/auth/password-reset/confirm/",
                                {"uid": uid, "token": token, "new_password": password}, format="json")

    def test_known_email_receives_a_link(self):
        res = self.request_reset()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["marie@example.com"])
        self.link_params()

    def test_unknown_email_gets_same_answer_and_no_mail(self):
        known = self.request_reset().data["detail"]
        mail.outbox.clear()
        res = self.request_reset("inconnu@example.com")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["detail"], known)
        self.assertEqual(len(mail.outbox), 0)

    def test_staff_account_without_customer_gets_no_mail(self):
        User.objects.create_user("chef@example.com", email="chef@example.com", password="x", is_staff=True)
        self.request_reset("chef@example.com")
        self.assertEqual(len(mail.outbox), 0)

    def test_valid_link_changes_password_and_logs_out_other_devices(self):
        Token.objects.create(user=self.user)
        self.request_reset()
        res = self.confirm(*self.link_params())
        self.assertEqual(res.status_code, 200, res.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assertFalse(Token.objects.filter(user=self.user).exists())
        login = self.client.post("/api/auth/login/", {"email": "marie@example.com", "password": NEW_PASSWORD},
                                 format="json")
        self.assertEqual(login.status_code, 200)

    def test_link_works_only_once(self):
        self.request_reset()
        uid, token = self.link_params()
        self.assertEqual(self.confirm(uid, token).status_code, 200)
        self.assertEqual(self.confirm(uid, token, password="encore-un-autre-2026").status_code, 400)

    def test_tampered_token_is_refused(self):
        self.request_reset()
        uid, _token = self.link_params()
        self.assertEqual(self.confirm(uid, "faux-jeton").status_code, 400)
        self.assertEqual(self.confirm("xxx", "faux-jeton").status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(OLD_PASSWORD))

    @override_settings(PASSWORD_RESET_TIMEOUT=-1)
    def test_expired_link_is_refused(self):
        self.request_reset()
        self.assertEqual(self.confirm(*self.link_params()).status_code, 400)

    def test_weak_password_is_refused(self):
        self.request_reset()
        res = self.confirm(*self.link_params(), password="12345678")
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(OLD_PASSWORD))

    def test_requests_are_rate_limited(self):
        codes = [self.request_reset().status_code for _ in range(6)]
        self.assertEqual(codes[-1], 429)


from django.db import connection
from django.test.utils import CaptureQueriesContext

from orders.models import Order, OrderItem


class StaffClientPageTests(TestCase):
    """Lot A6 : fiche client, désactivation, liste rapide."""

    def setUp(self):
        cache.clear()
        staff = User.objects.create_user("chef", password="motdepasse-solide-1", is_staff=True)
        self.staff_client = APIClient()
        self.staff_client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=staff).key}")
        self.user = User.objects.create_user("marie@example.com", email="marie@example.com",
                                             password=OLD_PASSWORD, first_name="Marie")
        self.customer = Customer.objects.create(user=self.user, phone="0612345678")

    def order(self, status="collected", total=2000):
        o = Order.objects.create(user=self.user, full_name="Marie", email="marie@example.com", phone="06",
                                 pickup_time="12:30", status=status, total_cents=total)
        OrderItem.objects.create(order=o, product_id=1, product_name="Maki saumon", unit_price_cents=650, quantity=2)
        return o

    def test_detail_shows_orders_total_and_no_card_yet(self):
        self.order(total=2000)
        self.order(status="cancelled", total=5000)
        data = self.staff_client.get(f"/api/staff/users/{self.customer.id}/").data
        self.assertEqual(len(data["orders"]), 2)
        self.assertEqual(data["orders"][0]["items"], ["2× Maki saumon"])
        self.assertEqual(data["total_spent_cents"], 2000)      # l'annulée ne compte pas
        self.assertIsNone(data["loyalty"])
        from loyalty.models import LoyaltyAccount
        self.assertFalse(LoyaltyAccount.objects.exists())        # consulter ne crée pas de carte

    def test_detail_shows_loyalty_card(self):
        from loyalty.models import LoyaltyAccount
        LoyaltyAccount.objects.create(customer=self.customer, points=4)
        data = self.staff_client.get(f"/api/staff/users/{self.customer.id}/").data
        self.assertEqual(data["loyalty"]["points"], 4)
        self.assertEqual(data["loyalty"]["max_points"], 10)

    def test_deactivate_blocks_login_and_logs_out(self):
        Token.objects.create(user=self.user)
        res = self.staff_client.post(f"/api/staff/users/{self.customer.id}/active/", {"is_active": False}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["is_active"])
        self.assertFalse(Token.objects.filter(user=self.user).exists())
        login = APIClient().post("/api/auth/login/", {"email": "marie@example.com", "password": OLD_PASSWORD}, format="json")
        self.assertNotEqual(login.status_code, 200)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())   # rien n'est effacé

    def test_reactivate(self):
        self.user.is_active = False
        self.user.save()
        self.staff_client.post(f"/api/staff/users/{self.customer.id}/active/", {"is_active": True}, format="json")
        login = APIClient().post("/api/auth/login/", {"email": "marie@example.com", "password": OLD_PASSWORD}, format="json")
        self.assertEqual(login.status_code, 200)

    def test_is_active_must_be_boolean(self):
        res = self.staff_client.post(f"/api/staff/users/{self.customer.id}/active/", {"is_active": "non"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_staff_account_cannot_be_deactivated_or_deleted(self):
        boss = User.objects.create_user("boss@example.com", email="boss@example.com", password="x", is_staff=True)
        boss_customer = Customer.objects.create(user=boss)
        self.assertEqual(self.staff_client.post(f"/api/staff/users/{boss_customer.id}/active/",
                                                {"is_active": False}, format="json").status_code, 400)
        self.assertEqual(self.staff_client.delete(f"/api/staff/users/{boss_customer.id}/delete/").status_code, 400)

    def test_list_counts_orders_in_constant_queries(self):
        for i in range(5):
            u = User.objects.create_user(f"c{i}@example.com", email=f"c{i}@example.com", password="x")
            Customer.objects.create(user=u)
        self.order()
        with CaptureQueriesContext(connection) as ctx:
            data = self.staff_client.get("/api/staff/users/").data
        self.assertEqual(next(c for c in data if c["id"] == self.customer.id)["order_count"], 1)
        self.assertLess(len(ctx.captured_queries), 6)

    def test_routes_require_staff(self):
        self.assertEqual(APIClient().get(f"/api/staff/users/{self.customer.id}/").status_code, 401)
