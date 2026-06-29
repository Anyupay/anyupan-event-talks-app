import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# Cache dictionary to store feed data
# Format: { 'data': [...], 'timestamp': 1690000000 }
FEED_CACHE = {
    'data': None,
    'timestamp': 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

def fetch_and_parse_feed(force_refresh=False):
    """
    Fetches the BigQuery Release Notes RSS feed and parses it.
    Uses caching to avoid excessive network calls, unless force_refresh is True.
    """
    global FEED_CACHE
    current_time = time.time()
    
    # Return cached data if it's still valid and not a forced refresh
    if FEED_CACHE['data'] is not None and not force_refresh:
        if current_time - FEED_CACHE['timestamp'] < CACHE_DURATION:
            return FEED_CACHE['data']
            
    # Fetch from Google Cloud feed URL
    url = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml'
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title_el = entry.find('atom:title', ns)
            date_str = title_el.text if title_el is not None else "Unknown Date"
            
            updated_el = entry.find('atom:updated', ns)
            updated_str = updated_el.text if updated_el is not None else ""
            
            link_el = entry.find('atom:link', ns)
            link = link_el.attrib.get('href') if link_el is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Parse HTML content using BeautifulSoup to extract individual updates (Features, Changes, etc.)
            soup = BeautifulSoup(content_html, 'html.parser')
            
            updates = []
            current_header = None
            current_paragraphs = []
            
            for element in soup.contents:
                if element.name == 'h3':
                    if current_header:
                        desc_html = ''.join(str(x) for x in current_paragraphs).strip()
                        desc_text = ''.join(x.get_text() for x in current_paragraphs).strip()
                        updates.append({
                            'type': current_header,
                            'description_html': desc_html,
                            'description_text': desc_text
                        })
                    current_header = element.get_text().strip()
                    current_paragraphs = []
                elif current_header:
                    current_paragraphs.append(element)
                    
            if current_header:
                desc_html = ''.join(str(x) for x in current_paragraphs).strip()
                desc_text = ''.join(x.get_text() for x in current_paragraphs).strip()
                updates.append({
                    'type': current_header,
                    'description_html': desc_html,
                    'description_text': desc_text
                })
                
            if not updates:
                # Fallback if no <h3> is found in the entry
                updates.append({
                    'type': 'Update',
                    'description_html': content_html,
                    'description_text': soup.get_text().strip()
                })
                
            # Flatten the updates into individual entry records
            entry_id_base = entry.find('atom:id', ns).text if entry.find('atom:id', ns) is not None else date_str
            for index, u in enumerate(updates):
                entries.append({
                    'id': f"{entry_id_base}_{index}",
                    'date': date_str,
                    'updated': updated_str,
                    'link': link,
                    'type': u['type'],
                    'description_html': u['description_html'],
                    'description_text': u['description_text']
                })
                
        # Update cache
        FEED_CACHE = {
            'data': entries,
            'timestamp': current_time
        }
        return entries
        
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        # If fetch fails but we have cached data, return the cached data as a fallback
        if FEED_CACHE['data'] is not None:
            return FEED_CACHE['data']
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        releases = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            'success': True,
            'releases': releases,
            'cached_at': FEED_CACHE['timestamp'],
            'from_cache': not force_refresh and (time.time() - FEED_CACHE['timestamp'] < CACHE_DURATION)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=8080)
