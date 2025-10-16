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
