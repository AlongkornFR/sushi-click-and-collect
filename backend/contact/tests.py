"""Formulaire de contact (lot M4) : contenu échappé, erreurs génériques."""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

PAYLOAD = {
    "first_name": "<b>Jean</b>",
    "last_name": "Dupont",
    "email": "jean@example.com",
    "phone": "0600000000",
    "message": '<a href="https://phishing.example">Cliquez ici</a>',
}


@override_settings(RESEND_API_KEY="re_test", CONTACT_RECEIVER_EMAIL="contact@example.com")
class ContactTests(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    @patch("contact.views.http_requests.post")
    def test_html_from_visitor_is_escaped(self, post):
        post.return_value.raise_for_status.return_value = None
        res = self.client.post("/api/contact/", PAYLOAD, format="json")
        self.assertEqual(res.status_code, 200)
        html = post.call_args.kwargs["json"]["html"]
        self.assertNotIn('<a href="https://phishing.example">', html)
        self.assertIn("&lt;a href=", html)
        self.assertNotIn("<b>Jean</b>", html)

    @patch("contact.views.http_requests.post", side_effect=RuntimeError("clé API invalide xyz"))
    def test_provider_error_is_not_shown_to_visitor(self, _post):
        res = self.client.post("/api/contact/", PAYLOAD, format="json")
        self.assertEqual(res.status_code, 502)
        self.assertNotIn("xyz", res.data["detail"])
        self.assertIn("04 93 68 08 12", res.data["detail"])


class ContactStorageTests(TestCase):
    """Lot A8 : le message est enregistré même si l'email échoue."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    @override_settings(RESEND_API_KEY="re_test", CONTACT_RECEIVER_EMAIL="contact@example.com")
    @patch("contact.views.http_requests.post")
    def test_message_saved_and_marked_sent(self, post):
        post.return_value.raise_for_status.return_value = None
        self.client.post("/api/contact/", PAYLOAD, format="json")
        from contact.models import ContactMessage
        msg = ContactMessage.objects.get()
        self.assertTrue(msg.email_sent)
        self.assertEqual(msg.email, "jean@example.com")

    @override_settings(RESEND_API_KEY="re_test", CONTACT_RECEIVER_EMAIL="contact@example.com")
    @patch("contact.views.http_requests.post", side_effect=RuntimeError("panne"))
    def test_message_kept_when_email_fails(self, _post):
        res = self.client.post("/api/contact/", PAYLOAD, format="json")
        self.assertEqual(res.status_code, 502)
        from contact.models import ContactMessage
        msg = ContactMessage.objects.get()
        self.assertFalse(msg.email_sent)
        self.assertIn("Cliquez ici", msg.message)

    @override_settings(RESEND_API_KEY="", CONTACT_RECEIVER_EMAIL="")
    def test_message_kept_when_email_not_configured(self):
        self.client.post("/api/contact/", PAYLOAD, format="json")
        from contact.models import ContactMessage
        self.assertEqual(ContactMessage.objects.count(), 1)
