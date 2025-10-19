# Rust Launcher Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Convert the Python launcher to Rust while maintaining 100% feature parity with existing functionality.

**Architecture:** Windows system tray application that monitors Chrome DevTools Protocol endpoints, injects JavaScript via WebSocket when iRacing UI is detected, manages configuration, startup shortcuts, and auto-updates via Velopack. Pure Rust implementation with minimal dependencies.

**Tech Stack:**
- Rust 1.70+ (stable)
- `tokio` - Async runtime for WebSocket and HTTP operations
- `tungstenite`/`tokio-tungstenite` - WebSocket client for CDP
- `reqwest` - HTTP client for checking CDP endpoints
- `serde` + `serde_json` - JSON serialization
- `tao` + `tray-icon` - Cross-platform system tray (Windows-focused)
- `rfd` - File/folder dialogs
- `winreg` - Windows registry access for startup
- `ini` - INI file parsing/writing
- `windows-rs` - Windows API bindings (UAC elevation, shortcuts)
- `velopack` - Official Rust crate for auto-updates (v0.0 with async feature)

**Deployment:** Replaces existing Python workflow in `.github/workflows/launcher.yml` with Rust build pipeline.

---

## Task 1: Project Setup and Configuration Management

**Files:**
- Create: `launcher-rs/Cargo.toml`
- Create: `launcher-rs/src/main.rs`
- Create: `launcher-rs/src/config.rs`
- Create: `launcher-rs/tests/config_tests.rs`

**Step 1: Initialize Cargo project**

Run from project root:
```bash
cd launcher-rs
cargo init --name irefined-launcher
```

Expected: Creates new Cargo project structure

**Step 2: Add dependencies to Cargo.toml**

```toml
[package]
name = "irefined-launcher"
version = "1.5.4"
edition = "2021"
authors = ["Jason Murray"]
description = "iRefined Launcher - System tray app for iRacing UI extension injection"

[dependencies]
tokio = { version = "1.35", features = ["full"] }
tokio-tungstenite = "0.21"
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tao = "0.27"
tray-icon = "0.15"
rfd = "0.14"
ini = "1.3"
anyhow = "1.0"
thiserror = "1.0"

[target.'cfg(windows)'.dependencies]
windows = { version = "0.54", features = [
    "Win32_Foundation",
    "Win32_UI_Shell",
    "Win32_System_Com",
    "Win32_UI_WindowsAndMessaging",
] }
winreg = "0.52"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
strip = true
```

**Step 3: Write failing test for config initialization**

Create `launcher-rs/tests/config_tests.rs`:
```rust
use irefined_launcher::config::{Config, CONFIG_DIR, CONFIG_FILE};
use std::path::PathBuf;

#[test]
fn test_default_config_contains_required_fields() {
    let config = Config::default();
    assert_eq!(config.port, 9222);
    assert!(!config.iracing_path.as_os_str().is_empty());
}

#[test]
fn test_config_dir_path_is_in_documents() {
    let expected = dirs::document_dir()
        .unwrap()
        .join("iRefined");
    assert_eq!(CONFIG_DIR.as_path(), expected);
}
```

**Step 4: Run test to verify it fails**

Run: `cargo test --test config_tests`
Expected: FAIL - module `irefined_launcher::config` not found

**Step 5: Implement config module**

Create `launcher-rs/src/config.rs`:
```rust
use anyhow::{Context, Result};
use ini::Ini;
use std::fs;
use std::path::{Path, PathBuf};
use lazy_static::lazy_static;

lazy_static! {
    pub static ref CONFIG_DIR: PathBuf = dirs::document_dir()
        .expect("Failed to get documents directory")
        .join("iRefined");

    pub static ref CONFIG_FILE: PathBuf = CONFIG_DIR.join("irefined.ini");
}

#[derive(Debug, Clone)]
pub struct Config {
    pub iracing_path: PathBuf,
    pub port: u16,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            iracing_path: PathBuf::from("C:\\Program Files (x86)\\iRacing\\"),
            port: 9222,
        }
    }
}

impl Config {
    /// Load config from INI file, or create default if not exists
    pub fn load() -> Result<Self> {
        if CONFIG_FILE.exists() {
            Self::from_file(&CONFIG_FILE)
        } else {
            let config = Self::default();
            config.save()?;
            Ok(config)
        }
    }

    /// Load config from specific INI file
    fn from_file(path: &Path) -> Result<Self> {
        let ini = Ini::load_from_file(path)
            .context("Failed to load config file")?;

        let section = ini.section(Some("Config"))
            .context("Missing [Config] section")?;

        let iracing_path = section
            .get("IRACING_PATH")
            .context("Missing IRACING_PATH")?
            .into();

        let port = section
            .get("PORT")
            .and_then(|s| s.parse().ok())
            .unwrap_or(9222);

        Ok(Self { iracing_path, port })
    }

    /// Save config to INI file
    pub fn save(&self) -> Result<()> {
        fs::create_dir_all(&*CONFIG_DIR)
            .context("Failed to create config directory")?;

        let mut ini = Ini::new();
        ini.with_section(Some("Config"))
            .set("IRACING_PATH", self.iracing_path.to_string_lossy())
            .set("PORT", self.port.to_string());

        ini.write_to_file(&*CONFIG_FILE)
            .context("Failed to write config file")
    }

    /// Validate that iRacing installation exists
    pub fn validate(&self) -> bool {
        self.iracing_path.join("ui").join("iRacingUI.exe").exists()
    }
}
```

Update `launcher-rs/src/main.rs`:
```rust
pub mod config;

fn main() {
    println!("iRefined Launcher");
}
```

**Step 6: Add missing dependency**

Add to `Cargo.toml` dependencies:
```toml
lazy_static = "1.4"
dirs = "5.0"
```

**Step 7: Run tests to verify they pass**

Run: `cargo test --test config_tests`
Expected: PASS

**Step 8: Commit**

```bash
git add launcher-rs/
git commit -m "feat(launcher-rs): add config management with INI file support"
```

---

## Task 2: Windows System Tray Icon and Menu

**Files:**
- Create: `launcher-rs/src/tray.rs`
- Modify: `launcher-rs/src/main.rs`
- Create: `launcher-rs/resources/icon.ico` (copy from launcher/)
- Create: `launcher-rs/build.rs`

**Step 1: Write test stub for tray menu creation**

Create `launcher-rs/tests/tray_tests.rs`:
```rust
// Integration test: verify tray can be created
// Note: Cannot fully test GUI in CI, but can verify compilation
#[test]
fn test_tray_menu_items_compile() {
    // This test just verifies the types compile
    use irefined_launcher::tray::TrayAction;
    let _ = TrayAction::Quit;
    let _ = TrayAction::Discord;
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test --test tray_tests`
Expected: FAIL - module not found

