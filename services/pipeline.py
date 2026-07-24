from news_fetcher import fetch_news
from gdelt_fetcher import fetch_gdelt
from classifier import is_health_signal, extract_disease
from location_extractor import extract_locations
from detector import detect_outbreaks
from geocoder import geocode_location
from services.save_signal import save_signal
from services.risk_scoring import calculate_risk_score
from datetime import datetime
import time

def process_article(article):
    title = article.get("title", "").strip()
    description = article.get("description", "").strip()
    text = f"{title} {description}".strip()
    
    if not text or not is_health_signal(text):
        return None
        
    locations = extract_locations(text)
    if not locations:
        return None
        
    # Use the first extracted location for the structured signal
    location_name = locations[0]
    coords = geocode_location(location_name)
    
    if not coords:
        return None
        
    risk_score, risk_level = calculate_risk_score(text)
    
    signal = {
        "timestamp": datetime.utcnow().isoformat(),
        "source": article.get("source", "unknown"),
        "title": title,
        "description": description,
        "detected_disease": extract_disease(text), 
        "location": location_name,
        "latitude": coords["lat"],
        "longitude": coords["lng"],
        "risk_score": risk_score
    }
    
    save_signal(signal)
    return signal

CACHE_TTL = 300  # 5 minutes in seconds
app_cache = {
    "timestamp": 0,
    "news": [],
    "gdelt": [],
    "signals": [],
    "outbreaks": []
}

def update_cache_if_needed():
    global app_cache
    current_time = time.time()
    
    if current_time - app_cache["timestamp"] < CACHE_TTL:
        return  # Cache is still valid
        
    # Refresh data
    try:
        news = fetch_news()
    except Exception as e:
        print(f"Error fetching news: {e}")
        news = []
        
    try:
        gdelt = fetch_gdelt()
    except Exception as e:
        print(f"Error fetching GDELT: {e}")
        gdelt = []

    # Process signals
    raw_data = news + gdelt
    signals = []
    
    for item in raw_data:
        processed = process_article(item)
        if processed:
            signals.append(processed)

    # Process outbreaks
    locations = []
    for item in signals:
        text = item.get("text", "")
        try:
            cities = extract_locations(text)
            locations.extend(cities)
        except Exception as e:
            print(f"Error extracting locations: {e}")
            continue

    try:
        outbreaks = detect_outbreaks(locations)
    except Exception as e:
        print(f"Error detecting outbreaks: {e}")
        outbreaks = []

    SEVERITY_RANK = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    seen_cities = set()
    geocoded_outbreaks = []
    for ob in outbreaks:
        city = ob["city"]
        if city in seen_cities:
            continue
        coords = geocode_location(city)
        if coords:
            ob["lat"] = coords["lat"]
            ob["lng"] = coords["lng"]
            seen_cities.add(city)
            geocoded_outbreaks.append(ob)

    # Sort by severity first, then by signal count descending
    geocoded_outbreaks.sort(
        key=lambda x: (SEVERITY_RANK.get(x["severity"], 3), -x["signals"])
    )

    # Cap at 50 results for map performance
    geocoded_outbreaks = geocoded_outbreaks[:50]

    # Save to cache
    app_cache["news"] = news
    app_cache["gdelt"] = gdelt
    app_cache["signals"] = signals
    app_cache["outbreaks"] = geocoded_outbreaks
    app_cache["timestamp"] = current_time

def get_sources_stats():
    update_cache_if_needed()
    return {
        "NewsAPI": len(app_cache["news"]),
        "GDELT": len(app_cache["gdelt"])
    }

def get_raw_signals():
    update_cache_if_needed()
    return app_cache["signals"]

def process_outbreaks():
    update_cache_if_needed()
    return app_cache["outbreaks"]
