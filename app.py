import os
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# In-memory database for simulated tweets
tweets_db = []

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = {'atom': 'http://www.w3.org/2005/Atom'}

def parse_date(date_str):
    # Try parsing different formats if needed, or return as is.
    # Feed update date format: 2026-06-15T00:00:00-07:00
    try:
        clean_date = date_str.split('T')[0]
        dt = datetime.strptime(clean_date, "%Y-%m-%d")
        return dt.strftime("%Y-%m-%d"), dt.strftime("%b %d, %Y")
    except Exception:
        return "", date_str

def parse_entry_content(content_html):
    """
    Parses the combined daily HTML content of an Atom entry into individual release notes.
    Google Cloud release notes group updates by subheadings (h2, h3, h4).
    """
    if not content_html:
        return []
        
    soup = BeautifulSoup(content_html, 'html.parser')
    updates = []
    current_category = "Update"
    current_elements = []
    
    # Iterate through top-level elements of the parsed HTML
    for child in soup.contents:
        if child.name in ['h2', 'h3', 'h4']:
            if current_elements:
                html_str = "".join(str(el) for el in current_elements).strip()
                if html_str:
                    clean_text = BeautifulSoup(html_str, 'html.parser').get_text().strip()
                    clean_text = " ".join(clean_text.split())
                    updates.append({
                        "category": current_category,
                        "content_html": html_str,
                        "content_text": clean_text
                    })
                current_elements = []
            current_category = child.get_text().strip()
        else:
            current_elements.append(child)
            
    # Don't forget the last accumulated block
    if current_elements:
        html_str = "".join(str(el) for el in current_elements).strip()
        if html_str:
            clean_text = BeautifulSoup(html_str, 'html.parser').get_text().strip()
            clean_text = " ".join(clean_text.split())
            updates.append({
                "category": current_category,
                "content_html": html_str,
                "content_text": clean_text
            })
            
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        # Fetch the feed
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        
        # Parse global feed metadata
        feed_title = root.find('atom:title', ATOM_NS)
        feed_title_text = feed_title.text if feed_title is not None else "BigQuery Release Notes"
        
        feed_updated = root.find('atom:updated', ATOM_NS)
        feed_updated_text = feed_updated.text if feed_updated is not None else ""
        _, formatted_feed_updated = parse_date(feed_updated_text)
        
        notes = []
        entries = root.findall('atom:entry', ATOM_NS)
        
        for entry_idx, entry in enumerate(entries):
            entry_id_elem = entry.find('atom:id', ATOM_NS)
            entry_id = entry_id_elem.text if entry_id_elem is not None else f"entry-{entry_idx}"
            
            title_elem = entry.find('atom:title', ATOM_NS)
            date_str = title_elem.text if title_elem is not None else "Unknown Date"
            
            updated_elem = entry.find('atom:updated', ATOM_NS)
            updated_raw = updated_elem.text if updated_elem is not None else ""
            date_iso, _ = parse_date(updated_raw)
            if not date_iso:
                try:
                    dt = datetime.strptime(date_str, "%B %d, %Y")
                    date_iso = dt.strftime("%Y-%m-%d")
                except Exception:
                    date_iso = updated_raw
            
            link_elem = entry.find('atom:link', ATOM_NS)
            link = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_elem = entry.find('atom:content', ATOM_NS)
            content_html = content_elem.text if content_elem is not None else ""
            
            parsed_items = parse_entry_content(content_html)
            
            for item_idx, item in enumerate(parsed_items):
                note_id = f"{entry_id}_{item_idx}"
                notes.append({
                    "id": note_id,
                    "date_str": date_str,
                    "date_iso": date_iso,
                    "category": item["category"],
                    "content_html": item["content_html"],
                    "content_text": item["content_text"],
                    "link": link
                })
                
        return jsonify({
            "success": True,
            "title": feed_title_text,
            "last_updated": formatted_feed_updated,
            "notes": notes
        })
        
    except Exception as e:
        app.logger.error(f"Error fetching/parsing feed: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to load release notes: {str(e)}"
        }), 500

@app.route('/api/tweets', methods=['GET', 'POST'])
def manage_tweets():
    if request.method == 'POST':
        data = request.json or {}
        text = data.get('text', '').strip()
        release_note_id = data.get('release_note_id', '')
        
        if not text:
            return jsonify({"success": False, "error": "Tweet text cannot be empty"}), 400
            
        tweet = {
            "id": f"tweet-{int(datetime.now().timestamp() * 1000)}",
            "text": text,
            "timestamp": datetime.now().isoformat(),
            "release_note_id": release_note_id
        }
        tweets_db.insert(0, tweet)
        return jsonify({"success": True, "tweet": tweet})
        
    else:
        return jsonify({"success": True, "tweets": tweets_db})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
