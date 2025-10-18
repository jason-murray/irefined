use anyhow::Result;
use std::path::Path;

#[cfg(windows)]
use anyhow::Context;

#[cfg(windows)]
use std::fs;

#[cfg(windows)]
use windows::{
    core::*,
    Win32::UI::Shell::*,
    Win32::Foundation::*,
    Win32::UI::WindowsAndMessaging::*,
};

const LOCAL_JSON: &str = include_str!("../resources/local.json");

pub fn get_local_json_content() -> &'static str {
    LOCAL_JSON
}

/// Check if local.json exists in iRacing config
pub fn exists(iracing_path: &Path) -> bool {
    let target = iracing_path
        .join("ui")
        .join("config")
        .join("local.json");
    target.exists()
}

/// Install local.json to iRacing config folder (requires UAC elevation)
#[cfg(windows)]
pub fn install(iracing_path: &Path) -> Result<()> {
    let target_dir = iracing_path.join("ui").join("config");
    let target_file = target_dir.join("local.json");

    // Try direct write first (might work if user has permissions)
    if try_direct_write(&target_dir, &target_file).is_ok() {
        println!("[INFO] Created local.json");
        return Ok(());
    }

    // Need elevation - use ShellExecute with runas
    install_with_elevation(iracing_path)
}

#[cfg(windows)]
fn try_direct_write(target_dir: &Path, target_file: &Path) -> Result<()> {
    fs::create_dir_all(target_dir)?;
    fs::write(target_file, LOCAL_JSON)?;
    Ok(())
}

#[cfg(windows)]
fn install_with_elevation(iracing_path: &Path) -> Result<()> {
    // Write local.json to temp file
    let temp_dir = std::env::temp_dir();
    let temp_json = temp_dir.join("irefined_local.json");
    fs::write(&temp_json, LOCAL_JSON)
        .context("Failed to write temp file")?;

    // Build PowerShell command to copy with elevation
    let target_dir = iracing_path.join("ui").join("config");
    let target_file = target_dir.join("local.json");

    let ps_cmd = format!(
        "New-Item -ItemType Directory -Force -Path '{}' | Out-Null; \
         Copy-Item -Path '{}' -Destination '{}' -Force",
        target_dir.display(),
        temp_json.display(),
        target_file.display()
    );

    unsafe {
        let operation = w!("runas");
        let file = w!("powershell.exe");
        let parameters_wide: Vec<u16> = format!("-NoProfile -Command \"{}\"", ps_cmd)
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let params = PCWSTR(parameters_wide.as_ptr());

        let result = ShellExecuteW(
            None,
            operation,
            file,
            params,
            None,
            SW_HIDE,
        );

        // ShellExecute returns > 32 on success
        if result.0 as i32 <= 32 {
            anyhow::bail!("Failed to elevate and copy local.json");
        }
    }

    // Wait briefly for file to appear
    for _ in 0..10 {
        std::thread::sleep(std::time::Duration::from_millis(200));
        if exists(iracing_path) {
            println!("[INFO] Created local.json");
            return Ok(());
        }
    }

    anyhow::bail!("local.json was not created after elevation attempt")
}

#[cfg(not(windows))]
pub fn install(_iracing_path: &Path) -> Result<()> {
    anyhow::bail!("local.json installation only supported on Windows")
}
