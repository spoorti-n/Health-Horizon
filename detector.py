from collections import Counter

GENERIC_LOCATIONS = {"world", "united states", "europe", "asia", "us", "u.s.", "u.s.a.", "usa", "global"}

def detect_outbreaks(locations):
    # Filter out generic or empty locations first
    filtered_locations = [
        loc for loc in locations 
        if loc and loc.strip().lower() not in GENERIC_LOCATIONS
    ]

    counts = Counter(filtered_locations)
    outbreaks = []

    for city, count in counts.items():
        if count >= 6:
            severity = "HIGH"
        elif count >= 3:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        outbreaks.append({
            "city": city,
            "signals": count,
            "severity": severity
        })

    # Sort outbreaks by highest signal count
    outbreaks = sorted(outbreaks, key=lambda x: x["signals"], reverse=True)

    # Limit results to the top 50 locations
    return outbreaks[:50]