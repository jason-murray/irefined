# Testing Guide

## Automated Tests

Run all tests:
```bash
cargo test
```

Run specific test:
```bash
cargo test test_config_load
```

## Manual Testing Checklist

### First Launch
- [ ] App prompts for iRacing path if not found
- [ ] Config file created at `~/Documents/iRefined/irefined.ini`
- [ ] Startup shortcut NOT created by default
- [ ] Tray icon appears with correct menu items
- [ ] Version shows in menu: "iRefined Launcher v1.5.4"

### Configuration
- [ ] Can select iRacing folder via dialog
- [ ] Invalid folder selection shows error
- [ ] Config persists across restarts

### Injection
- [ ] Monitor detects iRacing UI when launched
- [ ] Bootstrap script injected successfully (check console)
- [ ] Extension loads from GitHub Pages
- [ ] Re-injection doesn't occur until reload clicked

### Tray Menu
- [ ] Discord link opens in browser
- [ ] "Run at Startup" toggle creates/removes shortcut
- [ ] Shortcut located at: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\iRefined.lnk`
- [ ] Reload clears injection history
- [ ] Check for Updates works (shows "no updates" or downloads)
- [ ] Quit exits cleanly

### local.json Installation
- [ ] First run prompts for UAC elevation
- [ ] File created at: `<iRacing>\ui\config\local.json`
- [ ] Content: `{"scorpioDebugPort": 9222}`

### Updates
- [ ] Update.exe present in packaged build
- [ ] Update check runs on startup
- [ ] Download and apply works (test with older version)
- [ ] App restarts after update

## Testing with Python Version

Compare behavior side-by-side:
1. Run Python launcher (old): `cd launcher && pipenv run python main.py`
2. Run Rust launcher (new): `cd launcher-rs && cargo run --release`
3. Verify identical behavior for all menu items
