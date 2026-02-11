from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from .google import fetch_google_reviews

@api_view(["GET"])
@permission_classes([AllowAny])
def google_reviews(request):
    if not settings.GOOGLE_PLACES_API_KEY:
        return Response({"detail": "Missing GOOGLE_PLACES_API_KEY"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    place_id = request.query_params.get("place_id") or settings.GOOGLE_PLACE_ID
    if not place_id:
        return Response({"detail": "Missing place_id"}, status=status.HTTP_400_BAD_REQUEST)

    limit = request.query_params.get("limit", "6")

    try:
        reviews = fetch_google_reviews(place_id=place_id, limit=int(limit))
        return Response(reviews, status=200)
    except Exception as e:
        # en dev c’est OK d’exposer, en prod tu peux logguer et renvoyer générique
        return Response({"detail": f"Google fetch failed: {str(e)}"}, status=502)
