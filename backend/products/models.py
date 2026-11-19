from decimal import Decimal

from django.db import models
from django.utils.text import slugify

# Lot A7 : taux de TVA (France) proposés pour un produit. Prix saisis TTC.
VAT_RATE_CHOICES = [
    (Decimal("5.5"), "5,5 %"),
    (Decimal("10.0"), "10 %"),
    (Decimal("20.0"), "20 %"),
]
DEFAULT_VAT_RATE = Decimal("10.0")


class Category(models.Model):
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0, db_index=True)

    def __str__(self):
        return self.name


class SubCategory(models.Model):
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="subcategories")
    is_active = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0, db_index=True)

    def __str__(self):
        return f"{self.category.name} - {self.name}"

class Product(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=6, decimal_places=2)  # TTC
    vat_rate = models.DecimalField(max_digits=4, decimal_places=1, choices=VAT_RATE_CHOICES, default=DEFAULT_VAT_RATE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    subcategory = models.ForeignKey(SubCategory,on_delete=models.SET_NULL,null=True,blank=True,related_name="products")
    image_main = models.URLField(blank=True)
    stock = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):

        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1

            while Product.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            self.slug = slug

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
