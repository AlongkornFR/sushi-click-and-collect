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


from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token


class StaffCatalogBase(TestCase):
    """Données communes : un staff connecté, deux catégories, un produit."""

    def setUp(self):
        staff = User.objects.create_user("chef", password="motdepasse-solide-1", is_staff=True)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=staff).key}")
        self.cat = Category.objects.create(name="Sushis", slug="sushis")
        self.other_cat = Category.objects.create(name="Plats", slug="plats")
        self.sub = SubCategory.objects.create(name="Makis", slug="makis", category=self.cat)
        self.p = Product.objects.create(name="Maki", price=Decimal("5"), category=self.cat, subcategory=self.sub)

    def public_names(self):
        return {p["name"] for p in APIClient().get("/api/products/").data}


class StaffCatalogTests(StaffCatalogBase):
    """Lot A4 : gestion de la carte depuis l'espace staff."""

    def test_rename_category(self):
        res = self.client.patch(f"/api/staff/categories/{self.cat.id}/", {"name": "  Sushis maison "}, format="json")
        self.assertEqual(res.status_code, 200)
        self.cat.refresh_from_db()
        self.assertEqual(self.cat.name, "Sushis maison")
        self.assertEqual(self.cat.slug, "sushis")          # l'adresse ne change pas

    def test_empty_name_is_refused(self):
        res = self.client.patch(f"/api/staff/categories/{self.cat.id}/", {"name": "  "}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_hide_and_show_category(self):
        self.client.patch(f"/api/staff/categories/{self.cat.id}/", {"is_active": False}, format="json")
        self.assertEqual(self.public_names(), set())
        self.client.patch(f"/api/staff/categories/{self.cat.id}/", {"is_active": True}, format="json")
        self.assertEqual(self.public_names(), {"Maki"})

    def test_hide_subcategory(self):
        res = self.client.patch(f"/api/staff/subcategories/{self.sub.id}/", {"is_active": False}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["is_active"])
        self.assertEqual(self.public_names(), set())

    def test_only_name_and_visibility_can_be_changed(self):
        self.client.patch(f"/api/staff/subcategories/{self.sub.id}/",
                          {"slug": "pirate", "category_id": self.other_cat.id}, format="json")
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.slug, "makis")
        self.assertEqual(self.sub.category, self.cat)

    def test_product_can_be_created_without_subcategory(self):
        res = self.client.post("/api/staff/products/create/",
                               {"name": "Soupe miso", "price": "3.50", "category_id": self.cat.id}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertIsNone(Product.objects.get(name="Soupe miso").subcategory)

    def test_quick_availability_toggle(self):
        res = self.client.patch(f"/api/staff/products/{self.p.id}/", {"is_available": False}, format="json")
        self.assertEqual(res.status_code, 200)
        self.p.refresh_from_db()
        self.assertFalse(self.p.is_available)
        self.assertEqual(self.p.subcategory, self.sub)    # le reste n'a pas bougé

    def test_list_products_without_subcategory(self):
        loose = Product.objects.create(name="Soupe", price=Decimal("3"), category=self.cat)
        res = self.client.get(f"/api/staff/products/?category_id={self.cat.id}&subcategory_id=none")
        self.assertEqual([p["id"] for p in res.data], [loose.id])

    def test_staff_routes_require_staff(self):
        res = APIClient().patch(f"/api/staff/categories/{self.cat.id}/", {"is_active": False}, format="json")
        self.assertEqual(res.status_code, 401)


class NewItemsGoLastTests(StaffCatalogBase):
    """Lot A4 : un élément créé arrive à la fin de son groupe."""

    def test_new_category_goes_last(self):
        Category.objects.filter(pk=self.cat.pk).update(position=0)
        Category.objects.filter(pk=self.other_cat.pk).update(position=1)
        self.client.post("/api/staff/categories/create/", {"name": "Desserts", "slug": "desserts"}, format="json")
        names = [c["name"] for c in self.client.get("/api/staff/categories/").data]
        self.assertEqual(names[-1], "Desserts")

    def test_new_subcategory_goes_last_in_its_category(self):
        self.client.post("/api/staff/subcategories/create/",
                         {"name": "California", "slug": "california", "category_id": self.cat.id}, format="json")
        subs = SubCategory.objects.filter(category=self.cat).order_by("position", "name")
        self.assertEqual(subs.last().name, "California")

    def test_new_product_goes_last_in_its_group(self):
        self.client.post("/api/staff/products/create/", {"name": "Aaa maki", "price": "4", "category_id": self.cat.id,
                         "subcategory_id": self.sub.id}, format="json")
        group = Product.objects.filter(subcategory=self.sub).order_by("position", "name")
        self.assertEqual(group.last().name, "Aaa maki")


class VatRateTests(StaffCatalogBase):
    """Lot A7 : taux de TVA d'un produit (5,5 / 10 / 20 %)."""

    def test_existing_products_default_to_10(self):
        res = self.client.get("/api/staff/products/").data
        self.assertEqual(float(res[0]["vat_rate"]), 10.0)

    def test_set_each_allowed_rate(self):
        for rate in ("5.5", "10.0", "20.0"):
            res = self.client.patch(f"/api/staff/products/{self.p.id}/", {"vat_rate": rate}, format="json")
            self.assertEqual(res.status_code, 200, res.data)
            self.p.refresh_from_db()
            self.assertEqual(self.p.vat_rate, Decimal(rate))

    def test_other_rates_are_refused(self):
        for rate in ("5", "15", "7.0"):
            res = self.client.patch(f"/api/staff/products/{self.p.id}/", {"vat_rate": rate}, format="json")
            self.assertEqual(res.status_code, 400)


import hashlib
from django.test import override_settings


class CloudinarySignatureTests(StaffCatalogBase):
    """Envoi de photos signé : seul le staff obtient une signature."""

    @override_settings(CLOUDINARY_CLOUD_NAME="demo", CLOUDINARY_API_KEY="123456", CLOUDINARY_API_SECRET="abcd",
                       CLOUDINARY_FOLDER="su-rice/produits")
    def test_signature_matches_cloudinary_rules(self):
        res = self.client.post("/api/staff/cloudinary-signature/")
        self.assertEqual(res.status_code, 200)
        expected = hashlib.sha1(f"folder=su-rice/produits&timestamp={res.data['timestamp']}abcd".encode()).hexdigest()
        self.assertEqual(res.data["signature"], expected)
        self.assertEqual((res.data["cloud_name"], res.data["api_key"], res.data["folder"]), ("demo", "123456", "su-rice/produits"))
        self.assertNotIn("abcd", str(res.data))          # le secret ne sort jamais

    @override_settings(CLOUDINARY_API_KEY="", CLOUDINARY_API_SECRET="")
    def test_not_configured_is_503_with_readable_message(self):
        res = self.client.post("/api/staff/cloudinary-signature/")
        self.assertEqual(res.status_code, 503)
        self.assertIn("adresse d'une image", res.data["detail"])

    def test_requires_staff(self):
        self.assertEqual(APIClient().post("/api/staff/cloudinary-signature/").status_code, 401)

    def test_old_cloudflare_route_is_gone(self):
        self.assertEqual(self.client.post("/api/staff/cloudflare-upload-url/").status_code, 404)
