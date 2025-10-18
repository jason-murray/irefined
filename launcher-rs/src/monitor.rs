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
                let should_inject = {
                    let seen = self.seen_urls.lock().unwrap();
                    !seen.contains(&ws_url)
                }; // Lock is dropped here

                if should_inject {
                    println!("[INFO] Found new iRacing WebSocket URL: {}", ws_url);

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
