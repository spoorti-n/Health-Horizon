from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.pipeline import process_outbreaks, get_raw_signals, get_sources_stats
from services.database import init_db, get_all_signals, get_disease_trends, get_outbreak_predictions

app = FastAPI(title="Disease Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "API running"}

@app.get("/outbreaks")
def get_outbreaks():
    try:
        return process_outbreaks()
    except Exception as e:
        print(f"Unhandled error in get_outbreaks: {e}")
        return []

@app.get("/signals")
def get_signals():
    try:
        return get_raw_signals()
    except Exception as e:
        print(f"Unhandled error in get_signals: {e}")
        return []

@app.get("/sources")
def get_sources():
    try:
        return get_sources_stats()
    except Exception as e:
        print(f"Unhandled error in get_sources: {e}")
        return {"NewsAPI": 0, "GDELT": 0}

@app.get("/api/signals")
def get_api_signals():
    try:
        return get_all_signals()
    except Exception as e:
        print(f"Error in get_api_signals: {e}")
        return []

@app.get("/api/analytics")
def get_api_analytics():
    try:
        return {"diseases": get_disease_trends()}
    except Exception as e:
        print(f"Error in get_api_analytics: {e}")
        return {"diseases": []}

@app.get("/api/predictions")
def get_api_predictions():
    try:
        return get_outbreak_predictions()
    except Exception as e:
        print(f"Error in get_api_predictions: {e}")
        return []