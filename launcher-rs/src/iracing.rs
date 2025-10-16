use anyhow::{Context, Result};
use rfd::MessageDialog;
use std::path::PathBuf;

const DEFAULT_PATH: &str = "C:\\Program Files (x86)\\iRacing\\";
const UI_EXE: &str = "ui\\iRacingUI.exe";

/// Get default iRacing installation path
pub fn default_path() -> PathBuf {
    PathBuf::from(DEFAULT_PATH)
}

/// Validate that path contains iRacing installation
pub fn validate_installation(path: &PathBuf) -> bool {
    path.join(UI_EXE).exists()
}

/// Prompt user to select iRacing installation folder
pub fn prompt_for_path() -> Result<PathBuf> {
    MessageDialog::new()
        .set_title("iRefined")
        .set_description(
            "Please locate your iRacing install folder.\n\n\
             Usually found at:\n\
             C:\\Program Files (x86)\\iRacing\\\n\n\
             NOT the one in Documents!"
        )
        .set_buttons(rfd::MessageButtons::Ok)
        .show();

    let path = rfd::FileDialog::new()
        .set_title("Select iRacing Install Folder")
        .set_directory("C:\\")
        .pick_folder()
        .context("No folder selected")?;

    if !validate_installation(&path) {
        anyhow::bail!("Selected folder does not contain iRacing installation");
    }

    Ok(path)
}

/// Get iRacing path, auto-detect or prompt if needed
pub fn get_or_prompt() -> Result<PathBuf> {
    let default = default_path();

    if validate_installation(&default) {
        return Ok(default);
    }

    prompt_for_path()
}