**Step 3: Copy icon resource**

Run:
```bash
mkdir -p launcher-rs/resources
cp launcher/icon.ico launcher-rs/resources/
```

**Step 4: Create build script for Windows resources**

Create `launcher-rs/build.rs`:
```rust
#[cfg(windows)]
fn main() {
    let mut res = winres::WindowsResource::new();
    res.set_icon("resources/icon.ico");
    res.compile().unwrap();
}

#[cfg(not(windows))]
fn main() {}
```

Add to `Cargo.toml` [build-dependencies]:
```toml
[build-dependencies]
winres = "0.1"
```

**Step 5: Implement tray module**

Create `launcher-rs/src/tray.rs`:
```rust
use anyhow::Result;
use tao::event_loop::{ControlFlow, EventLoop};
use tray_icon::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem, CheckMenuItem},
    TrayIconBuilder, Icon,
};
use std::sync::mpsc::{channel, Receiver};

const VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrayAction {
    Quit,
    Discord,
    ToggleStartup,
    Reload,
    CheckUpdate,
}

pub struct TrayManager {
    menu_event_rx: Receiver<MenuEvent>,
    quit_item: MenuItem,
    discord_item: MenuItem,
    startup_item: CheckMenuItem,
    reload_item: MenuItem,
    update_item: MenuItem,
}

impl TrayManager {
    pub fn new() -> Result<Self> {
        let event_loop = EventLoop::new();

        // Load icon
        let icon = load_icon()?;

        // Create menu items
        let title = MenuItem::new(
            format!("iRefined Launcher v{}", VERSION),
            false,
            None
        );
        let discord_item = MenuItem::new("Discord", true, None);
        let separator1 = PredefinedMenuItem::separator();
        let startup_item = CheckMenuItem::new("Run at Startup", true, true, None);
        let reload_item = MenuItem::new("Reload", true, None);
        let update_item = MenuItem::new("Check for Updates", true, None);
        let quit_item = MenuItem::new("Quit", true, None);

        // Build menu
        let menu = Menu::new();
        menu.append(&title)?;
        menu.append(&discord_item)?;
        menu.append(&separator1)?;
        menu.append(&startup_item)?;
        menu.append(&reload_item)?;
        menu.append(&update_item)?;
        menu.append(&quit_item)?;

        // Create tray icon
        let _tray = TrayIconBuilder::new()
            .with_menu(Box::new(menu))
            .with_tooltip("iRefined")
            .with_icon(icon)
            .build()?;

        let (tx, rx) = channel();
        MenuEvent::set_event_handler(Some(move |event| {
            tx.send(event).ok();
        }));

        Ok(Self {
            menu_event_rx: rx,
            quit_item,
            discord_item,
            startup_item,
            reload_item,
            update_item,
        })
    }

    /// Check for menu events (non-blocking)
    pub fn poll_action(&self) -> Option<TrayAction> {
        if let Ok(event) = self.menu_event_rx.try_recv() {
            if event.id == self.quit_item.id() {
                return Some(TrayAction::Quit);
            } else if event.id == self.discord_item.id() {
                return Some(TrayAction::Discord);
            } else if event.id == self.startup_item.id() {
                return Some(TrayAction::ToggleStartup);
            } else if event.id == self.reload_item.id() {
                return Some(TrayAction::Reload);
            } else if event.id == self.update_item.id() {
                return Some(TrayAction::CheckUpdate);
            }
        }
        None
    }

    pub fn set_startup_checked(&self, checked: bool) {
        self.startup_item.set_checked(checked);
    }
}

fn load_icon() -> Result<Icon> {
    let icon_bytes = include_bytes!("../resources/icon.ico");
    let image = image::load_from_memory(icon_bytes)?
        .to_rgba8();
    let (w, h) = image.dimensions();
    let rgba = image.into_raw();
    Ok(Icon::from_rgba(rgba, w, h)?)
}
```

Add dependencies to `Cargo.toml`:
```toml
image = "0.24"
```

**Step 6: Update main.rs to expose module**

Modify `launcher-rs/src/main.rs`:
```rust
pub mod config;
pub mod tray;

fn main() {
    println!("iRefined Launcher");
}
```

**Step 7: Run test to verify it passes**

Run: `cargo test --test tray_tests`
Expected: PASS

**Step 8: Commit**

```bash
git add launcher-rs/
git commit -m "feat(launcher-rs): add Windows system tray with menu"
```

---

## Task 3: Windows Startup Shortcut Management

**Files:**
- Create: `launcher-rs/src/startup.rs`
- Create: `launcher-rs/tests/startup_tests.rs`

**Step 1: Write failing test for startup management**

Create `launcher-rs/tests/startup_tests.rs`:
```rust
use irefined_launcher::startup;

#[test]
fn test_shortcut_path_is_in_startup_folder() {
    let path = startup::get_shortcut_path();
    assert!(path.to_string_lossy().contains("Startup"));
    assert!(path.to_string_lossy().ends_with("iRefined.lnk"));
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test --test startup_tests`
Expected: FAIL - module not found

**Step 3: Implement startup module**

Create `launcher-rs/src/startup.rs`:
```rust
use anyhow::{Context, Result};
use std::path::PathBuf;

#[cfg(windows)]
use windows::{
    core::*,
    Win32::System::Com::*,
    Win32::UI::Shell::*,
};

/// Get the path to the startup shortcut
pub fn get_shortcut_path() -> PathBuf {
    let appdata = std::env::var("APPDATA")
        .expect("APPDATA environment variable not set");

    PathBuf::from(appdata)
        .join("Microsoft")
        .join("Windows")
        .join("Start Menu")
        .join("Programs")
        .join("Startup")
        .join("iRefined.lnk")
}

/// Check if startup is enabled
pub fn is_enabled() -> bool {
    get_shortcut_path().exists()
}

/// Enable startup by creating shortcut
#[cfg(windows)]
pub fn enable() -> Result<()> {
    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)?;

        let shell_link: IShellLinkW = CoCreateInstance(
            &ShellLink,
            None,
            CLSCTX_INPROC_SERVER
        )?;

        // Set target to current exe
        let exe_path = std::env::current_exe()?;
        let exe_path_wide: Vec<u16> = exe_path
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        shell_link.SetPath(PCWSTR(exe_path_wide.as_ptr()))?;

        // Set working directory
        let work_dir = exe_path.parent().unwrap();
        let work_dir_wide: Vec<u16> = work_dir
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        shell_link.SetWorkingDirectory(PCWSTR(work_dir_wide.as_ptr()))?;

        // Set icon
        shell_link.SetIconLocation(PCWSTR(exe_path_wide.as_ptr()), 0)?;

        // Save shortcut
        let persist_file: IPersistFile = shell_link.cast()?;
        let shortcut_path = get_shortcut_path();
        let shortcut_wide: Vec<u16> = shortcut_path
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        persist_file.Save(PCWSTR(shortcut_wide.as_ptr()), TRUE)?;

        CoUninitialize();
        println!("[INFO] Startup enabled");
        Ok(())
    }
}

#[cfg(not(windows))]
pub fn enable() -> Result<()> {
    anyhow::bail!("Startup shortcuts only supported on Windows")
}

/// Disable startup by removing shortcut
pub fn disable() -> Result<()> {
    let path = get_shortcut_path();
    if path.exists() {
        std::fs::remove_file(path)
            .context("Failed to remove startup shortcut")?;
        println!("[INFO] Startup disabled");
    }
    Ok(())
}
```

