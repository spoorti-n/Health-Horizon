from services.database import get_connection

def is_duplicate(title):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM health_signals WHERE title = ?", (title,))
    result = cursor.fetchone()
    conn.close()
    return result is not None

def save_signal(signal):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Normalize title for consistent deduplication
    normalized_title = signal["title"].strip()
    
    cursor.execute("SELECT id FROM health_signals WHERE title = ?", (normalized_title,))
    existing = cursor.fetchone()

    if existing:
        print(f"Duplicate headline skipped: {normalized_title}")
        conn.close()
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO health_signals
    (timestamp, source, title, description, detected_disease, location, latitude, longitude, risk_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        signal["timestamp"],
        signal["source"],
        signal["title"],
        signal["description"],
        signal["detected_disease"],
        signal["location"],
        signal["latitude"],
        signal["longitude"],
        signal["risk_score"]
    ))

    conn.commit()
    conn.close()
    print(f"Saved signal: {signal['title']}")