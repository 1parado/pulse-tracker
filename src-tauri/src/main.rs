#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod github;
mod models;
mod notes;

use std::sync::Mutex;
use tauri::{Manager, WindowEvent};

pub struct AppState {
    pub conn: Mutex<rusqlite::Connection>,
    pub data_dir: std::path::PathBuf,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(dir.join("attachments")).ok();
            let conn = db::init(&dir.join("pulse.db"))
                .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
            app.manage(AppState {
                conn: Mutex::new(conn),
                data_dir: dir,
            });

            // 主窗口关闭即整体退出（即使还有便签窗口开着），避免无托盘时的孤儿进程
            if let Some(main_win) = app.get_webview_window("main") {
                let handle = app.handle().clone();
                main_win.on_window_event(move |event| {
                    if let WindowEvent::Destroyed = event {
                        handle.exit(0);
                    }
                });
            }

            // 恢复上次钉在桌面的便签（受限作用域内取锁，读完立刻释放）
            let ids: Vec<String> = {
                let state = app.state::<AppState>();
                let conn = state.conn.lock().map_err(|e| e.to_string())?;
                notes::list(&conn)?
            };
            for id in ids {
                let _ = notes::open(app.handle(), &id);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_issues,
            commands::create_issue,
            commands::update_issue,
            commands::delete_issue,
            commands::get_issue,
            commands::list_projects,
            commands::create_project,
            commands::delete_project,
            commands::list_cycles,
            commands::create_cycle,
            commands::delete_cycle,
            commands::list_comments,
            commands::add_comment,
            commands::delete_comment,
            commands::add_attachment,
            commands::list_attachments,
            commands::delete_attachment,
            commands::get_setting,
            commands::set_setting,
            commands::github_sync,
            commands::list_sticky_notes,
            commands::open_sticky_note,
            commands::close_sticky_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
