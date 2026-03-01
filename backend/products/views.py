from rest_framework.generics import ListAPIView, RetrieveAPIView
from .models import Product
from .serializers import ProductSerializer

class ProductListView(ListAPIView):
    queryset = Product.objects.filter(is_available=True)
    serializer_class = ProductSerializer


class ProductDetailView(RetrieveAPIView):
    queryset = Product.objects.filter(is_available=True)
    serializer_class = ProductSerializer
    lookup_field = "slug"

import requests
from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
import os

@api_view(['GET'])
@permission_classes([AllowAny]) # Public
def google_reviews(request):
    api_key = os.getenv('GOOGLE_API_KEY')
    place_id = os.getenv('GOOGLE_PLACE_ID')

    if not api_key or not place_id:
        return JsonResponse({'error': 'Configuration manquante'}, status=500)

    # On demande uniquement les avis (reviews) pour économiser de la data
    url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=reviews,rating,user_ratings_total&key={api_key}&language=fr"

    try:
        response = requests.get(url)
        data = response.json()

        if data.get('status') != 'OK':
            return JsonResponse({'error': 'Erreur Google API'}, status=400)

        # On renvoie juste ce qui nous intéresse
        result = {
            'rating': data['result'].get('rating'),
            'total_reviews': data['result'].get('user_ratings_total'),
            'reviews': data['result'].get('reviews', [])[:3] # On garde les 3 derniers/meilleurs
        }
        return JsonResponse(result)

    except requests.exceptions.RequestException as e:
        return JsonResponse({'error': str(e)}, status=500)