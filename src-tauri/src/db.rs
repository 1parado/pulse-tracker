use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

use crate::models::*;

pub fn init(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch(SCHEMA).map_err(|e| e.to_string())?;
    Ok(conn)
}

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL DEFAULT 'PLS',
  color TEXT NOT NULL DEFAULT '#6E7BF2',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  seq INTEGER NOT NULL DEFAULT 0,
  display_key TEXT NOT NULL DEFAULT '',
  project_id TEXT,
  cycle_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'none',
  gh_repo TEXT,
  gh_number INTEGER,
  gh_state TEXT,
  gh_title TEXT,
  gh_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  name TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_cycle ON issues(cycle_id);
CREATE INDEX IF NOT EXISTS idx_comments_issue ON comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_attachments_issue ON attachments(issue_id);
"#;

fn issue_from_row(row: &rusqlite::Row) -> rusqlite::Result<Issue> {
    Ok(Issue {
        id: row.get("id")?,
        seq: row.get("seq")?,
        display_key: row.get("display_key")?,
        project_id: row.get("project_id")?,
        cycle_id: row.get("cycle_id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        status: row.get("status")?,
        priority: row.get("priority")?,
        gh_repo: row.get("gh_repo")?,
        gh_number: row.get("gh_number")?,
        gh_state: row.get("gh_state")?,
        gh_title: row.get("gh_title")?,
        gh_url: row.get("gh_url")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn project_from_row(row: &rusqlite::Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get("id")?,
        name: row.get("name")?,
        prefix: row.get("prefix")?,
        color: row.get("color")?,
        description: row.get("description")?,
        created_at: row.get("created_at")?,
    })
}

fn cycle_from_row(row: &rusqlite::Row) -> rusqlite::Result<Cycle> {
    Ok(Cycle {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        name: row.get("name")?,
        start_date: row.get("start_date")?,
        end_date: row.get("end_date")?,
        created_at: row.get("created_at")?,
    })
}

fn comment_from_row(row: &rusqlite::Row) -> rusqlite::Result<Comment> {
    Ok(Comment {
        id: row.get("id")?,
        issue_id: row.get("issue_id")?,
        author: row.get("author")?,
        body: row.get("body")?,
        created_at: row.get("created_at")?,
    })
}

fn attachment_from_row(row: &rusqlite::Row) -> rusqlite::Result<Attachment> {
    Ok(Attachment {
        id: row.get("id")?,
        issue_id: row.get("issue_id")?,
        name: row.get("name")?,
        size: row.get("size")?,
        path: row.get("path")?,
        created_at: row.get("created_at")?,
    })
}

// ---------- settings ----------

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |r| r.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO settings(key, value) VALUES(?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- issues ----------

pub fn next_seq(conn: &Connection) -> Result<i64, String> {
    conn.query_row("SELECT COALESCE(MAX(seq), 0) + 1 FROM issues", [], |r| {
        r.get(0)
    })
    .map_err(|e| e.to_string())
}

pub fn list_issues(conn: &Connection) -> Result<Vec<Issue>, String> {
    let mut stmt = conn
        .prepare("SELECT * FROM issues ORDER BY seq DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], issue_from_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_issue(conn: &Connection, id: &str) -> Result<Issue, String> {
    conn.query_row("SELECT * FROM issues WHERE id = ?1", params![id], issue_from_row)
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "issue not found".to_string())
}

pub fn insert_issue(conn: &Connection, i: &Issue) -> Result<(), String> {
    conn.execute(
        "INSERT INTO issues (id, seq, display_key, project_id, cycle_id, title, description, status, priority)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![i.id, i.seq, i.display_key, i.project_id, i.cycle_id, i.title, i.description, i.status, i.priority],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_issue_full(conn: &Connection, i: &Issue) -> Result<(), String> {
    conn.execute(
        "UPDATE issues SET project_id=?1, cycle_id=?2, title=?3, description=?4, status=?5,
         priority=?6, gh_repo=?7, gh_number=?8, gh_state=?9, gh_title=?10, gh_url=?11,
         updated_at=datetime('now') WHERE id=?12",
        params![
            i.project_id, i.cycle_id, i.title, i.description, i.status, i.priority,
            i.gh_repo, i.gh_number, i.gh_state, i.gh_title, i.gh_url, i.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_issue_rows(conn: &Connection, id: &str) -> Result<Vec<String>, String> {
    let mut paths = Vec::new();
    {
        let mut stmt = conn
            .prepare("SELECT path FROM attachments WHERE issue_id = ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![id], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        for p in rows {
            paths.push(p.map_err(|e| e.to_string())?);
        }
    }
    conn.execute("DELETE FROM attachments WHERE issue_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM comments WHERE issue_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM issues WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(paths)
}

// ---------- projects ----------

pub fn list_projects(conn: &Connection) -> Result<Vec<Project>, String> {
    let mut stmt = conn
        .prepare("SELECT * FROM projects ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], project_from_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_project(conn: &Connection, id: &str) -> Result<Option<Project>, String> {
    conn.query_row("SELECT * FROM projects WHERE id = ?1", params![id], project_from_row)
        .optional()
        .map_err(|e| e.to_string())
}

pub fn insert_project(conn: &Connection, p: &Project) -> Result<(), String> {
    conn.execute(
        "INSERT INTO projects (id, name, prefix, color, description) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![p.id, p.name, p.prefix, p.color, p.description],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_project(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("UPDATE issues SET project_id = NULL WHERE project_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cycles WHERE project_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- cycles ----------

pub fn list_cycles(conn: &Connection) -> Result<Vec<Cycle>, String> {
    let mut stmt = conn
        .prepare("SELECT * FROM cycles ORDER BY start_date ASC, created_at ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], cycle_from_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_cycle(conn: &Connection, id: &str) -> Result<Cycle, String> {
    conn.query_row("SELECT * FROM cycles WHERE id = ?1", params![id], cycle_from_row)
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "cycle not found".to_string())
}

pub fn insert_cycle(conn: &Connection, c: &Cycle) -> Result<(), String> {
    conn.execute(
        "INSERT INTO cycles (id, project_id, name, start_date, end_date) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![c.id, c.project_id, c.name, c.start_date, c.end_date],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_cycle(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("UPDATE issues SET cycle_id = NULL WHERE cycle_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cycles WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- comments ----------

pub fn list_comments(conn: &Connection, issue_id: &str) -> Result<Vec<Comment>, String> {
    let mut stmt = conn
        .prepare("SELECT * FROM comments WHERE issue_id = ?1 ORDER BY created_at ASC, rowid ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![issue_id], comment_from_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn insert_comment(conn: &Connection, c: &Comment) -> Result<(), String> {
    conn.execute(
        "INSERT INTO comments (id, issue_id, author, body) VALUES (?1, ?2, ?3, ?4)",
        params![c.id, c.issue_id, c.author, c.body],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_comment(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM comments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- attachments ----------

pub fn insert_attachment(conn: &Connection, a: &Attachment) -> Result<(), String> {
    conn.execute(
        "INSERT INTO attachments (id, issue_id, name, size, path) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![a.id, a.issue_id, a.name, a.size, a.path],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_attachment(conn: &Connection, id: &str) -> Result<Attachment, String> {
    conn.query_row(
        "SELECT * FROM attachments WHERE id = ?1",
        params![id],
        attachment_from_row,
    )
    .optional()
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "attachment not found".to_string())
}

pub fn delete_attachment(conn: &Connection, id: &str) -> Result<String, String> {
    let att = get_attachment(conn, id)?;
    conn.execute("DELETE FROM attachments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(att.path)
}
