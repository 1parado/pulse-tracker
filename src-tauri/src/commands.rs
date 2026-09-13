use tauri::{AppHandle, State};

use crate::db;
use crate::github;
use crate::models::*;
use crate::notes;
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
pub fn delete_issue(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    let paths = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::delete_issue_rows(&conn, &id)?
    };
    for p in paths {
        std::fs::remove_file(&p).ok();
    }
    // 问题删除后同步收起其桌面便签
    let pinned = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let pinned = notes::list(&conn)?.iter().any(|x| x == &id);
        if pinned {
            notes::remove(&conn, &id)?;
        }
        pinned
    };
    if pinned {
        notes::close_window(&app, &id);
    }
    Ok(())
}

#[tauri::command]
pub fn get_issue(state: State<'_, AppState>, id: String) -> Result<Issue, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_issue(&conn, &id)
}

#[tauri::command]
pub fn search_issues(state: State<'_, AppState>, query: String) -> Result<Vec<Issue>, String> {
    let q = query.trim().to_string();
    if q.is_empty() {
        return Ok(Vec::new());
    }
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::search_issues(&conn, &q)
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

#[tauri::command]
pub fn update_project(state: State<'_, AppState>, input: UpdateProject) -> Result<Project, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut p = db::get_project(&conn, &input.id)?
        .ok_or_else(|| "project not found".to_string())?;
    p.name = input.name.trim().to_string();
    p.prefix = input.prefix.trim().to_ascii_uppercase();
    p.color = input.color;
    p.description = input.description;
    db::update_project(&conn, &p)?;
    Ok(p)
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

#[tauri::command]
pub fn update_cycle(state: State<'_, AppState>, input: UpdateCycle) -> Result<Cycle, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let old = db::get_cycle(&conn, &input.id)?;
    let c = Cycle {
        id: input.id,
        project_id: input.project_id,
        name: input.name.trim().to_string(),
        start_date: input.start_date.filter(|s| !s.is_empty()),
        end_date: input.end_date.filter(|s| !s.is_empty()),
        created_at: old.created_at,
    };
    // 周期换了所属项目时，原挂靠问题脱离该周期，避免跨项目错挂
    if old.project_id != c.project_id {
        db::detach_issues_from_cycle(&conn, &c.id)?;
    }
    db::update_cycle(&conn, &c)?;
    Ok(c)
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
        gh_id: None,
    };
    db::insert_comment(&conn, &c)?;
    db::get_comment(&conn, &c.id)
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
    if data.len() > 20 * 1024 * 1024 {
        return Err("附件不能超过 20MB".to_string());
    }
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

/// 本地状态 → 远端 issue 状态
fn local_to_gh_state(status: &str) -> &'static str {
    if status == "done" || status == "canceled" {
        "closed"
    } else {
        "open"
    }
}

/// 双向同步：拉取元数据/评论入库，推送本地状态与未同步评论到远端（本地为准）。
/// repo/number 缺省时使用已链接的远端信息。
#[tauri::command]
pub async fn github_sync(
    state: State<'_, AppState>,
    issueId: String,
    repo: Option<String>,
    number: Option<i64>,
) -> Result<Issue, String> {
    // 1. 锁内收集输入（不跨 await 持锁）
    let (repo_v, number_v, local_status, unsynced, token) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let it = db::get_issue(&conn, &issueId)?;
        let repo_v = match repo {
            Some(r) => r,
            None => it
                .gh_repo
                .clone()
                .ok_or_else(|| "该问题尚未链接 GitHub issue".to_string())?,
        };
        let number_v = match number {
            Some(n) => n,
            None => it.gh_number.ok_or_else(|| "缺少 GitHub issue 编号".to_string())?,
        };
        let token = db::get_setting(&conn, "github_token")?;
        let unsynced = db::unsynced_comments(&conn, &issueId)?;
        (repo_v, number_v, it.status, unsynced, token)
    };

    // 2. 拉取远端元数据
    let info = {
        let repo_ref = repo_v.clone();
        let token_ref = token.clone();
        tauri::async_runtime::spawn_blocking(move || {
            github::fetch_issue(&repo_ref, number_v, token_ref)
        })
        .await
        .map_err(|e| e.to_string())??
    };

    // 3. 状态对齐（本地为准；失败不打断，下次同步重试）
    let want_state = local_to_gh_state(&local_status);
    let state_pushed = if info.state != want_state {
        let repo_ref = repo_v.clone();
        let token_ref = token.clone();
        let res = tauri::async_runtime::spawn_blocking(move || {
            github::push_state(&repo_ref, number_v, want_state, token_ref.as_deref())
        })
        .await;
        res.map(|r| r.is_ok()).unwrap_or(false)
    } else {
        false
    };
    let state_now = if state_pushed {
        want_state.to_string()
    } else {
        info.state.clone()
    };

    // 4. 推送本地未同步评论（逐条成功即回填 gh_id，避免重试重复发送；单条失败即停）
    let mut pushed: Vec<(String, i64)> = Vec::new();
    let mut push_err: Option<String> = None;
    for c in &unsynced {
        let repo_ref = repo_v.clone();
        let token_ref = token.clone();
        let body = c.body.clone();
        let res = tauri::async_runtime::spawn_blocking(move || {
            github::push_comment(&repo_ref, number_v, &body, token_ref.as_deref())
        })
        .await
        .map_err(|e| e.to_string());
        match res {
            Ok(Ok(gid)) => pushed.push((c.id.clone(), gid)),
            Ok(Err(e)) => {
                push_err = Some(format!("推送评论失败：{}", e));
                break;
            }
            Err(e) => {
                push_err = Some(format!("推送评论失败：{}", e));
                break;
            }
        }
    }

    // 5. 拉取远端评论（失败不阻断已完成的推送）
    let remote_comments = {
        let repo_ref = repo_v.clone();
        let token_ref = token.clone();
        tauri::async_runtime::spawn_blocking(move || {
            github::list_comments(&repo_ref, number_v, token_ref.as_deref())
        })
        .await
        .map_err(|e| e.to_string())?
    };

    // 6. 锁内写回
    let issue = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let mut it = db::get_issue(&conn, &issueId)?;
        it.gh_repo = Some(repo_v);
        it.gh_number = Some(number_v);
        it.gh_state = Some(state_now);
        it.gh_title = if info.title.is_empty() { None } else { Some(info.title) };
        it.gh_url = if info.url.is_empty() { None } else { Some(info.url) };
        db::update_issue_full(&conn, &it)?;

        for (cid, gid) in &pushed {
            db::set_comment_gh_id(&conn, cid, *gid)?;
        }
        if let Ok(comments) = &remote_comments {
            for gc in comments {
                if !db::get_comments_by_gh_id(&conn, &issueId, gc.id)? {
                    let c = Comment {
                        id: uuid::Uuid::new_v4().to_string(),
                        issue_id: issueId.clone(),
                        author: gc
                            .user
                            .as_ref()
                            .map(|u| format!("gh:{}", u.login))
                            .unwrap_or_else(|| "gh:unknown".to_string()),
                        body: gc.body.clone(),
                        created_at: gc.created_at.clone(),
                        gh_id: Some(gc.id),
                    };
                    db::insert_comment(&conn, &c)?;
                }
            }
        }
        db::get_issue(&conn, &issueId)?
    };
    match push_err {
        Some(e) => Err(e),
        None => Ok(issue),
    }
}

