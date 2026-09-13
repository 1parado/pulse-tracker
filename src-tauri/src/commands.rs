use tauri::State;

use crate::db;
use crate::github;
use crate::models::*;
use crate::AppState;

#[tauri::command]
pub fn list_issues(state: State<'_, AppState>) -> Result<Vec<Issue>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::list_issues(&conn)
}

#[tauri::command]
pub fn create_issue(state: State<'_, AppState>, input: NewIssue) -> Result<Issue, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let seq = db::next_seq(&conn)?;
    let prefix = match &input.project_id {
        Some(pid) => db::get_project(&conn, pid)?
            .map(|p| p.prefix)
            .unwrap_or_else(|| "PLS".to_string()),
        None => "PLS".to_string(),
    };
    let issue = Issue {
        id: uuid::Uuid::new_v4().to_string(),
        seq,
        display_key: format!("{}-{}", prefix, seq),
        project_id: input.project_id,
        cycle_id: input.cycle_id,
        title: input.title,
        description: input.description.unwrap_or_default(),
        status: input.status.unwrap_or_else(|| "todo".to_string()),
        priority: input.priority.unwrap_or_else(|| "none".to_string()),
        gh_repo: None,
        gh_number: None,
        gh_state: None,
        gh_title: None,
        gh_url: None,
        created_at: String::new(),
        updated_at: String::new(),
    };
    db::insert_issue(&conn, &issue)?;
    db::get_issue(&conn, &issue.id)
}

#[tauri::command]
pub fn update_issue(state: State<'_, AppState>, input: UpdateIssue) -> Result<Issue, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut it = db::get_issue(&conn, &input.id)?;
    if let Some(v) = input.title {
        it.title = v;
    }
    if let Some(v) = input.description {
        it.description = v;
    }
    if input.clear_project {
        it.project_id = None;
    } else if let Some(v) = input.project_id {
        it.project_id = Some(v);
    }
    if input.clear_cycle {
        it.cycle_id = None;
    } else if let Some(v) = input.cycle_id {
        it.cycle_id = Some(v);
    }
    if let Some(v) = input.status {
        it.status = v;
    }
    if let Some(v) = input.priority {
        it.priority = v;
    }
    if input.clear_github {
        it.gh_repo = None;
        it.gh_number = None;
        it.gh_state = None;
        it.gh_title = None;
        it.gh_url = None;
    }
    db::update_issue_full(&conn, &it)?;
    db::get_issue(&conn, &it.id)
}

#[tauri::command]
pub fn delete_issue(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let paths = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::delete_issue_rows(&conn, &id)?
    };
    for p in paths {
        std::fs::remove_file(&p).ok();
    }
    Ok(())
}

// ---------- projects ----------

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::list_projects(&conn)
}

fn derive_prefix(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(3)
        .collect::<String>()
        .to_ascii_uppercase();
    let mut s = cleaned;
    while s.len() < 2 {
        s.push('X');
    }
    s
}

#[tauri::command]
pub fn create_project(state: State<'_, AppState>, input: NewProject) -> Result<Project, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let name = input.name;
    let prefix = input
        .prefix
        .map(|s| s.to_ascii_uppercase())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| derive_prefix(&name));
    let p = Project {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        prefix,
        color: input.color.unwrap_or_else(|| "#6E7BF2".to_string()),
        description: input.description.unwrap_or_default(),
        created_at: String::new(),
    };
    db::insert_project(&conn, &p)?;
    Ok(p)
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_project(&conn, &id)
}

// ---------- cycles ----------

#[tauri::command]
pub fn list_cycles(state: State<'_, AppState>) -> Result<Vec<Cycle>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::list_cycles(&conn)
}

#[tauri::command]
pub fn create_cycle(state: State<'_, AppState>, input: NewCycle) -> Result<Cycle, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let c = Cycle {
        id: uuid::Uuid::new_v4().to_string(),
        project_id: input.project_id,
        name: input.name,
        start_date: input.start_date.filter(|s| !s.is_empty()),
        end_date: input.end_date.filter(|s| !s.is_empty()),
        created_at: String::new(),
    };
    db::insert_cycle(&conn, &c)?;
    Ok(c)
}

