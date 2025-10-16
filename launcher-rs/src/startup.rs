use anyhow::{Context, Result};
use std::path::PathBuf;

#[cfg(windows)]
use windows::{
    core::*,
    Win32::System::Com::*,
    Win32::UI::Shell::*,
};

/// Get the path to the startup shortcut
pub fn get_shortcut_path() -> PathBuf {
    #[cfg(windows)]
    {
        let appdata = std::env::var("APPDATA")
            .expect("APPDATA environment variable not set");

        PathBuf::from(appdata)
            .join("Microsoft")
            .join("Windows")
            .join("Start Menu")
            .join("Programs")
            .join("Startup")
            .join("iRefined.lnk")
    }

    #[cfg(not(windows))]
    {
        // For testing on non-Windows systems, return a mock path
        PathBuf::from("/mock/Startup/iRefined.lnk")
    }
}

/// Check if startup is enabled
pub fn is_enabled() -> bool {
    get_shortcut_path().exists()
}

/// Enable startup by creating shortcut
#[cfg(windows)]
pub fn enable() -> Result<()> {
    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)?;

        let shell_link: IShellLinkW = CoCreateInstance(
            &ShellLink,
            None,
            CLSCTX_INPROC_SERVER
        )?;

        // Set target to current exe
        let exe_path = std::env::current_exe()?;
        let exe_path_wide: Vec<u16> = exe_path
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        shell_link.SetPath(PCWSTR(exe_path_wide.as_ptr()))?;

        // Set working directory
        let work_dir = exe_path.parent().unwrap();
        let work_dir_wide: Vec<u16> = work_dir
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        shell_link.SetWorkingDirectory(PCWSTR(work_dir_wide.as_ptr()))?;

        // Set icon
        shell_link.SetIconLocation(PCWSTR(exe_path_wide.as_ptr()), 0)?;

        // Save shortcut
        let persist_file: IPersistFile = shell_link.cast()?;
        let shortcut_path = get_shortcut_path();
        let shortcut_wide: Vec<u16> = shortcut_path
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        persist_file.Save(PCWSTR(shortcut_wide.as_ptr()), TRUE)?;

        CoUninitialize();
        println!("[INFO] Startup enabled");
        Ok(())
    }
}

#[cfg(not(windows))]
pub fn enable() -> Result<()> {
    anyhow::bail!("Startup shortcuts only supported on Windows")
}

/// Disable startup by removing shortcut
pub fn disable() -> Result<()> {
    let path = get_shortcut_path();
    if path.exists() {
        std::fs::remove_file(path)
            .context("Failed to remove startup shortcut")?;
        println!("[INFO] Startup disabled");
    }
    Ok(())
}