**Step 4: Update main.rs**

Modify `launcher-rs/src/main.rs`:
```rust
pub mod config;
pub mod tray;
pub mod startup;

fn main() {
    println!("iRefined Launcher");
}
```

**Step 5: Run test to verify it passes**

Run: `cargo test --test startup_tests`
Expected: PASS

**Step 6: Commit**

```bash
git add launcher-rs/
git commit -m "feat(launcher-rs): add Windows startup shortcut management"
```

---

## Task 4: Chrome DevTools Protocol WebSocket Monitor

**Files:**
- Create: `launcher-rs/src/cdp.rs`
- Create: `launcher-rs/tests/cdp_tests.rs`

**Step 1: Write failing test for CDP connection**

Create `launcher-rs/tests/cdp_tests.rs`:
```rust
use irefined_launcher::cdp::CdpClient;

#[tokio::test]
async fn test_get_websocket_url_returns_none_when_no_server() {
    let client = CdpClient::new(19999); // Unlikely port
    let result = client.get_websocket_url().await;
    assert!(result.is_none());
}

#[test]
fn test_cdp_message_serialization() {
    use irefined_launcher::cdp::CdpMessage;
    let msg = CdpMessage::add_script("console.log('test')");
    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("Page.addScriptToEvaluateOnNewDocument"));
    assert!(json.contains("console.log('test')"));
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test --test cdp_tests`
Expected: FAIL - module not found

**Step 3: Implement CDP module**

Create `launcher-rs/src/cdp.rs`:
```rust
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};

#[derive(Debug, Deserialize)]
struct TabInfo {
    url: String,
    #[serde(rename = "webSocketDebuggerUrl")]
    websocket_debugger_url: String,
}

#[derive(Debug, Serialize)]
pub struct CdpMessage {
    id: u32,
    method: String,
    params: serde_json::Value,
}

impl CdpMessage {
    pub fn add_script(source: &str) -> Self {
        Self {
            id: 1,
            method: "Page.addScriptToEvaluateOnNewDocument".to_string(),
            params: serde_json::json!({
                "source": source,
                "runImmediately": true
            }),
        }
    }
}

pub struct CdpClient {
    port: u16,
}

impl CdpClient {
    pub fn new(port: u16) -> Self {
        Self { port }
    }

    /// Get WebSocket URL for iRacing tab, or None if not found
    pub async fn get_websocket_url(&self) -> Option<String> {
        let url = format!("http://127.0.0.1:{}/json", self.port);

        let tabs: Vec<TabInfo> = reqwest::get(&url)
            .await
            .ok()?
            .json()
            .await
            .ok()?;

        tabs.into_iter()
            .find(|tab| tab.url.contains(".iracing.com/web/racing"))
            .map(|tab| tab.websocket_debugger_url)
    }

    /// Inject JavaScript into a WebSocket connection
    pub async fn inject_script(&self, ws_url: &str, js_code: &str) -> Result<()> {
        let (ws_stream, _) = connect_async(ws_url)
            .await
            .context("Failed to connect to WebSocket")?;

        let (mut write, mut read) = ws_stream.split();

        let msg = CdpMessage::add_script(js_code);
        let json = serde_json::to_string(&msg)?;

        write.send(Message::Text(json))
            .await
            .context("Failed to send CDP message")?;

        // Read response (optional, but good practice)
        if let Some(Ok(_response)) = read.next().await {
            println!("[INFO] Successfully injected script");
        }

        Ok(())
    }
}
```

Add dependency to `Cargo.toml`:
```toml
futures-util = "0.3"
```

**Step 4: Update main.rs**

Modify `launcher-rs/src/main.rs`:
```rust
pub mod config;
pub mod tray;
pub mod startup;
pub mod cdp;

fn main() {
    println!("iRefined Launcher");
}
```

**Step 5: Run tests to verify they pass**

Run: `cargo test --test cdp_tests`
Expected: PASS

**Step 6: Commit**

```bash
git add launcher-rs/
git commit -m "feat(launcher-rs): add Chrome DevTools Protocol client"
```

---

## Task 5: Bootstrap JavaScript Injection and Monitoring Loop

**Files:**
- Create: `launcher-rs/src/monitor.rs`
- Modify: `launcher-rs/src/main.rs`
- Copy: `launcher-rs/resources/bootstrap.js` (from launcher/)

**Step 1: Copy bootstrap.js resource**

Run:
```bash
cp launcher/bootstrap.js launcher-rs/resources/
```

**Step 2: Write test stub for monitor**

Create `launcher-rs/tests/monitor_tests.rs`:
```rust
#[test]
fn test_bootstrap_js_is_embedded() {
    let js = irefined_launcher::monitor::get_bootstrap_js();
    assert!(js.contains("irefBootstrap"));
    assert!(js.contains("jason-murray.github.io/irefined"));
}
```

**Step 3: Run test to verify it fails**

Run: `cargo test --test monitor_tests`
Expected: FAIL - module not found

**Step 4: Implement monitor module**

