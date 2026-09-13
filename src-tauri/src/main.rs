#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod github;
mod models;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub conn: Mutex<rusqlite::Connection>,
    pub data_dir: std::path::PathBuf,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(dir.join("attachments")).ok();
            let conn =
                db::init(&dir.join("pulse.db")).map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
            app.manage(AppState {
                conn: Mutex::new(conn),
                data_dir: dir,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_issues,
            commands::create_issue,
            commands::update_issue,
            commands::delete_issue,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
