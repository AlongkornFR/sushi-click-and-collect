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
