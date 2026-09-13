#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod github;
mod models;
mod notes;

use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

pub struct AppState {
    pub conn: Mutex<rusqlite::Connection>,
    pub data_dir: std::path::PathBuf,
}

/// 显示并聚焦主窗口
fn show_main<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(dir.join("attachments")).ok();
            let conn = db::init(&dir.join("pulse.db"))
                .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
            app.manage(AppState {
                conn: Mutex::new(conn),
                data_dir: dir,
            });

            // 主窗点 X → 隐藏到托盘（便签继续驻留），退出走托盘菜单
            if let Some(main_win) = app.get_webview_window("main") {
                let win = main_win.clone();
                main_win.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
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

            // 全局快捷键：Ctrl+Shift+Space 切换主窗显隐，Ctrl+Shift+Alt+N 快速新建问题
            let gs = app.global_shortcut();
            gs.on_shortcut("ctrl+shift+space", |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Some(win) = app.get_webview_window("main") {
                        let visible =
                            win.is_visible().unwrap_or(false) && !win.is_minimized().unwrap_or(false);
                        if visible {
                            let _ = win.hide();
                        } else {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                }
            })?;
            gs.on_shortcut("ctrl+shift+alt+n", |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    show_main(app);
                    let _ = app.emit("tray://new-issue", ());
                }
            })?;

            // 系统托盘：左键切换主窗显隐，右键菜单
            let show = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let new_issue = MenuItem::with_id(app, "new_issue", "新建问题", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出 Pulse", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &new_issue, &quit])?;

            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or("missing default window icon")?;
            TrayIconBuilder::with_id("pulse-tray")
                .icon(icon)
                .tooltip("Pulse")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => show_main(app),
                    "new_issue" => {
                        show_main(app);
                        let _ = app.emit("tray://new-issue", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let visible = win.is_visible().unwrap_or(false);
                            if visible {
                                let _ = win.hide();
                            } else {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_issues,
            commands::create_issue,
            commands::update_issue,
            commands::delete_issue,
            commands::get_issue,
            commands::search_issues,
            commands::list_projects,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            commands::list_cycles,
            commands::create_cycle,
            commands::update_cycle,
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
            commands::github_push_issue,
            commands::list_sticky_notes,
            commands::open_sticky_note,
            commands::close_sticky_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
