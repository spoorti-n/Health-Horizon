import sqlite3

DB_PATH = "database/outbreaks.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS health_signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        source TEXT,
        title TEXT,
        description TEXT,
        detected_disease TEXT,
        location TEXT,
        latitude REAL,
        longitude REAL,
        risk_score REAL
    )
    """)

    conn.commit()
    conn.close()

def get_all_signals():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM health_signals ORDER BY timestamp DESC")
    columns = [column[0] for column in cursor.description]
    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return results

def get_disease_trends():
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT 
            detected_disease as disease,
            COUNT(*) as totalReports,
            AVG(risk_score) as averageRisk,
            MAX(timestamp) as latestReport
        FROM health_signals
        GROUP BY detected_disease
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    trends = []
    for row in rows:
        disease = row["disease"]
        total_reports = row["totalReports"]
        avg_risk = row["averageRisk"] or 0.0
        trends.append({
            "disease": disease,
            "totalReports": total_reports,
            "totalCases": round(avg_risk * 10),
            "averageCases": round(avg_risk * 5),
            "trend": "increasing" if total_reports > 5 else "stable"
        })
    return trends

def get_outbreak_predictions():
    from datetime import datetime, timedelta
    twenty_four_hours_ago = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT 
            detected_disease as disease,
            location,
            COUNT(*) as reports,
            MAX(risk_score) as maxRisk
        FROM health_signals
        WHERE timestamp >= ?
        GROUP BY detected_disease, location
    """
    cursor.execute(query, (twenty_four_hours_ago,))
    rows = cursor.fetchall()
    conn.close()

    predictions = []
    for row in rows:
        disease = row["disease"]
        location = row["location"]
        reports = row["reports"]
        max_risk = row["maxRisk"] or 0.0
        score = min(round((reports * 15) + (max_risk * 8)), 100)
        predictions.append({
            "disease": disease,
            "location": location,
            "riskProbability": score
        })
    return predictions