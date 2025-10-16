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
