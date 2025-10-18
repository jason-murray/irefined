#[test]
fn test_update_check_pattern_compiles() {
    // Verify UpdateManager types compile
    use irefined_launcher::update::UpdateManager;
    use velopack::UpdateCheck;

    let _ = UpdateCheck::UpdateAvailable;
    let _ = UpdateManager::default();
}
