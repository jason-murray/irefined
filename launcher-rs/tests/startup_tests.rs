use irefined_launcher::startup;

#[test]
fn test_shortcut_path_is_in_startup_folder() {
    let path = startup::get_shortcut_path();
    assert!(path.to_string_lossy().contains("Startup"));
    assert!(path.to_string_lossy().ends_with("iRefined.lnk"));
}
