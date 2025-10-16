use anyhow::{Context, Result};
use configparser::ini::Ini;
use std::fs;
use std::path::{Path, PathBuf};
use lazy_static::lazy_static;

lazy_static! {
    pub static ref CONFIG_DIR: PathBuf = dirs::document_dir()
        .expect("Failed to get documents directory")
        .join("iRefined");

    pub static ref CONFIG_FILE: PathBuf = CONFIG_DIR.join("irefined.ini");
}

#[derive(Debug, Clone)]
pub struct Config {
    pub iracing_path: PathBuf,
    pub port: u16,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            iracing_path: PathBuf::from("C:\\Program Files (x86)\\iRacing\\"),
            port: 9222,
        }
    }
}

impl Config {
    /// Load config from INI file, or create default if not exists
    pub fn load() -> Result<Self> {
        if CONFIG_FILE.exists() {
            Self::from_file(&CONFIG_FILE)
        } else {
            let config = Self::default();
            config.save()?;
            Ok(config)
        }
    }

    /// Load config from specific INI file
    fn from_file(path: &Path) -> Result<Self> {
        let mut ini = Ini::new();
        ini.load(path.to_str().unwrap())
            .map_err(|e| anyhow::anyhow!("Failed to load config file: {}", e))?;

        let iracing_path = ini.get("Config", "IRACING_PATH")
            .context("Missing IRACING_PATH")?
            .into();

        let port = ini.get("Config", "PORT")
            .and_then(|s| s.parse().ok())
            .unwrap_or(9222);

        Ok(Self { iracing_path, port })
    }

    /// Save config to INI file
    pub fn save(&self) -> Result<()> {
        fs::create_dir_all(&*CONFIG_DIR)
            .context("Failed to create config directory")?;

        let mut ini = Ini::new();
        ini.set("Config", "IRACING_PATH", Some(self.iracing_path.to_string_lossy().to_string()));
        ini.set("Config", "PORT", Some(self.port.to_string()));

        ini.write(CONFIG_FILE.to_str().unwrap())
            .map_err(|e| anyhow::anyhow!("Failed to write config file: {}", e))
    }

    /// Validate that iRacing installation exists
    pub fn validate(&self) -> bool {
        self.iracing_path.join("ui").join("iRacingUI.exe").exists()
    }
}