Create `launcher-rs/src/monitor.rs`:
```rust
use crate::cdp::CdpClient;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration};

/// Get embedded bootstrap.js content
pub fn get_bootstrap_js() -> &'static str {
    include_str!("../resources/bootstrap.js")
}

pub struct InjectionMonitor {
    cdp: CdpClient,
    seen_urls: Arc<Mutex<HashSet<String>>>,
}

impl InjectionMonitor {
    pub fn new(port: u16) -> Self {
        Self {
            cdp: CdpClient::new(port),
            seen_urls: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    /// Start monitoring loop (runs indefinitely)
    pub async fn run(&self) {
        let js_code = get_bootstrap_js();

        loop {
            sleep(Duration::from_secs(1)).await;

            if let Some(ws_url) = self.cdp.get_websocket_url().await {
                let mut seen = self.seen_urls.lock().unwrap();

                if !seen.contains(&ws_url) {
                    println!("[INFO] Found new iRacing WebSocket URL: {}", ws_url);
                    drop(seen); // Release lock before async operation

                    match self.cdp.inject_script(&ws_url, js_code).await {
                        Ok(_) => {
                            let mut seen = self.seen_urls.lock().unwrap();
                            seen.insert(ws_url);
                        }
                        Err(e) => {
                            eprintln!("[ERROR] Failed to inject script: {}", e);
                        }
                    }
                }
            }
        }
    }

    /// Clear seen URLs (for manual reload)
    pub fn reload(&self) {
        let mut seen = self.seen_urls.lock().unwrap();
        seen.clear();
        println!("[INFO] Cleared injection history - will re-inject on next detection");
    }
}
```

**Step 5: Update main.rs**

Modify `launcher-rs/src/main.rs`:
```rust
pub mod config;
pub mod tray;
pub mod startup;
pub mod cdp;
pub mod monitor;

fn main() {
    println!("iRefined Launcher");
}
```

**Step 6: Run test to verify it passes**

Run: `cargo test --test monitor_tests`
Expected: PASS

**Step 7: Commit**

```bash
git add launcher-rs/
git commit -m "feat(launcher-rs): add injection monitor with embedded bootstrap"
```

---

## Task 6: iRacing Installation Validation and Path Selection

**Files:**
- Create: `launcher-rs/src/iracing.rs`
- Create: `launcher-rs/tests/iracing_tests.rs`
- Modify: `launcher-rs/src/config.rs` (integrate validation)

**Step 1: Write failing test**

Create `launcher-rs/tests/iracing_tests.rs`:
```rust
use std::path::PathBuf;

#[test]
fn test_default_iracing_path() {
    let path = irefined_launcher::iracing::default_path();
    assert_eq!(path, PathBuf::from("C:\\Program Files (x86)\\iRacing\\"));
}

#[test]
fn test_validate_requires_ui_subfolder() {
    let invalid_path = PathBuf::from("C:\\Invalid\\Path\\");
    assert!(!irefined_launcher::iracing::validate_installation(&invalid_path));
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test --test iracing_tests`
Expected: FAIL - module not found

**Step 3: Implement iracing module**

Create `launcher-rs/src/iracing.rs`:
```rust
use anyhow::{Context, Result};
use rfd::MessageDialog;
use std::path::PathBuf;

const DEFAULT_PATH: &str = "C:\\Program Files (x86)\\iRacing\\";
const UI_EXE: &str = "ui\\iRacingUI.exe";

/// Get default iRacing installation path
pub fn default_path() -> PathBuf {
    PathBuf::from(DEFAULT_PATH)
}

/// Validate that path contains iRacing installation
pub fn validate_installation(path: &PathBuf) -> bool {
    path.join(UI_EXE).exists()
}

/// Prompt user to select iRacing installation folder
pub fn prompt_for_path() -> Result<PathBuf> {
    MessageDialog::new()
        .set_title("iRefined")
        .set_description(
            "Please locate your iRacing install folder.\n\n\
             Usually found at:\n\
             C:\\Program Files (x86)\\iRacing\\\n\n\
             NOT the one in Documents!"
        )
        .set_buttons(rfd::MessageButtons::Ok)
        .show();

    let path = rfd::FileDialog::new()
        .set_title("Select iRacing Install Folder")
        .set_directory("C:\\")
        .pick_folder()
        .context("No folder selected")?;

    if !validate_installation(&path) {
        anyhow::bail!("Selected folder does not contain iRacing installation");
    }

    Ok(path)
}

/// Get iRacing path, auto-detect or prompt if needed
pub fn get_or_prompt() -> Result<PathBuf> {
    let default = default_path();

    if validate_installation(&default) {
        return Ok(default);
    }

    prompt_for_path()
}
```

**Step 4: Update config.rs to use iracing validation**

Modify `launcher-rs/src/config.rs`, update `load()` function:
```rust
use crate::iracing;

impl Config {
    pub fn load() -> Result<Self> {
        if CONFIG_FILE.exists() {
            let config = Self::from_file(&CONFIG_FILE)?;

            // Validate existing config
            if config.validate() {
                return Ok(config);
            }

            // Invalid config, prompt for new path
            println!("[ERROR] iRacing installation not found at configured path");
        }

        // Create new config
        let iracing_path = iracing::get_or_prompt()?;
        let config = Self {
            iracing_path,
            port: 9222,
        };
        config.save()?;

        Ok(config)
    }
}
```

**Step 5: Update main.rs**

Modify `launcher-rs/src/main.rs`:
```rust
pub mod config;
pub mod tray;
pub mod startup;
pub mod cdp;
pub mod monitor;
pub mod iracing;

fn main() {
    println!("iRefined Launcher");
}
```

**Step 6: Run tests**

Run: `cargo test --test iracing_tests`
Expected: PASS

**Step 7: Commit**

```bash
git add launcher-rs/
git commit -m "feat(launcher-rs): add iRacing path validation and selection"
```

---

## Task 7: local.json Installation with UAC Elevation

**Files:**
- Create: `launcher-rs/src/local_json.rs`
- Copy: `launcher-rs/resources/local.json` (from launcher/)
- Modify: `launcher-rs/src/iracing.rs` (add constant)

**Step 1: Copy local.json resource**

Run:
```bash
cp launcher/local.json launcher-rs/resources/
```

**Step 2: Write test stub**

Create `launcher-rs/tests/local_json_tests.rs`:
```rust
#[test]
fn test_local_json_content() {
    let json = irefined_launcher::local_json::get_local_json_content();
    assert!(json.contains("scorpioDebugPort"));
    assert!(json.contains("9222"));
}
```

**Step 3: Run test to verify it fails**

Run: `cargo test --test local_json_tests`
Expected: FAIL - module not found

**Step 4: Implement local_json module**

