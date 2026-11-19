"""Fichiers statiques de l'admin Django servis en production (WhiteNoise)."""
from django.test import TestCase, override_settings


@override_settings(DEBUG=False)
class AdminStaticFilesTests(TestCase):

    def test_admin_stylesheet_is_served_without_debug(self):
        res = self.client.get("/static/admin/css/base.css")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/css", res["Content-Type"])

    def test_admin_login_page_links_its_stylesheet(self):
        res = self.client.get("/admin/login/")
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "/static/admin/css/base.css")


from datetime import timedelta

from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from customers.models import Customer


class ExpiringTokenTests(TestCase):
    """Lot A8 : jetons qui expirent après inactivité, vraie déconnexion."""

    def setUp(self):
        cache.clear()
        self.staff = User.objects.create_user("chef", password="motdepasse-solide-1", is_staff=True)
        self.client_user = User.objects.create_user("c@example.com", email="c@example.com", password="motdepasse-solide-1")
        Customer.objects.create(user=self.client_user)

    def age(self, token, **delta):
        Token.objects.filter(pk=token.pk).update(created=timezone.now() - timedelta(**delta))

    def as_(self, token):
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        return c

    def test_staff_token_expires_after_7_idle_days(self):
        token = Token.objects.create(user=self.staff)
        self.age(token, days=6)
        self.assertEqual(self.as_(token).get("/api/staff/me/").status_code, 200)
        self.age(token, days=8)
        res = self.as_(token).get("/api/staff/me/")
        self.assertEqual(res.status_code, 401)
        self.assertIn("expirée", str(res.data["detail"]))
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())

    def test_customer_token_lasts_30_idle_days(self):
        token = Token.objects.create(user=self.client_user)
        self.age(token, days=20)
        self.assertEqual(self.as_(token).get("/api/auth/me/").status_code, 200)
        self.age(token, days=31)
        self.assertEqual(self.as_(token).get("/api/auth/me/").status_code, 401)

    def test_use_extends_the_session(self):
        token = Token.objects.create(user=self.staff)
        self.age(token, days=6)
        self.as_(token).get("/api/staff/me/")
        token.refresh_from_db()
        self.assertGreater(token.created, timezone.now() - timedelta(minutes=1))

    def test_no_write_on_every_request(self):
        token = Token.objects.create(user=self.staff)
        self.age(token, minutes=10)
        before = Token.objects.get(pk=token.pk).created
        self.as_(token).get("/api/staff/me/")
        self.assertEqual(Token.objects.get(pk=token.pk).created, before)

    def test_login_with_an_old_token_gives_a_working_session(self):
        token = Token.objects.create(user=self.staff)
        self.age(token, days=60)
        res = APIClient().post("/api/staff/login/", {"username": "chef", "password": "motdepasse-solide-1"}, format="json")
        self.assertEqual(res.status_code, 200)
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Token {res.data['token']}")
        self.assertEqual(c.get("/api/staff/me/").status_code, 200)

    def test_staff_logout_revokes_token(self):
        token = Token.objects.create(user=self.staff)
        self.assertEqual(self.as_(token).post("/api/staff/logout/").status_code, 204)
        self.assertEqual(self.as_(token).get("/api/staff/me/").status_code, 401)

    def test_customer_logout_revokes_token(self):
        token = Token.objects.create(user=self.client_user)
        self.assertEqual(self.as_(token).post("/api/auth/logout/").status_code, 204)
        self.assertEqual(self.as_(token).get("/api/auth/me/").status_code, 401)

    def test_login_error_messages_are_readable(self):
        res = APIClient().post("/api/staff/login/", {"username": "chef", "password": "mauvais"}, format="json")
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.data["detail"], "Identifiant ou mot de passe incorrect.")
