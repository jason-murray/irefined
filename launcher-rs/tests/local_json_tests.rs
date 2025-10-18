#[test]
fn test_local_json_content() {
    let json = irefined_launcher::local_json::get_local_json_content();
    assert!(json.contains("scorpioDebugPort"));
    assert!(json.contains("9222"));
}
