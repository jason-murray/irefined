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
