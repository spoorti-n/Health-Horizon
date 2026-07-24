import requests

def fetch_gdelt():
    url = "https://api.gdeltproject.org/api/v2/doc/doc?query=disease%20OR%20virus%20OR%20outbreak&mode=ArtList&maxrecords=30&format=json"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        articles = []
        for article in data.get("articles", []):
            if article.get("title"):
                articles.append({
                    "source": "GDELT",
                    "title": article["title"],
                    "description": ""
                })
        return articles
    except Exception as e:
        print(f"Error fetching GDELT data: {e}")
        return []