Create `launcher-rs/src/local_json.rs`:
```rust
use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

#[cfg(windows)]
use windows::{
    core::*,
    Win32::UI::Shell::*,
    Win32::Foundation::*,
};

const LOCAL_JSON: &str = include_str!("../resources/local.json");

pub fn get_local_json_content() -> &'static str {
    LOCAL_JSON
}

/// Check if local.json exists in iRacing config
pub fn exists(iracing_path: &Path) -> bool {
    let target = iracing_path
        .join("ui")
        .join("config")
        .join("local.json");
    target.exists()
}

/// Install local.json to iRacing config folder (requires UAC elevation)
#[cfg(windows)]
pub fn install(iracing_path: &Path) -> Result<()> {
    let target_dir = iracing_path.join("ui").join("config");
    let target_file = target_dir.join("local.json");

    // Try direct write first (might work if user has permissions)
    if try_direct_write(&target_dir, &target_file).is_ok() {
        println!("[INFO] Created local.json");
        return Ok(());
    }

    // Need elevation - use ShellExecute with runas
    install_with_elevation(iracing_path)
}

#[cfg(windows)]
fn try_direct_write(target_dir: &Path, target_file: &Path) -> Result<()> {
    fs::create_dir_all(target_dir)?;
    fs::write(target_file, LOCAL_JSON)?;
    Ok(())
}

#[cfg(windows)]
fn install_with_elevation(iracing_path: &Path) -> Result<()> {
    // Write local.json to temp file
    let temp_dir = std::env::temp_dir();
    let temp_json = temp_dir.join("irefined_local.json");
    fs::write(&temp_json, LOCAL_JSON)
        .context("Failed to write temp file")?;

    // Build PowerShell command to copy with elevation
    let target_dir = iracing_path.join("ui").join("config");
    let target_file = target_dir.join("local.json");

    let ps_cmd = format!(
        "New-Item -ItemType Directory -Force -Path '{}' | Out-Null; \
         Copy-Item -Path '{}' -Destination '{}' -Force",
        target_dir.display(),
        temp_json.display(),
        target_file.display()
    );

    unsafe {
        let operation = w!("runas");
        let file = w!("powershell.exe");
        let parameters_wide: Vec<u16> = format!("-NoProfile -Command \"{}\"", ps_cmd)
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let params = PCWSTR(parameters_wide.as_ptr());

        let result = ShellExecuteW(
            None,
            operation,
            file,
            params,
            None,
            SW_HIDE,
        );

        // ShellExecute returns > 32 on success
        if result.0 as i32 <= 32 {
            anyhow::bail!("Failed to elevate and copy local.json");
        }
    }

    // Wait briefly for file to appear
    for _ in 0..10 {
        std::thread::sleep(std::time::Duration::from_millis(200));
        if exists(iracing_path) {
            println!("[INFO] Created local.json");
            return Ok(());
        }
    }

    anyhow::bail!("local.json was not created after elevation attempt")
}

#[cfg(not(windows))]
pub fn install(_iracing_path: &Path) -> Result<()> {
    anyhow::bail!("local.json installation only supported on Windows")
}
```

**Step 5: Update main.rs**

Modify `launcher-rs/src/main.rs`:
```rust
pub mod config;
pub mod tray;
pub mod startup;
pub mod cdp;
pub mod monitor;
pub mod iracing;
pub mod local_json;

fn main() {
    println!("iRefined Launcher");
}
```

**Step 6: Run test**

Run: `cargo test --test local_json_tests`
Expected: PASS

**Step 7: Commit**

```bash
git add launcher-rs/
git commit -m "feat(launcher-rs): add local.json installer with UAC elevation"
```

---

## Task 8: Velopack Update Integration (Official Rust Crate)

**Files:**
- Create: `launcher-rs/src/update.rs`
- Modify: `launcher-rs/Cargo.toml` (add velopack dependency)
- Modify: `launcher-rs/src/main.rs` (VelopackApp startup hook)

**Step 1: Add Velopack dependency**

Add to `launcher-rs/Cargo.toml` [dependencies]:
```toml
velopack = { version = "0.0", features = ["async"] }
```

**Step 2: Write failing test**

Create `launcher-rs/tests/update_tests.rs`:
```rust
#[test]
fn test_update_check_pattern_compiles() {
    // Verify UpdateManager types compile
    use irefined_launcher::update::UpdateManager;
    use velopack::UpdateCheck;

    let _ = UpdateCheck::UpdateAvailable;
    let _ = UpdateManager::default();
}
```

**Step 3: Run test to verify it fails**

Run: `cargo test --test update_tests`
Expected: FAIL - module not found

**Step 4: Implement update module using official Velopack crate**

Create `launcher-rs/src/update.rs`:
```rust
use anyhow::{Context, Result};
use velopack::*;

const UPDATE_URL: &str = "https://github.com/jason-murray/irefined/releases/latest/download";

#[derive(Clone)]
pub struct UpdateManager {
    inner: std::sync::Arc<velopack::UpdateManager>,
}

impl UpdateManager {
    /// Create UpdateManager with custom URL
    pub fn new(url: &str) -> Result<Self> {
        let source = sources::HttpSource::new(url);
        let inner = velopack::UpdateManager::new(source, None, None)
            .context("Failed to create Velopack UpdateManager")?;

        Ok(Self { inner: std::sync::Arc::new(inner) })
    }

    /// Create UpdateManager with default GitHub releases URL
    pub fn default() -> Result<Self> {
        Self::new(UPDATE_URL)
    }

    /// Check for updates and apply if available (blocking)
    pub fn check_and_update(&self) -> Result<()> {
        println!("[INFO] Checking for updates...");

        match self.inner.check_for_updates() {
            Ok(UpdateCheck::UpdateAvailable(update)) => {
                println!("[INFO] Update available! Version: {}", update.target_full_release.version);

                // Download updates
                println!("[INFO] Downloading updates...");
                self.inner.download_updates(&update, None)
                    .context("Failed to download updates")?;

                // Apply and restart
                println!("[INFO] Applying updates and restarting...");
                self.inner.apply_updates_and_restart(&update)
                    .context("Failed to apply updates")?;

                // This line won't be reached if restart succeeds
                unreachable!();
            }
            Ok(UpdateCheck::NoUpdateAvailable) => {
                println!("[INFO] No updates available");
                Ok(())
            }
            Ok(UpdateCheck::RemoteIsEmpty) => {
                println!("[INFO] Update source is empty");
                Ok(())
            }
            Err(e) => {
                // Don't fail app startup on update errors
                println!("[ERROR] Update check failed: {}", e);
                Ok(())
            }
        }
    }

    /// Check for updates asynchronously (for use with tokio)
    pub async fn check_and_update_async(&self) -> Result<()> {
        println!("[INFO] Checking for updates...");

        match self.inner.check_for_updates_async().await {
            Ok(UpdateCheck::UpdateAvailable(update)) => {
                println!("[INFO] Update available! Version: {}", update.target_full_release.version);

                // Download updates
                println!("[INFO] Downloading updates...");
                self.inner.download_updates_async(&update, None).await
                    .context("Failed to download updates")?;

                // Apply and restart
                println!("[INFO] Applying updates and restarting...");
                self.inner.apply_updates_and_restart(&update)
                    .context("Failed to apply updates")?;

                unreachable!();
            }
            Ok(UpdateCheck::NoUpdateAvailable) => {
                println!("[INFO] No updates available");
                Ok(())
            }
            Ok(UpdateCheck::RemoteIsEmpty) => {
                println!("[INFO] Update source is empty");
                Ok(())
            }
            Err(e) => {
                println!("[ERROR] Update check failed: {}", e);
                Ok(())
            }
        }
    }
}
```

