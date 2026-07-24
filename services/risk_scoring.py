def calculate_risk_score(text):
    """
    Calculates a risk score from 0.0 to 10.0 based on the content of the text.
    """
    score = 5.0
    text_lower = text.lower()
    
    # Increase score for critical keywords
    critical_keywords = ["emergency", "pandemic", "death", "fatal", "outbreak", "critical", "urgent"]
    for word in critical_keywords:
        if word in text_lower:
            score += 1.0
            
    # Increase score for multiple disease mentions
    diseases = ["dengue", "cholera", "malaria", "covid", "ebola", "flu", "influenza"]
    count = 0
    for disease in diseases:
        if disease in text_lower:
            count += 1
    score += min(count * 0.5, 2.0)
    
    # Decrease score for low risk keywords
    low_risk_keywords = ["monitoring", "contained", "low risk", "stable", "improving"]
    for word in low_risk_keywords:
        if word in text_lower:
            score -= 1.0
            
    final_score = max(0.0, min(10.0, score))
    
    # Map score to risk level
    if final_score >= 7.0:
        level = "HIGH"
    elif final_score >= 4.0:
        level = "MEDIUM"
    else:
        level = "LOW"
        
    return final_score, level
