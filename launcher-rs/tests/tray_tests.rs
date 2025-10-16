// Integration test: verify tray can be created
// Note: Cannot fully test GUI in CI, but can verify compilation
#[test]
fn test_tray_menu_items_compile() {
    // This test just verifies the types compile
    use irefined_launcher::tray::TrayAction;
    let _ = TrayAction::Quit;
    let _ = TrayAction::Discord;
}
