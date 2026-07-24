import json
import os
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

geolocator = Nominatim(user_agent="disease_monitor_app_v2")
CACHE_FILE = os.path.join(os.path.dirname(__file__), "database", "geo_cache.json")

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f)

def geocode_location(city: str):
    """
    Resolves city to lat/lng with caching and fallbacks.
    """
    if not city:
        return None
        
    cache = load_cache()
    if city in cache:
        return cache[city]

    # Attempts: [Original, Original + " Country" if applicable]
    attempts = [city]
    
    for query in attempts:
        try:
            location = geolocator.geocode(query, timeout=10)
            if location:
                result = {
                    "city": city,
                    "lat": float(location.latitude),
                    "lng": float(location.longitude)
                }
                cache[city] = result
                save_cache(cache)
                return result
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            print(f"Geocoding timeout/service error for {query}: {e}")
            continue
        except Exception as e:
            print(f"Unexpected geocoding error for {query}: {e}")
            continue
            
    return None