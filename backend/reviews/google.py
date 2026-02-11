import requests
from django.conf import settings

GOOGLE_PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

def fetch_google_reviews(place_id: str, limit: int = 6):
    params = {
        "place_id": place_id,
        "fields": "reviews",   
        "language": "fr",
        "key": settings.GOOGLE_PLACES_API_KEY,
    }

    r = requests.get(GOOGLE_PLACE_DETAILS_URL, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()

    result = data.get("result") or {}
    reviews = (result.get("reviews") or [])[: max(0, int(limit))]

    # On retourne seulement ce qui est utile à afficher
    return [
        {
            "author": rev.get("author_name"),
            "rating": rev.get("rating"),
            "text": rev.get("text"),
            "time": rev.get("relative_time_description"),
            "photo": rev.get("profile_photo_url"),
        }
        for rev in reviews
    ]
