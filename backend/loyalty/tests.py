"""Tests fidélité : retrait du point quand une commande payée est annulée (lot M11)."""
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from customers.models import Customer
from orders.models import Order
from .models import LoyaltyAccount, LoyaltyTransaction
from .services import award_point_for_order, redeem_reward, revoke_point_for_order


@patch("loyalty.services._notify_after_award")
@patch("loyalty.services._notify_reward_redeemed")
@patch("orders.views_staff.send_order_status_email")
class RevokePointTests(TestCase):

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user("client@example.com", email="client@example.com", password="x")
        Customer.objects.create(user=self.user)
        staff = User.objects.create_user("chef", password="motdepasse-solide-1", is_staff=True)
        self.staff_client = APIClient()
        self.staff_client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=staff).key}")
        self.staff = staff

    def paid_order(self, total=2000):
        order = Order.objects.create(user=self.user, full_name="C", email="client@example.com", phone="06",
                                     pickup_time="12:30", status="paid", total_cents=total, payment_id="p")
        award_point_for_order(order)
        return order

    def points(self):
        return LoyaltyAccount.objects.get(customer=self.user.customer).points

    def cancel(self, order):
        with self.captureOnCommitCallbacks(execute=True):
            return self.staff_client.patch(f"/api/staff/orders/{order.id}/status/", {"status": "cancelled"},
                                           format="json")

    def test_cancelling_paid_order_removes_its_point(self, *_mocks):
        order = self.paid_order()
        self.assertEqual(self.points(), 1)
        self.assertEqual(self.cancel(order).status_code, 200)
        self.assertEqual(self.points(), 0)
        reversal = LoyaltyTransaction.objects.get(delta=-1)
        self.assertEqual(reversal.reason, f"Commande #{order.id} annulée")
        self.assertEqual(reversal.admin_user, self.staff)

    def test_point_is_removed_only_once(self, *_mocks):
        order = self.paid_order()
        self.paid_order()                     # un autre point, d'une autre commande
        self.cancel(order)
        revoke_point_for_order(order)         # rejoué : sans effet
        self.assertEqual(self.points(), 1)

    def test_order_below_threshold_changes_nothing(self, *_mocks):
        order = self.paid_order(total=1000)   # < 16 € : pas de point gagné
        self.paid_order()
        self.cancel(order)
        self.assertEqual(self.points(), 1)

    def test_reward_already_redeemed_is_not_reversed_below_zero(self, *_mocks):
        orders = [self.paid_order() for _ in range(10)]
        redeem_reward(LoyaltyAccount.objects.get(customer=self.user.customer), admin_user=self.staff)
        self.cancel(orders[0])
        self.assertEqual(self.points(), 0)
        self.assertFalse(LoyaltyTransaction.objects.filter(source="adjustment").exists())
