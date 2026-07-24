def save_health_signal(signal_data: dict):
    """
    Saves a processed health signal to the data storage.
    
    Expected fields in signal_data:
    - timestamp (datetime/str)
    - source (str: 'news', 'reddit', 'gdelt', 'social_media')
    - title (str)
    - description (str)
    - detected_disease (str)
    - location (str)
    - latitude (float)
    - longitude (float)
    - risk_score (float/int)
    """
    
    # Validate required fields are present
    required_fields = [
        "timestamp", "source", "title", "description", 
        "detected_disease", "location", "latitude", "longitude", "risk_score"
    ]
    
    for field in required_fields:
        if field not in signal_data:
            print(f"Warning: Missing required field '{field}' in signal data.")
            # Depending on strictness, we might raise an error or continue
            
    # TODO: Implement actual data storage logic (e.g., saving to MongoDB, PostgreSQL, or a file)
    print(f"Ready to store signal for disease: {signal_data.get('detected_disease')} at {signal_data.get('location')}")
    
    return True
