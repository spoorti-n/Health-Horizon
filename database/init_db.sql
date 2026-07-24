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
);