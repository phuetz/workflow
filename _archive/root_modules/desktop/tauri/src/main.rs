/**
 * Workflow Desktop Application - Tauri Main
 * High-performance native desktop app with Rust backend
 */

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use anyhow::Result;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{
    AppHandle, CustomMenuItem, Manager, State, SystemTray, SystemTrayEvent,
    SystemTrayMenu, SystemTrayMenuItem, Window, WindowEvent,
};
use uuid::Uuid;

mod commands;
mod database;
mod encryption;
mod workflow_engine;
mod websocket_client;

use commands::*;
use database::Database;
use workflow_engine::WorkflowEngine;
use websocket_client::WebSocketClient;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub machine_id: String,
    pub auth_token: Option<String>,
    pub user_preferences: UserPreferences,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    pub theme: String,
    pub auto_save: bool,
    pub notifications: bool,
    pub shortcuts: bool,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            theme: "auto".to_string(),
            auto_save: true,
            notifications: true,
            shortcuts: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub nodes: Vec<WorkflowNode>,
    pub edges: Vec<WorkflowEdge>,
    pub status: WorkflowStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    pub id: String,
    pub node_type: String,
    pub position: Position,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub source_handle: Option<String>,
    pub target_handle: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WorkflowStatus {
    Draft,
    Active,
    Paused,
    Archived,
}

fn create_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let create_workflow = CustomMenuItem::new("create_workflow".to_string(), "Create Workflow");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(create_workflow)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    SystemTray::new().with_menu(tray_menu)
}

fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();
    
    // Get machine ID
    let machine_id = machine_uid::get().unwrap_or_else(|_| Uuid::new_v4().to_string());
    
    // Initialize app state
    let app_state = Arc::new(Mutex::new(AppState {
        machine_id,
        auth_token: None,
        user_preferences: UserPreferences::default(),
    }));
    
    // Build Tauri app
    tauri::Builder::default()
        .manage(app_state)
        .system_tray(create_tray())
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "create_workflow" => {
                    let window = app.get_window("main").unwrap();
                    window.emit("create-workflow", ()).unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            // Initialize database
            let db_path = app
                .path_resolver()
                .app_data_dir()
                .unwrap()
                .join("workflows.db");
            
            let db = Database::new(&db_path)?;
            app.manage(Arc::new(Mutex::new(db)));
            
            // Initialize workflow engine
            let engine = WorkflowEngine::new();
            app.manage(Arc::new(Mutex::new(engine)));
            
            // Initialize WebSocket client
            let ws_client = WebSocketClient::new("wss://api.workflow.com/ws");
            app.manage(Arc::new(Mutex::new(ws_client)));
            
            // Set up window event handlers
            let main_window = app.get_window("main").unwrap();
            
            main_window.on_window_event(move |event| match event {
                WindowEvent::CloseRequested { api, .. } => {
                    #[cfg(target_os = "macos")]
                    {
                        api.prevent_close();
                        let window = main_window.clone();
                        window.hide().unwrap();
                    }
                }
                _ => {}
            });
            
            // Register global shortcuts
            if let Ok(mut shortcuts) = app.global_shortcut_manager() {
                shortcuts
                    .register("CmdOrCtrl+Shift+W", move || {
                        if let Some(window) = app.get_window("main") {
                            if window.is_visible().unwrap() {
                                window.hide().unwrap();
                            } else {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                    })
                    .unwrap();
                
                shortcuts
                    .register("CmdOrCtrl+Shift+N", move || {
                        if let Some(window) = app.get_window("main") {
                            window.emit("quick-create-workflow", ()).unwrap();
                        }
                    })
                    .unwrap();
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            login,
            logout,
            get_auth_status,
            
            // Workflow commands
            create_workflow,
            get_workflows,
            get_workflow,
            update_workflow,
            delete_workflow,
            execute_workflow,
            stop_workflow,
            
            // Node commands
            get_node_types,
            validate_node_config,
            
            // System commands
            get_system_info,
            get_machine_id,
            
            // Preferences commands
            get_preferences,
            update_preferences,
            
            // File operations
            export_workflow,
            import_workflow,
            
            // Encryption
            encrypt_data,
            decrypt_data,
            
            // WebSocket
            connect_websocket,
            disconnect_websocket,
            send_websocket_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Command implementations
#[tauri::command]
async fn login(
    username: String,
    password: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<String, String> {
    // TODO: Implement actual authentication
    let token = format!("token_{}", Uuid::new_v4());
    state.lock().auth_token = Some(token.clone());
    Ok(token)
}

#[tauri::command]
async fn logout(state: State<'_, Arc<Mutex<AppState>>>) -> Result<(), String> {
    state.lock().auth_token = None;
    Ok(())
}

#[tauri::command]
async fn get_auth_status(state: State<'_, Arc<Mutex<AppState>>>) -> Result<bool, String> {
    Ok(state.lock().auth_token.is_some())
}

#[tauri::command]
async fn create_workflow(
    name: String,
    description: Option<String>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Workflow, String> {
    let workflow = Workflow {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        nodes: vec![],
        edges: vec![],
        status: WorkflowStatus::Draft,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };
    
    db.lock()
        .create_workflow(&workflow)
        .map_err(|e| e.to_string())?;
    
    Ok(workflow)
}

#[tauri::command]
async fn get_workflows(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Workflow>, String> {
    db.lock()
        .get_workflows()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_workflow(
    id: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Workflow, String> {
    db.lock()
        .get_workflow(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_workflow(
    workflow: Workflow,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    db.lock()
        .update_workflow(&workflow)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_workflow(
    id: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    db.lock()
        .delete_workflow(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn execute_workflow(
    id: String,
    engine: State<'_, Arc<Mutex<WorkflowEngine>>>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<String, String> {
    let workflow = db.lock()
        .get_workflow(&id)
        .map_err(|e| e.to_string())?;
    
    let execution_id = engine.lock()
        .execute_workflow(&workflow)
        .map_err(|e| e.to_string())?;
    
    Ok(execution_id)
}

#[tauri::command]
async fn stop_workflow(
    execution_id: String,
    engine: State<'_, Arc<Mutex<WorkflowEngine>>>,
) -> Result<(), String> {
    engine.lock()
        .stop_execution(&execution_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    use sysinfo::{System, SystemExt, CpuExt};
    
    let mut sys = System::new_all();
    sys.refresh_all();
    
    Ok(serde_json::json!({
        "hostname": sys.host_name(),
        "os": sys.name(),
        "os_version": sys.os_version(),
        "kernel_version": sys.kernel_version(),
        "cpu": sys.cpus()[0].brand(),
        "cpu_count": sys.cpus().len(),
        "total_memory": sys.total_memory(),
        "used_memory": sys.used_memory(),
        "total_swap": sys.total_swap(),
        "used_swap": sys.used_swap(),
    }))
}

#[tauri::command]
async fn get_machine_id(state: State<'_, Arc<Mutex<AppState>>>) -> Result<String, String> {
    Ok(state.lock().machine_id.clone())
}

#[tauri::command]
async fn get_preferences(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<UserPreferences, String> {
    Ok(state.lock().user_preferences.clone())
}

#[tauri::command]
async fn update_preferences(
    preferences: UserPreferences,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    state.lock().user_preferences = preferences;
    Ok(())
}

#[tauri::command]
async fn encrypt_data(data: String, key: String) -> Result<String, String> {
    encryption::encrypt(&data, &key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn decrypt_data(data: String, key: String) -> Result<String, String> {
    encryption::decrypt(&data, &key).map_err(|e| e.to_string())
}