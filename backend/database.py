import sqlite3
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from backend.config import DB_PATH

def get_connection():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Projects table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            sketch_url TEXT NOT NULL,
            edge_url TEXT,
            render_url TEXT NOT NULL,
            style TEXT NOT NULL,
            building_type TEXT NOT NULL,
            lighting TEXT NOT NULL,
            materials TEXT,
            user_prompt TEXT,
            compiled_prompt TEXT NOT NULL,
            negative_prompt TEXT,
            controlnet_strength REAL DEFAULT 0.8,
            denoising_strength REAL DEFAULT 0.75,
            guidance_scale REAL DEFAULT 7.5,
            seed INTEGER DEFAULT -1,
            resolution TEXT DEFAULT "1024x768",
            inference_time_sec REAL DEFAULT 0.0,
            provider TEXT DEFAULT "demo",
            is_demo_mode BOOLEAN DEFAULT 1,
            is_favorite BOOLEAN DEFAULT 0,
            model_name TEXT DEFAULT "lucataco/sdxl-controlnet",
            model_version TEXT DEFAULT "",
            cache_hit BOOLEAN DEFAULT 0,
            aspect_ratio TEXT DEFAULT "4:3",
            created_at TEXT NOT NULL
        )
    """)
    
    # Safe non-destructive column migrations for existing databases
    cursor.execute("PRAGMA table_info(projects)")
    cols = {row["name"] for row in cursor.fetchall()}
    if "model_name" not in cols:
        cursor.execute("ALTER TABLE projects ADD COLUMN model_name TEXT DEFAULT 'lucataco/sdxl-controlnet'")
    if "model_version" not in cols:
        cursor.execute("ALTER TABLE projects ADD COLUMN model_version TEXT DEFAULT ''")
    if "cache_hit" not in cols:
        cursor.execute("ALTER TABLE projects ADD COLUMN cache_hit BOOLEAN DEFAULT 0")
    if "aspect_ratio" not in cols:
        cursor.execute("ALTER TABLE projects ADD COLUMN aspect_ratio TEXT DEFAULT '4:3'")

    # App settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()

def create_project(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    project_id = data.get("id") or str(uuid.uuid4())
    created_at = data.get("created_at") or datetime.utcnow().isoformat()
    
    cursor.execute("""
        INSERT INTO projects (
            id, title, sketch_url, edge_url, render_url, style, building_type,
            lighting, materials, user_prompt, compiled_prompt, negative_prompt,
            controlnet_strength, denoising_strength, guidance_scale, seed,
            resolution, inference_time_sec, provider, is_demo_mode, is_favorite,
            model_name, model_version, cache_hit, aspect_ratio, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        project_id,
        data.get("title", "Campus Architecture Concept"),
        data.get("sketch_url", ""),
        data.get("edge_url", ""),
        data.get("render_url", ""),
        data.get("style", "Modern Minimalist"),
        data.get("building_type", "University Building"),
        data.get("lighting", "Morning"),
        data.get("materials", "Glass and Concrete"),
        data.get("user_prompt", ""),
        data.get("compiled_prompt", ""),
        data.get("negative_prompt", ""),
        data.get("controlnet_strength", 0.8),
        data.get("denoising_strength", 0.75),
        data.get("guidance_scale", 7.5),
        data.get("seed", -1),
        data.get("resolution", "1024x768"),
        data.get("inference_time_sec", 0.0),
        data.get("provider", "demo"),
        1 if data.get("is_demo_mode", True) else 0,
        1 if data.get("is_favorite", False) else 0,
        data.get("model_name", "lucataco/sdxl-controlnet"),
        data.get("model_version", ""),
        1 if data.get("cache_hit", False) else 0,
        data.get("aspect_ratio", "4:3"),
        created_at
    ))
    
    conn.commit()
    conn.close()
    
    return get_project(project_id)

def get_projects(
    search: Optional[str] = None,
    building_type: Optional[str] = None,
    style: Optional[str] = None,
    favorites_only: bool = False
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM projects WHERE 1=1"
    params = []
    
    if search:
        query += " AND (title LIKE ? OR user_prompt LIKE ? OR compiled_prompt LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])
        
    if building_type and building_type != "All":
        query += " AND building_type = ?"
        params.append(building_type)
        
    if style and style != "All":
        query += " AND style = ?"
        params.append(style)
        
    if favorites_only:
        query += " AND is_favorite = 1"
        
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [_project_from_row(row) for row in rows]


def _project_from_row(row: sqlite3.Row) -> Dict[str, Any]:
    project = dict(row)
    for field in ("is_demo_mode", "is_favorite", "cache_hit"):
        if field in project:
            project[field] = bool(project[field])
    return project

def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()
    return _project_from_row(row) if row else None

def delete_project(project_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def toggle_favorite(project_id: str) -> Optional[bool]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_favorite FROM projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
        
    new_fav = 0 if row["is_favorite"] else 1
    cursor.execute("UPDATE projects SET is_favorite = ? WHERE id = ?", (new_fav, project_id))
    conn.commit()
    conn.close()
    return bool(new_fav)

def save_setting(key: str, value: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO app_settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (key, value))
    conn.commit()
    conn.close()

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default
