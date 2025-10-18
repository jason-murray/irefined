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
    // CRITICAL: VelopackApp must run first
    // This handles install/uninstall/update hooks
    // May terminate or restart the process
    velopack::VelopackApp::build().run();

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
