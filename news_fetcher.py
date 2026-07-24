import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_KEY = os.getenv("NEWS_API_KEY")

def fetch_news():
    if not API_KEY:
        print("Error: NEWS_API_KEY not found in environment variables.")
        return []
        
    url = f"https://newsapi.org/v2/everything?q=disease OR outbreak OR virus OR infection&language=en&sortBy=publishedAt&apiKey={API_KEY}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        articles = []
        for article in data.get("articles", []):
            if article.get("title") or article.get("description"):
                title = article.get("title", "") or ""
                description = article.get("description", "") or ""
                source = "Unknown"
                if article.get("source") and article.get("source").get("name"):
                    source = article["source"]["name"]
                    
                articles.append({
                    "source": source,
                    "title": title,
                    "description": description
                })
        return articles
    except Exception as e:
        print(f"Error fetching news: {e}")
        return []