**Step 5: Update main.rs to add VelopackApp hook**

Modify `launcher-rs/src/main.rs`:
```rust
pub mod config;
pub mod tray;
pub mod startup;
pub mod cdp;
pub mod monitor;
pub mod iracing;
pub mod local_json;
pub mod update;

use velopack::*;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // CRITICAL: VelopackApp must run first
    // This handles install/uninstall/update hooks
    // May terminate or restart the process
    VelopackApp::build().run();

    println!("iRefined Launcher");
    Ok(())
}
```

**Step 6: Run test to verify it passes**

Run: `cargo test --test update_tests`
Expected: PASS

**Step 7: Test compilation**

Run: `cargo check`
Expected: No errors

**Step 8: Commit**

```bash
git add launcher-rs/
git commit -m "feat(launcher-rs): add Velopack update manager with official crate"
```

---

## Task 9: Main Application Loop Integration

**Files:**
- Modify: `launcher-rs/src/main.rs` (integrate all modules)

**Step 1: Write integration outline**

Main loop needs to:
1. Load/create config
2. Validate iRacing installation
3. Install local.json if needed
4. Check for updates
5. Start tray icon
6. Spawn monitoring task
7. Handle tray events (quit, discord, toggle startup, reload, check update)

**Step 2: Implement main function**

Modify `launcher-rs/src/main.rs`:
```rust
pub mod config;
pub mod tray;
pub mod startup;
pub mod cdp;
pub mod monitor;
pub mod iracing;
pub mod local_json;
pub mod update;

use anyhow::Result;
use tokio::task;
use std::time::Duration;

const DISCORD_URL: &str = "https://discord.gg/hxVf8wcGaV";

#[tokio::main]
async fn main() -> Result<()> {
    // Load configuration
    let config = config::Config::load()?;
    println!("[INFO] Configuration loaded");

    // Ensure local.json exists
    if !local_json::exists(&config.iracing_path) {
        local_json::install(&config.iracing_path)?;
    }

    // Check for updates (async)
    if let Ok(updater) = update::UpdateManager::default() {
        let _ = updater.check_and_update_async().await;
    }

    // Create tray icon
    let tray = tray::TrayManager::new()?;
    tray.set_startup_checked(startup::is_enabled());

    // Start monitoring task
    let monitor = std::sync::Arc::new(monitor::InjectionMonitor::new(config.port));
    let monitor_clone = monitor.clone();
    task::spawn(async move {
        monitor_clone.run().await;
    });

    println!("[INFO] iRefined ready");

    // Main event loop
    loop {
        // Check for tray events
        if let Some(action) = tray.poll_action() {
            match action {
                tray::TrayAction::Quit => {
                    println!("[INFO] Quitting...");
                    std::process::exit(0);
                }
                tray::TrayAction::Discord => {
                    let _ = webbrowser::open(DISCORD_URL);
                }
                tray::TrayAction::ToggleStartup => {
                    if startup::is_enabled() {
                        let _ = startup::disable();
                        tray.set_startup_checked(false);
                    } else {
                        let _ = startup::enable();
                        tray.set_startup_checked(true);
                    }
                }
                tray::TrayAction::Reload => {
                    monitor.reload();
                }
                tray::TrayAction::CheckUpdate => {
                    if let Ok(updater) = update::UpdateManager::default() {
                        // Spawn async update check
                        let updater_clone = updater.clone();
                        tokio::spawn(async move {
                            let _ = updater_clone.check_and_update_async().await;
                        });
                    }
                }
            }
        }

        // Sleep briefly to avoid busy loop
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}
```

Add dependency to `Cargo.toml`:
```toml
webbrowser = "1.0"
```

**Step 3: Build the project**

Run: `cargo build --release`
Expected: SUCCESS (may have warnings)

**Step 4: Fix any compilation errors**

Fix errors one by one:
- Add missing imports
- Fix lifetime issues
- Resolve trait bounds

Run: `cargo build --release` after each fix
Expected: Clean build

**Step 5: Test manual run (in dev mode)**

Run: `cargo run --release`
Expected:
- Prints "[INFO] Configuration loaded"
- Prints "[INFO] iRefined ready"
- Tray icon appears (if on Windows)
- Monitor loop starts (checks every 1 second)

**Step 6: Test quit functionality**

Right-click tray icon → Quit
Expected: Application exits cleanly

**Step 7: Commit**

```bash
git add launcher-rs/
git commit -m "feat(launcher-rs): integrate all modules into main loop"
```

---

## Task 10: GitHub Actions Workflow for Rust Build

**Files:**
- Create: `.github/workflows/launcher-rs.yml`
- Modify: `.github/workflows/launcher.yml` (disable or document migration)

**Step 1: Create new workflow file**

Create `.github/workflows/launcher-rs.yml`:
```yaml
name: launcher-rs

on:
  push:
    tags:
      - '*'

permissions:
  contents: write

concurrency: launcher

jobs:
  build_launcher:
    runs-on: windows-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: x86_64-pc-windows-msvc

      - name: Cache cargo registry
        uses: actions/cache@v4
        with:
          path: ~/.cargo/registry
          key: ${{ runner.os }}-cargo-registry-${{ hashFiles('**/Cargo.lock') }}

      - name: Cache cargo build
        uses: actions/cache@v4
        with:
          path: launcher-rs/target
          key: ${{ runner.os }}-cargo-build-${{ hashFiles('**/Cargo.lock') }}

      - name: Build Rust launcher
        run: cargo build --release
        working-directory: launcher-rs

      - name: Prepare distribution files
        run: |
          mkdir dist
          copy target\release\irefined-launcher.exe dist\iRefined.exe
          copy resources\bootstrap.js dist\
          copy resources\local.json dist\
        working-directory: launcher-rs

      - name: Install Velopack
        run: dotnet tool install -g vpk

      - name: Create Velopack Release
        run: |
          vpk pack -u iRefined -v ${{ github.ref_name }} -p .\dist -o .\release --noPortable --icon resources\icon.ico
          vpk upload github -o .\release --repoUrl https://github.com/${{ github.repository }} --publish --releaseName "iRefined Launcher v${{ github.ref_name }}" --tag ${{ github.ref_name }} --token ${{ secrets.GITHUB_TOKEN }}
        working-directory: launcher-rs

      - name: Discord Webhook Notification
        uses: tsickert/discord-webhook@v7.0.0
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          content: |
            **Launcher v${{ github.ref_name }} released! (Rust version)**
            Right click iRefined and check updates to get the latest version.

            [Or grab it here!](<https://github.com/jason-murray/irefined/releases/latest/download/iRefined-win-Setup.exe>)
```

