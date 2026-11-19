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
