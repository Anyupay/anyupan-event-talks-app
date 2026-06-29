# BigQuery Release Notes Explorer

A modern, fast, and feature-rich web application built with Python Flask and plain vanilla HTML, CSS, and JavaScript. The application fetches, parses, and formats official Google Cloud BigQuery Release Notes, allowing you to search updates, filter by type (Features, Changes, Deprecations), toggle dark/light themes, copy direct release links, and compose and share posts directly to X (formerly Twitter) using a simulated compose interface.

## Features

- **Automated XML Parsing**: Pulls data from the official Google Cloud feeds and splits compound entry releases (e.g. multiple features or changes in a single day) into discrete, highly readable cards.
- **In-Memory Caching**: Caches parsed results for 5 minutes on the backend to guarantee lightning-fast load times and avoid feed rate-limiting, with a force-refresh capability built into the client interface.
- **Twitter/X Compose Modal**: Integrates a Twitter-style draft composer that pre-populates the update contents, measures character length against the 280-character limit, renders an animated circular progress ring, and opens the official X Web Intent compose drawer on submit.
- **Advanced UI Filters**: Real-time interactive keyword search and category tabs with live result counters.
- **Theme Engine**: Complete light and dark themes styled with elegant CSS variables and smooth transition variables.
- **Vibrant Modern Design**: Styled with a dark blue-grey/slate aesthetic, subtle glowing gradients, glassmorphism, skeletons loaders, custom SVG vectors, and sleek Toast notifications.

## Project Structure

The project files are structured as follows:

- [`app.py`](file:///Users/anyupan/agy-cli-projects/bq-release-notes/app.py): The Python Flask backend. Handles HTTP requests, caches results, fetches XML, and extracts individual updates using `BeautifulSoup`.
- [`templates/index.html`](file:///Users/anyupan/agy-cli-projects/bq-release-notes/templates/index.html): The layout structure containing containers, icons, skeleton loaders, and composer modals.
- [`static/css/style.css`](file:///Users/anyupan/agy-cli-projects/bq-release-notes/static/css/style.css): The CSS stylesheet implementing custom themes, glassmorphism styling, layout transitions, progress indicators, and ambient glow circles.
- [`static/js/app.js`](file:///Users/anyupan/agy-cli-projects/bq-release-notes/static/js/app.js): The client script managing application state, filtering/searching, clipboard copies, tweet intent creations, progress ring math, and notifications.
- [`requirements.txt`](file:///Users/anyupan/agy-cli-projects/bq-release-notes/requirements.txt): Python dependency specification.

## Getting Started

### Prerequisites

Ensure you have Python 3.8+ installed on your system.

### Setup Instructions

1. **Clone or navigate to the workspace directory**:
   ```bash
   cd /Users/anyupan/agy-cli-projects/bq-release-notes
   ```

2. **Install the dependencies**:
   Run the following command to install the required libraries:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Flask development server**:
   Run the backend application:
   ```bash
   python3 app.py
   ```
   By default, the server will start on **`http://127.0.0.1:8080`**.

4. **Open in Browser**:
   Navigate to [http://127.0.0.1:8080](http://127.0.0.1:8080) in your web browser to enjoy the application!
