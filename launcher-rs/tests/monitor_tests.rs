#[test]
fn test_bootstrap_js_is_embedded() {
    let js = irefined_launcher::monitor::get_bootstrap_js();
    assert!(js.contains("irefBootstrap"));
    assert!(js.contains("jason-murray.github.io/irefined"));
}
