#!/usr/bin/env python3
import sqlite3
import os
import hashlib
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "database.sqlite")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def init_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'editor',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Create sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    # Create articles table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        author_id TEXT,
        date TEXT NOT NULL,
        image TEXT NOT NULL,
        read_time INTEGER DEFAULT 3,
        description TEXT NOT NULL,
        body TEXT NOT NULL,
        keywords TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users (id)
    );
    """)

    # Create projects table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        author TEXT NOT NULL,
        author_id TEXT,
        collaborator_id TEXT,
        collaborator_name TEXT,
        image TEXT,
        categories TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users (id),
        FOREIGN KEY (collaborator_id) REFERENCES users (id)
    );
    """)

    # Create project_parts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_parts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        part_order INTEGER DEFAULT 1,
        title TEXT NOT NULL,
        subtitle TEXT,
        read_time INTEGER DEFAULT 4,
        body TEXT NOT NULL,
        bibliography TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );
    """)

    # Seed initial default admin / editor user
    seed_user_id = "user-editor-01"
    seed_email = "editor@articlewebsite.com"
    cursor.execute("SELECT id FROM users WHERE email = ?", (seed_email,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, ?, ?, ?, ?);
        """, (
            seed_user_id,
            "Ali Mert Bayar",
            seed_email,
            hash_password("Draxlers"),
            "admin"
        ))
        print(f"Created seed user: {seed_email} / Draxlers")

    seed_user_id_2 = "user-editor-personal"
    seed_email_2 = "mert.bayar.200807@gmail.com"
    cursor.execute("SELECT id FROM users WHERE email = ?", (seed_email_2,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, ?, ?, ?, ?);
        """, (
            seed_user_id_2,
            "Ali Mert Bayar",
            seed_email_2,
            hash_password("Draxlers.07"),
            "admin"
        ))
        print(f"Created seed user: {seed_email_2} / Draxlers.07")

    # Seed articles if empty
    cursor.execute("SELECT COUNT(*) FROM articles;")
    count = cursor.fetchone()[0]
    articles_json_path = os.path.join(os.path.dirname(__file__), "articles.json")
    if count == 0 and os.path.exists(articles_json_path):
        with open(articles_json_path, "r", encoding="utf-8") as f:
            seed_articles = json.load(f)
            for a in seed_articles:
                cursor.execute("""
                INSERT OR REPLACE INTO articles (id, title, author, author_id, date, image, read_time, description, body, keywords)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    str(a.get("id")),
                    a.get("title", ""),
                    a.get("author", "Ali Mert Bayar"),
                    seed_user_id,
                    a.get("date", "2026-16-9"),
                    a.get("image", "images/spanish colonisation.png"),
                    a.get("readTime", 4),
                    a.get("description", ""),
                    a.get("body", ""),
                    json.dumps(a.get("keywords", ["History"]))
                ))
        print(f"Seeded {len(seed_articles)} articles from articles.json into SQLite database.")

    conn.commit()
    conn.close()
    print(f"Database successfully initialized at {DB_PATH}")

if __name__ == "__main__":
    init_database()