/// 把本地问题推送到 GitHub 新建 issue 并建立链接。
#[tauri::command]
pub async fn github_push_issue(
    state: State<'_, AppState>,
    issueId: String,
    repo: String,
) -> Result<Issue, String> {
    let (title, body, token) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let it = db::get_issue(&conn, &issueId)?;
        if it.gh_repo.is_some() {
            return Err("该问题已链接 GitHub issue".to_string());
        }
        let token = db::get_setting(&conn, "github_token")?;
        (it.title, it.description, token)
    };
    if token.as_deref().map(|t| t.trim().is_empty()).unwrap_or(true) {
        return Err("推送需要 GitHub Token，请先在设置中填写".to_string());
    }

    let info = tauri::async_runtime::spawn_blocking(move || {
        github::create_issue(&repo, &title, &body, token.as_deref())
    })
    .await
    .map_err(|e| e.to_string())??;

    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let mut it = db::get_issue(&conn, &issueId)?;
        it.gh_repo = Some(repo);
        it.gh_number = Some(info.number);
        it.gh_state = Some(info.state);
        it.gh_title = if info.title.is_empty() { None } else { Some(info.title) };
        it.gh_url = if info.url.is_empty() { None } else { Some(info.url) };
        db::update_issue_full(&conn, &it)?;
        db::get_issue(&conn, &issueId)
    }
}

// ---------- sticky notes（桌面便签） ----------

#[tauri::command]
pub fn list_sticky_notes(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    notes::list(&conn)
}

#[tauri::command]
pub fn open_sticky_note(
    app: AppHandle,
    state: State<'_, AppState>,
    issueId: String,
) -> Result<(), String> {
    // 校验问题存在；建窗口时不持锁（窗口创建可能阻塞）
    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::get_issue(&conn, &issueId)?;
    }
    notes::open(&app, &issueId)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    notes::add(&conn, &issueId)
}

#[tauri::command]
pub fn close_sticky_note(
    app: AppHandle,
    state: State<'_, AppState>,
    issueId: String,
) -> Result<(), String> {
    notes::close_window(&app, &issueId);
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    notes::remove(&conn, &issueId)
}
