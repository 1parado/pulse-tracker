use rusqlite::Connection;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

const SETTING_KEY: &str = "sticky_notes";

/// 便签窗口统一命名：sticky-<issue_id>，前端据此渲染便签组件
pub fn label_for(issue_id: &str) -> String {
    format!("sticky-{}", issue_id)
}

/// 钉在桌面的 issue id 列表（settings 表存 JSON 数组）
pub fn list(conn: &Connection) -> Result<Vec<String>, String> {
    let raw = crate::db::get_setting(conn, SETTING_KEY)?.unwrap_or_else(|| "[]".to_string());
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn save(conn: &Connection, ids: &[String]) -> Result<(), String> {
    let raw = serde_json::to_string(ids).map_err(|e| e.to_string())?;
    crate::db::set_setting(conn, SETTING_KEY, &raw)
}

pub fn add(conn: &Connection, issue_id: &str) -> Result<(), String> {
    let mut ids = list(conn)?;
    if !ids.iter().any(|x| x == issue_id) {
        ids.push(issue_id.to_string());
        save(conn, &ids)?;
    }
    Ok(())
}

pub fn remove(conn: &Connection, issue_id: &str) -> Result<(), String> {
    let mut ids = list(conn)?;
    let before = ids.len();
    ids.retain(|x| x != issue_id);
    if ids.len() != before {
        save(conn, &ids)?;
    }
    Ok(())
}

/// 创建（或聚焦）便签窗口。内容复用 index.html，前端按 label 分支渲染。
pub fn open(app: &AppHandle, issue_id: &str) -> Result<(), String> {
    let label = label_for(issue_id);
    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.set_focus();
        return Ok(());
    }
    let win = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("Pulse 便签")
        .inner_size(320.0, 232.0)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .build()
        .map_err(|e| e.to_string())?;

    // 窗口被系统关闭（如 Alt+F4）时同步清理持久化列表
    let handle = app.clone();
    let id = issue_id.to_string();
    win.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            if let Some(state) = handle.try_state::<crate::AppState>() {
                if let Ok(conn) = state.conn.lock() {
                    let _ = remove(&conn, &id);
                }
            }
        }
    });
    Ok(())
}

pub fn close_window(app: &AppHandle, issue_id: &str) {
    if let Some(win) = app.get_webview_window(&label_for(issue_id)) {
        let _ = win.close();
    }
}
