import sqlite3
import os
import random
from datetime import datetime, timedelta

# Database path
db_path = os.path.join(os.path.dirname(__file__), "database", "outbreaks.db")

# Seed Data Configuration
DISEASES = ["Dengue", "COVID", "Cholera", "Malaria", "Influenza", "Mpox"]
LOCATIONS = {
    "Mumbai": (19.0760, 72.8777),
    "Delhi": (28.6139, 77.2090),
    "Lagos": (6.5244, 3.3792),
    "Nairobi": (-1.2921, 36.8219),
    "Jakarta": (-6.2088, 106.8456),
    "São Paulo": (-23.5505, -46.6333),
    "Bangkok": (13.7563, 100.5018),
    "Cairo": (30.0444, 31.2357),
    "New York": (40.7128, -74.0060),
    "London": (51.5074, -0.1278),
    # Karnataka regions
    "Bengaluru": (12.9716, 77.5946),
    "Mysuru": (12.2958, 76.6394),
    "Mangaluru": (12.9141, 74.8560),
    "Hubballi": (15.3647, 75.1240),
    "Belagavi": (15.8497, 74.4977),
    "Davanagere": (14.4644, 75.9218),
    "Ballari": (15.1394, 76.9214),
    "Vijayapura": (16.8302, 75.7100),
    "Shivamogga": (13.9299, 75.5681),
    "Tumakuru": (13.3379, 77.1173),
    "Raichur": (16.2120, 77.3439),
    "Bidar": (17.9104, 77.5199),
    "Kalaburagi": (17.3297, 76.8343),
    "Udupi": (13.3409, 74.7421),
    "Chikkamagaluru": (13.3161, 75.7720)
}
SOURCES = ["NewsAPI", "GDELT", "Reddit", "Hospital Report", "Twitter"]

TITLES = [
    "Rise in {disease} cases reported in {location}",
    "Health authorities issue alert for {disease} in {location}",
    "Increased hospital admissions for {disease} in {location}",
    "New {disease} cluster detected near {location} residential areas",
    "Seasonal {disease} outbreak levels concern officials in {location}"
]

DESCRIPTIONS = [
    "Local medical centers in {location} are reporting a significant uptick in {disease} symptoms among residents. Public health measures are being reinforced.",
    "A surveillance report indicates that {disease} is spreading faster than expected in the {location} metropolitan area. Citizens are advised to take precautions.",
    "Emergency response teams have been deployed to {location} following a surge in {disease} cases. The situation is being monitored closely.",
    "In {location}, health clinics are seeing double the usual amount of {disease} patients this week. Further testing is underway to confirm the strain.",
    "Official data from {location} shows the highest levels of {disease} infection in three years, prompting immediate government intervention."
]

def seed_database():
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("Seeding 20 realistic records into health_signals...")

        for i in range(20):
            disease = random.choice(DISEASES)
            location_name = random.choice(list(LOCATIONS.keys()))
            lat, lng = LOCATIONS[location_name]
            source = random.choice(SOURCES)
            risk_score = round(random.uniform(3.0, 9.0), 1)
            
            # Random timestamp within the last 7 days
            days_ago = random.randint(0, 7)
            hours_ago = random.randint(0, 23)
            timestamp = (datetime.now() - timedelta(days=days_ago, hours=hours_ago)).isoformat()
            
            title = random.choice(TITLES).format(disease=disease, location=location_name)
            description = random.choice(DESCRIPTIONS).format(disease=disease, location=location_name)

            cursor.execute("""
                INSERT INTO health_signals 
                (timestamp, source, title, description, detected_disease, location, latitude, longitude, risk_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (timestamp, source, title, description, disease, location_name, lat, lng, risk_score))

        conn.commit()
        conn.close()
        print("Success: 20 records seeded.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    seed_database()
