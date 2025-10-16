use irefined_launcher::config::{Config, CONFIG_DIR};

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
