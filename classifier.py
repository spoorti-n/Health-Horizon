DISEASE_KEYWORDS = [
    "dengue", "flu", "influenza", "virus", "infection",
    "epidemic", "pandemic", "cholera", "malaria", "covid",
    "sepsis", "respiratory illness", "hospital cases", 
    "health emergency", "disease outbreak"
]

POPULATION_LOCATION_KEYWORDS = [
    "hospital", "city", "state", "country", "patients",
    "cases", "workers", "community", "region"
]

REJECT_KEYWORDS = [
    "tortoise", "ferret", "bird", "fish", "dog", "cat", 
    "wildlife", "animal", "coyote", "crow", "ransomware", 
    "cyber attack", "technology", "fire outbreak", "violence outbreak"
]

def is_health_signal(text):
    text = text.lower()

    # Reject unrelated topics, animals, and non-health outbreaks
    for reject in REJECT_KEYWORDS:
        if reject in text:
            return False

    # Must contain at least one explicit disease terminology
    has_disease = any(keyword in text for keyword in DISEASE_KEYWORDS)
    
    # Must contain at least one population or location context
    has_population_location = any(keyword in text for keyword in POPULATION_LOCATION_KEYWORDS)
    
    return has_disease and has_population_location

KNOWN_DISEASES = [
    "Dengue", "Cholera", "Influenza", "COVID", "Malaria", "Ebola", "Tuberculosis", "Mpox"
]

DISEASE_VARIANTS = {
    "Dengue": ["dengue", "dengue fever"],
    "Cholera": ["cholera"],
    "Influenza": ["influenza", "flu", "viral fever"],
    "COVID": ["covid", "covid-19", "coronavirus"],
    "Malaria": ["malaria"],
    "Ebola": ["ebola"],
    "Tuberculosis": ["tuberculosis", "tb"],
    "Mpox": ["mpox", "monkeypox"]
}

def extract_disease(text):
    """
    Extracts the specific disease name from the text based on variants.
    If multiple diseases are mentioned, returns the one with the most occurrences.
    """
    text = text.lower()
    counts = {}
    
    for canonical, variants in DISEASE_VARIANTS.items():
        total_count = 0
        for variant in variants:
            # Simple count; could use regex for word boundaries but this fits current scope
            total_count += text.count(variant.lower())
        
        if total_count > 0:
            counts[canonical] = total_count
            
    if not counts:
        return "Unknown"
        
    # Return the disease with the highest total variation count
    return max(counts, key=counts.get)