#[tauri::command]
pub fn delete_cycle(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_cycle(&conn, &id)
}

// ---------- comments ----------

#[tauri::command]
pub fn list_comments(state: State<'_, AppState>, issueId: String) -> Result<Vec<Comment>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::list_comments(&conn, &issueId)
}

#[tauri::command]
pub fn add_comment(state: State<'_, AppState>, input: NewComment) -> Result<Comment, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let author = db::get_setting(&conn, "display_name")?
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "我".to_string());
    let c = Comment {
        id: uuid::Uuid::new_v4().to_string(),
        issue_id: input.issue_id,
        author,
        body: input.body,
        created_at: String::new(),
    };
    db::insert_comment(&conn, &c)?;
    conn.query_row(
        "SELECT * FROM comments WHERE id = ?1",
        [&c.id],
        |row| {
            Ok(Comment {
                id: row.get("id")?,
                issue_id: row.get("issue_id")?,
                author: row.get("author")?,
                body: row.get("body")?,
                created_at: row.get("created_at")?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_comment(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_comment(&conn, &id)
}

// ---------- attachments ----------

#[tauri::command]
pub fn list_attachments(
    state: State<'_, AppState>,
    issueId: String,
) -> Result<Vec<Attachment>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM attachments WHERE issue_id = ?1 ORDER BY created_at ASC, rowid ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&issueId], |row| {
            Ok(Attachment {
                id: row.get("id")?,
                issue_id: row.get("issue_id")?,
                name: row.get("name")?,
                size: row.get("size")?,
                path: row.get("path")?,
                created_at: row.get("created_at")?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_attachment(state: State<'_, AppState>, input: NewAttachment) -> Result<Attachment, String> {
    use base64::Engine as _;
    let data = base64::engine::general_purpose::STANDARD
        .decode(input.data_base64.as_bytes())
        .map_err(|e| e.to_string())?;
    let safe_name: String = input
        .name
        .replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_");
    let dir = state.data_dir.join("attachments").join(&input.issue_id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let fname = format!("{}_{}", uuid::Uuid::new_v4().simple(), safe_name);
    let full = dir.join(&fname);
    std::fs::write(&full, &data).map_err(|e| e.to_string())?;

    let att = Attachment {
        id: uuid::Uuid::new_v4().to_string(),
        issue_id: input.issue_id,
        name: safe_name,
        size: data.len() as i64,
        path: full.to_string_lossy().to_string(),
        created_at: String::new(),
    };
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::insert_attachment(&conn, &att)?;
    db::get_attachment(&conn, &att.id)
}

#[tauri::command]
pub fn delete_attachment(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let path = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::delete_attachment(&conn, &id)?
    };
    std::fs::remove_file(&path).ok();
    Ok(())
}

// ---------- settings ----------

#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_setting(&conn, &key)
}

#[tauri::command]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::set_setting(&conn, &key, &value)
}

// ---------- github ----------

#[tauri::command]
pub async fn github_sync(
    state: State<'_, AppState>,
    issueId: String,
    repo: String,
    number: i64,
) -> Result<Issue, String> {
    let token = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::get_setting(&conn, "github_token")?
    };
    let repo_ref = repo.clone();
    let info = tauri::async_runtime::spawn_blocking(move || {
        github::fetch_issue(&repo_ref, number, token)
    })
    .await
    .map_err(|e| e.to_string())??;

    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let mut it = db::get_issue(&conn, &issueId)?;
        it.gh_repo = Some(repo.clone());
        it.gh_number = Some(number);
        it.gh_state = Some(info.state.clone());
        it.gh_title = if info.title.is_empty() { None } else { Some(info.title.clone()) };
        it.gh_url = if info.url.is_empty() { None } else { Some(info.url.clone()) };
        db::update_issue_full(&conn, &it)?;
    }
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_issue(&conn, &issueId)
}
