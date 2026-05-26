import requests
import urllib.parse
from typing import Optional, Dict

def _get_config_val(key: str, default: str = None) -> Optional[str]:
    try:
        from flask import current_app
        if current_app:
            return current_app.config.get(key, default)
    except Exception:
        pass
    try:
        from backend.config import Config
        return getattr(Config, key, default)
    except Exception:
        return default

def fetch_youtube_tutorial(search_query: str) -> Optional[Dict]:
    """
    Fetches YouTube tutorial metadata for a given search query.
    Returns a dictionary with title, thumbnail, url, and channel.
    If YOUTUBE_API_KEY is missing, returns mock data for UI testing.
    """
    api_key = _get_config_val("YOUTUBE_API_KEY")
    
    # Fallback/Mock behavior if no API key is provided
    if not api_key:
        query = urllib.parse.quote_plus(search_query)
        import hashlib
        placeholders = [
            "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80", # Fitness/Gym
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80", # Tech/Laptop
            "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80", # Notebook/Writing
            "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=400&q=80"  # Business/Workshop
        ]
        idx = int(hashlib.md5(search_query.encode('utf-8')).hexdigest(), 16) % len(placeholders)
        
        return {
            "title": search_query.title() if search_query else "Recommended Tutorial",
            "thumbnail": placeholders[idx],
            "url": f"https://www.youtube.com/results?search_query={query}",
            "channel": "GrowthPath Guides"
        }

    try:
        # 1. Search for video
        search_url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": search_query,
            "type": "video",
            "maxResults": 1,
            "key": api_key
        }
        
        res = requests.get(search_url, params=params, timeout=5)
        if res.status_code != 200:
            return None
            
        data = res.json()
        if not data.get("items"):
            return None
            
        item = data["items"][0]
        video_id = item["id"]["videoId"]
        snippet = item["snippet"]
        
        # Get highest quality thumbnail available
        thumbnails = snippet.get("thumbnails", {})
        thumbnail_url = ""
        for quality in ["high", "medium", "default"]:
            if quality in thumbnails:
                thumbnail_url = thumbnails[quality]["url"]
                break
                
        return {
            "title": snippet.get("title", ""),
            "thumbnail": thumbnail_url,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "channel": snippet.get("channelTitle", "")
        }
        
    except Exception as e:
        print(f"Error fetching YouTube metadata: {e}")
        return None
