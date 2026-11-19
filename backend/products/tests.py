"""Carte publique (lot M7) : catégories et sous-catégories désactivées masquées."""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from .models import Category, Product, SubCategory


class PublicMenuTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.cat = Category.objects.create(name="Sushis", slug="sushis")
        self.sub = SubCategory.objects.create(name="Makis", slug="makis", category=self.cat)
        self.p = Product.objects.create(name="Maki", price=Decimal("5"), category=self.cat, subcategory=self.sub)
        self.loose = Product.objects.create(name="Soupe", price=Decimal("3"), category=self.cat, subcategory=None)

    def names(self):
        return {p["name"] for p in self.client.get("/api/products/").data}

    def test_product_without_subcategory_is_listed(self):
        self.assertEqual(self.names(), {"Maki", "Soupe"})

    def test_inactive_subcategory_hides_its_products(self):
        self.sub.is_active = False
        self.sub.save()
        self.assertEqual(self.names(), {"Soupe"})
        self.assertEqual(self.client.get(f"/api/products/{self.p.slug}/").status_code, 404)

    def test_inactive_category_hides_everything_in_it(self):
        self.cat.is_active = False
        self.cat.save()
        self.assertEqual(self.names(), set())

    def test_unavailable_product_is_hidden(self):
        self.p.is_available = False
        self.p.save()
        self.assertEqual(self.names(), {"Soupe"})
