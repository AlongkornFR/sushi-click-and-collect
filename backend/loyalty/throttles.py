from rest_framework.throttling import UserRateThrottle


class LoyaltyQRThrottle(UserRateThrottle):
    scope = "loyalty_qr"


class LoyaltyScanThrottle(UserRateThrottle):
    scope = "loyalty_scan"


class LoyaltyMutateThrottle(UserRateThrottle):
    scope = "loyalty_mutate"