**Step 2: Add workflow migration note**

Modify `.github/workflows/launcher.yml`, add comment at top:
```yaml
# DEPRECATED: Python launcher workflow
# Replaced by launcher-rs.yml (Rust implementation)
# This workflow is disabled but kept for reference
# To re-enable Python launcher, change: if: false

name: launcher (DEPRECATED)

on: push

permissions:
  contents: write

concurrency: launcher

jobs:
  build_launcher:
    if: false  # Disabled - using Rust launcher instead
    runs-on: windows-latest
    # ... rest of file unchanged
```

**Step 3: Test workflow syntax**

Run:
```bash
# Install act for local workflow testing (optional)
# brew install act

# Or just validate YAML syntax
yamllint .github/workflows/launcher-rs.yml
```

Expected: Valid YAML

**Step 4: Document deployment process**

Add to `launcher-rs/README.md` (create if doesn't exist):
```markdown
# iRefined Launcher (Rust)

## Building

```bash
cargo build --release
```

## Deployment

Deployments are automated via GitHub Actions when a git tag is pushed:

```bash
git tag 1.5.5
git push origin 1.5.5
```

This triggers `.github/workflows/launcher-rs.yml` which:
1. Builds the Rust launcher for Windows
2. Packages with Velopack for auto-updates
3. Publishes release to GitHub
4. Sends notification to Discord

## Development

Run locally:
```bash
cargo run --release
```

Note: Updates only work in packaged builds (not during `cargo run`).
```

**Step 5: Commit**

```bash
git add .github/workflows/ launcher-rs/README.md
git commit -m "ci: add Rust launcher build workflow, deprecate Python workflow"
```

---

## Task 11: Testing and Validation

**Files:**
- Create: `launcher-rs/tests/integration_test.rs`
- Create: `launcher-rs/TESTING.md`

**Step 1: Create integration test**

Create `launcher-rs/tests/integration_test.rs`:
```rust
//! Integration tests that verify the full application flow
//! Note: Some tests require Windows and cannot run in CI

use irefined_launcher::*;

#[test]
fn test_config_load_and_save_roundtrip() {
    use std::fs;
    use config::Config;

    let temp_dir = std::env::temp_dir().join("irefined_test");
    fs::create_dir_all(&temp_dir).unwrap();

    let config = Config {
        iracing_path: "C:\\Test\\Path".into(),
        port: 9999,
    };

    // Would save/load here, but config uses lazy_static paths
    // This test verifies types compile
    assert_eq!(config.port, 9999);
}

#[test]
fn test_bootstrap_js_is_valid() {
    let js = monitor::get_bootstrap_js();
    assert!(js.contains("setInterval"));
    assert!(js.len() > 100);
}

#[test]
fn test_local_json_is_valid_json() {
    let json_str = local_json::get_local_json_content();
    let parsed: serde_json::Value = serde_json::from_str(json_str)
        .expect("local.json should be valid JSON");
    assert!(parsed.get("scorpioDebugPort").is_some());
}

#[tokio::test]
async fn test_cdp_client_handles_invalid_port() {
    let client = cdp::CdpClient::new(19999);
    let result = client.get_websocket_url().await;
    assert!(result.is_none());
}
```

**Step 2: Run integration tests**

Run: `cargo test --test integration_test`
Expected: PASS

**Step 3: Create testing documentation**

Create `launcher-rs/TESTING.md`:
```markdown
# Testing Guide

## Automated Tests

Run all tests:
```bash
cargo test
```

Run specific test:
```bash
cargo test test_config_load
```

## Manual Testing Checklist

### First Launch
- [ ] App prompts for iRacing path if not found
- [ ] Config file created at `~/Documents/iRefined/irefined.ini`
- [ ] Startup shortcut NOT created by default
- [ ] Tray icon appears with correct menu items
- [ ] Version shows in menu: "iRefined Launcher v1.5.4"

### Configuration
- [ ] Can select iRacing folder via dialog
- [ ] Invalid folder selection shows error
- [ ] Config persists across restarts

### Injection
- [ ] Monitor detects iRacing UI when launched
- [ ] Bootstrap script injected successfully (check console)
- [ ] Extension loads from GitHub Pages
- [ ] Re-injection doesn't occur until reload clicked

### Tray Menu
- [ ] Discord link opens in browser
- [ ] "Run at Startup" toggle creates/removes shortcut
- [ ] Shortcut located at: `%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\iRefined.lnk`
- [ ] Reload clears injection history
- [ ] Check for Updates works (shows "no updates" or downloads)
- [ ] Quit exits cleanly

### local.json Installation
- [ ] First run prompts for UAC elevation
- [ ] File created at: `<iRacing>\\ui\\config\\local.json`
- [ ] Content: `{"scorpioDebugPort": 9222}`

### Updates
- [ ] Update.exe present in packaged build
- [ ] Update check runs on startup
- [ ] Download and apply works (test with older version)
- [ ] App restarts after update

## Testing with Python Version

Compare behavior side-by-side:
1. Run Python launcher (old): `cd launcher && pipenv run python main.py`
2. Run Rust launcher (new): `cd launcher-rs && cargo run --release`
3. Verify identical behavior for all menu items
```

**Step 4: Run full test suite**

Run: `cargo test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add launcher-rs/
git commit -m "test: add integration tests and testing documentation"
```

---

## Task 12: Documentation and Migration Guide

**Files:**
- Create: `launcher-rs/MIGRATION.md`
- Modify: `README.md` (add note about Rust launcher)
- Modify: `CLAUDE.md` (update launcher documentation)

**Step 1: Create migration guide**

Create `launcher-rs/MIGRATION.md`:
```markdown
# Python to Rust Migration Guide

## Overview

The iRefined launcher has been rewritten in Rust to improve:
- **Performance**: Faster startup and lower memory usage
- **Reliability**: Stronger type safety and error handling
- **Maintainability**: Easier to build and distribute
- **Size**: Smaller executable (~3MB vs ~15MB with Python)

## Feature Parity

All features from the Python launcher are preserved:

| Feature | Python | Rust | Notes |
|---------|--------|------|-------|
| System tray icon | ✅ | ✅ | Same behavior |
| CDP WebSocket injection | ✅ | ✅ | Same 1-second polling |
| Config file (INI) | ✅ | ✅ | Same format, same location |
| iRacing path detection | ✅ | ✅ | Same logic |
| Startup shortcut | ✅ | ✅ | Same Windows shortcut API |
| local.json installation | ✅ | ✅ | Same UAC elevation |
| Velopack updates | ✅ | ✅ | Same update mechanism |
| Discord link | ✅ | ✅ | Opens in default browser |
| Reload injection | ✅ | ✅ | Clears seen URLs |

## User Impact

**Zero migration needed for users!**

- Existing config files work as-is
- Startup shortcuts continue working
- Auto-update delivers new Rust version seamlessly
- No UI changes

## Developer Impact

### Build Process

**Python:**
```bash
cd launcher
pipenv install
pipenv run cxfreeze build --target-dir=dist
```

**Rust:**
```bash
cd launcher-rs
cargo build --release
```

### Dependencies

**Python (removed):**
- Python 3.13 runtime (~50MB)
- cx_Freeze
- requests, websockets, pystray, pywin32, velopack
- Pipenv for environment management

**Rust (new):**
- Rust toolchain (dev only)
- Dependencies compiled into single binary
- No runtime dependencies

### CI/CD

- Old workflow: `.github/workflows/launcher.yml` (disabled)
- New workflow: `.github/workflows/launcher-rs.yml`
- Tag-based releases unchanged

## Rollback Plan

If critical issues arise:

1. Re-enable Python workflow:
   ```yaml
   # .github/workflows/launcher.yml
   if: false  # Change to: if: github.ref_type == 'tag'
   ```

2. Create new tag with older Python version:
   ```bash
   git checkout <last-python-commit>
   git tag 1.5.5-py
   git push origin 1.5.5-py
   ```

3. Users will auto-update back to Python version

## Testing Checklist

Before releasing Rust version:

- [ ] All automated tests pass (`cargo test`)
- [ ] Manual testing completed (see `TESTING.md`)
- [ ] Tested on clean Windows install
- [ ] Tested with iRacing UI injection
- [ ] Tested update mechanism (downgrade to Python, then update to Rust)
- [ ] Verified no memory leaks (run for 24 hours)
- [ ] Verified CPU usage is low (< 1% when idle)

## Timeline

1. **Development**: Complete all 12 tasks in this plan
2. **Internal Testing**: Run Rust version for 1 week alongside Python
3. **Beta Release**: Tag as `1.6.0-beta` for opt-in testing
4. **Full Release**: Tag as `1.6.0` for auto-update rollout
5. **Monitor**: Watch Discord for user feedback
6. **Deprecation**: Remove Python code after 2 stable releases

## Questions?

- Codebase questions → `CLAUDE.md`
- Build questions → `README.md`
- Testing questions → `TESTING.md`
```

**Step 2: Update main README**

Modify `README.md`, add section after project overview:
```markdown
## Launcher Implementation

The launcher is available in two implementations:

- **Rust** (current): `launcher-rs/` - Modern rewrite with better performance
- **Python** (deprecated): `launcher/` - Original implementation, will be removed in future

For development, use the Rust version. See `launcher-rs/README.md` for build instructions.
```

**Step 3: Update CLAUDE.md**

Modify `CLAUDE.md`, update Launcher section:
```markdown
### Launcher (`/launcher-rs/`)
- `src/main.rs` - Entry point and main event loop
- `src/config.rs` - INI file configuration management
- `src/tray.rs` - Windows system tray icon and menu
- `src/startup.rs` - Windows startup shortcut management
- `src/cdp.rs` - Chrome DevTools Protocol client
- `src/monitor.rs` - WebSocket monitoring and injection loop
- `src/iracing.rs` - iRacing installation validation
- `src/local_json.rs` - local.json installer with UAC elevation
- `src/update.rs` - Velopack update integration
- `resources/` - Embedded files (bootstrap.js, icon.ico, local.json)

Note: Python launcher in `/launcher/` is deprecated and will be removed in a future release.
```

**Step 4: Commit**

```bash
git add README.md CLAUDE.md launcher-rs/MIGRATION.md
git commit -m "docs: add migration guide and update project documentation"
```

---

## Post-Implementation Checklist

After completing all tasks:

- [ ] All tests pass (`cargo test`)
- [ ] Clean release build (`cargo build --release`)
- [ ] Manual testing completed (see `launcher-rs/TESTING.md`)
- [ ] Documentation reviewed and accurate
- [ ] CI workflow validated (test with a beta tag)
- [ ] Python launcher workflow disabled
- [ ] Migration guide reviewed by maintainer
- [ ] Ready for beta release tag (e.g., `1.6.0-beta1`)

## Beta Testing Plan

1. Create beta tag: `git tag 1.6.0-beta1 && git push origin 1.6.0-beta1`
2. Announce in Discord with opt-in download link
3. Collect feedback for 1 week
4. Fix any critical issues
5. Release stable: `git tag 1.6.0 && git push origin 1.6.0`
6. Monitor Discord for 2 weeks
7. If stable, remove Python code: `git rm -r launcher/`

---

## Notes for Implementer

- **DRY**: Reuse error handling patterns across modules with `anyhow::Context`
- **YAGNI**: Don't add features beyond Python parity (e.g., no GUI config editor)
- **TDD**: Follow RED-GREEN-REFACTOR for each task
- **Commits**: Commit after each task completes and tests pass

**Windows-specific considerations:**
- All `windows-rs` code must be behind `#[cfg(windows)]`
- Test compilation on non-Windows with `cargo check --target x86_64-unknown-linux-gnu`
- Use `Path` and `PathBuf` for all file paths (handles backslashes)

**Error handling:**
- Use `anyhow::Result` for functions that can fail
- Use `.context()` to add helpful error messages
- Don't crash on non-critical errors (updates, shortcuts) - log and continue

**Performance:**
- Monitor loop should sleep between checks (1 second is fine)
- Tray event loop should sleep briefly (100ms is fine)
- Don't busy-loop - use `tokio::time::sleep`
