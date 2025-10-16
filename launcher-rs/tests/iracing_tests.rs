use std::path::PathBuf;

#[test]
fn test_default_iracing_path() {
    let path = irefined_launcher::iracing::default_path();
    assert_eq!(path, PathBuf::from("C:\\Program Files (x86)\\iRacing\\"));
}

#[test]
fn test_validate_requires_ui_subfolder() {
    let invalid_path = PathBuf::from("C:\\Invalid\\Path\\");
    assert!(!irefined_launcher::iracing::validate_installation(&invalid_path));
}
