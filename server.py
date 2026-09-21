#!/usr/bin/env python3
"""
Article Website - Local Development & Auto-Sync Server
Automatically saves published articles directly into:
1. articles-data.js (synchronous JavaScript database)
2. articles.json (JSON articles API)
3. database.sqlite (SQLite storage)

Usage:
    python3 server.py [port]
"""

import http.server
import socketserver
import os
import json
import sqlite3
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTICLES_JSON_PATH = os.path.join(BASE_DIR, "articles.json")
ARTICLES_DATA_JS_PATH = os.path.join(BASE_DIR, "articles-data.js")
DB_PATH = os.path.join(BASE_DIR, "database.sqlite")

def get_all_articles():
    if os.path.exists(ARTICLES_JSON_PATH):
        try:
            with open(ARTICLES_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            print(f"[Warning] Failed to read articles.json: {e}")
    return []

def save_all_articles(articles):
    # 1. Save to articles.json
    with open(ARTICLES_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=4, ensure_ascii=False)

    # 2. Save to articles-data.js
    js_content = "/**\n * Point of View / Article Website\n * Central articles database - available synchronously to all pages.\n * Compatible with static hosts (GitHub Pages) and local environments.\n */\nwindow.ARTICLES_DATABASE = " + json.dumps(articles, indent=4, ensure_ascii=False) + ";\n"
    with open(ARTICLES_DATA_JS_PATH, "w", encoding="utf-8") as f:
        f.write(js_content)

    # 3. Save to database.sqlite if exists
    try:
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            for a in articles:
                kw = a.get("keywords", [])
                if isinstance(kw, list):
                    kw_str = json.dumps(kw)
                else:
                    kw_str = str(kw)

                cursor.execute("""
                INSERT OR REPLACE INTO articles (id, title, author, author_id, date, image, read_time, description, body, keywords)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    str(a.get("id")),
                    a.get("title", ""),
                    a.get("author", "Ali Mert Bayar"),
                    a.get("authorId", "user-editor-01"),
                    a.get("date", "2026-16-9"),
                    a.get("image", "images/spanish colonisation.png"),
                    a.get("readTime", 4),
                    a.get("description", ""),
                    a.get("body", ""),
                    kw_str
                ))
            conn.commit()
            conn.close()
    except Exception as e:
        print(f"[Warning] Failed to sync with SQLite: {e}")

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_POST(self):
        if self.path == "/api/save-article":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                article = json.loads(body)

                art_id = str(article.get("id"))
                articles = get_all_articles()

                # Check if updating existing or inserting new
                found_idx = next((i for i, a in enumerate(articles) if str(a.get("id")) == art_id), None)
                if found_idx is not None:
                    articles[found_idx] = article
                else:
                    articles.insert(0, article)

                save_all_articles(articles)
                print(f"[Server] Successfully saved article '{article.get('title')}' (ID: {art_id}) to files.")

                response_data = {
                    "success": True,
                    "message": f"Article '{article.get('title')}' successfully saved into articles-data.js and articles.json!",
                    "article": article
                }
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode("utf-8"))
            except Exception as e:
                print(f"[Server Error] {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"==================================================")
        print(f"🚀 Point of View Server running at http://localhost:{PORT}")
        print(f"📝 Publishing articles will auto-save to articles-data.js & articles.json")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.server_close()

