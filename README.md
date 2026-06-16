# BigQuery Release Notes Hub

A modern, responsive, and interactive dashboard built with **Python Flask** and **Vanilla HTML/CSS/JS** to fetch, parse, search, and tweet official Google Cloud BigQuery release updates.

---

## ✨ Features

*   **Real-time Atom Feed Syncing:** Parses the official Google Cloud BigQuery feed in real-time.
*   **Atomic Card Parsing:** Automatically splits daily grouped release announcements into individual, self-contained update cards based on categories (e.g. *Feature*, *Issue*, *Deprecated*).
*   **Aesthetic UI Design:** Modern dark mode interface styled with Google Fonts (`Outfit` & `Plus Jakarta Sans`), glassmorphism, responsive grids, color-coded tag indicators, and hover animations.
*   **Client-side Instant Filters:**
    *   Fuzzy search on date, category, and text content.
    *   Dynamic category checkboxes (built directly from active feed updates) with counts.
    *   Sorting by newest/oldest first.
*   **Interactive Tweet Composer:**
    *   Pre-drafts structured updates with customized headers, truncated summaries, and direct links.
    *   Visual character count tracking using a dynamic circular SVG progress ring (warning states for limits).
    *   Option to post to an in-app **Simulated X Timeline** and/or open a live **X (Twitter) Intent** tab.
*   **Stats Dashboard:** Real-time counter of total visible features, changes, and issues.

---

## 📁 Project Structure

```
bigquery-release-notes-viewer/
├── app.py                     # Flask web server, Atom feed proxy, and HTML content splitter
├── requirements.txt           # Python application dependencies
├── README.md                  # Project overview and instructions
├── .gitignore                 # Version control exclusions
├── templates/
│   └── index.html             # Shell markup layout and inline SVG icons
└── static/
    ├── css/
    │   └── style.css          # Design system stylesheet
    └── js/
        └── app.js             # Client-side filtering, sorting, tab controller, and modal logic
```

---

## 🚀 Getting Started

### 📋 Prerequisites
*   Python 3.10 or higher.
*   Git (optional).

### ⚙️ Quick Installation

1.  **Clone / Navigate** to your local project folder:
    ```bash
    cd /Users/thomasshelby/Desktop/agy-cli-projects/bigquery-release-notes-viewer
    ```

2.  **Create and activate** a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the application**:
    ```bash
    python app.py
    ```

5.  Open your browser and navigate to:
    👉 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 🔌 API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/` | Serves the main SPA user interface. |
| **GET** | `/api/release-notes` | Fetches the XML feed, splits it, and returns clean structured release objects. |
| **GET** | `/api/tweets` | Returns all tweets posted to the in-memory simulated feed. |
| **POST** | `/api/tweets` | Appends a new tweet to the in-memory timeline database. |
