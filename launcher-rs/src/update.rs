use anyhow::{Context, Result};
use velopack::*;

const UPDATE_URL: &str = "https://github.com/jason-murray/irefined/releases/latest/download";

#[derive(Clone)]
pub struct UpdateManager {
    inner: std::sync::Arc<velopack::UpdateManager>,
}

impl UpdateManager {
    /// Create UpdateManager with custom URL
    pub fn new(url: &str) -> Result<Self> {
        let source = sources::HttpSource::new(url);
        let inner = velopack::UpdateManager::new(source, None, None)
            .context("Failed to create Velopack UpdateManager")?;

        Ok(Self { inner: std::sync::Arc::new(inner) })
    }

    /// Create UpdateManager with default GitHub releases URL
    pub fn default() -> Result<Self> {
        Self::new(UPDATE_URL)
    }

    /// Check for updates and apply if available (blocking)
    pub fn check_and_update(&self) -> Result<()> {
        println!("[INFO] Checking for updates...");

        match self.inner.check_for_updates() {
            Ok(UpdateCheck::UpdateAvailable(update)) => {
                println!("[INFO] Update available! Version: {}", update.TargetFullRelease.Version);

                // Download updates
                println!("[INFO] Downloading updates...");
                self.inner.download_updates(&update, None)
                    .context("Failed to download updates")?;

                // Apply and restart
                println!("[INFO] Applying updates and restarting...");
                self.inner.apply_updates_and_restart(&update)
                    .context("Failed to apply updates")?;

                // This line won't be reached if restart succeeds
                unreachable!();
            }
            Ok(UpdateCheck::NoUpdateAvailable) => {
                println!("[INFO] No updates available");
                Ok(())
            }
            Ok(UpdateCheck::RemoteIsEmpty) => {
                println!("[INFO] Update source is empty");
                Ok(())
            }
            Err(e) => {
                // Don't fail app startup on update errors
                println!("[ERROR] Update check failed: {}", e);
                Ok(())
            }
        }
    }

    /// Check for updates asynchronously (for use with tokio)
    pub async fn check_and_update_async(&self) -> Result<()> {
        println!("[INFO] Checking for updates...");

        match self.inner.check_for_updates_async().await {
            Ok(UpdateCheck::UpdateAvailable(update)) => {
                println!("[INFO] Update available! Version: {}", update.TargetFullRelease.Version);

                // Download updates
                println!("[INFO] Downloading updates...");
                self.inner.download_updates_async(&update, None).await
                    .context("Failed to download updates")?;

                // Apply and restart
                println!("[INFO] Applying updates and restarting...");
                self.inner.apply_updates_and_restart(&update)
                    .context("Failed to apply updates")?;

                unreachable!();
            }
            Ok(UpdateCheck::NoUpdateAvailable) => {
                println!("[INFO] No updates available");
                Ok(())
            }
            Ok(UpdateCheck::RemoteIsEmpty) => {
                println!("[INFO] Update source is empty");
                Ok(())
            }
            Err(e) => {
                println!("[ERROR] Update check failed: {}", e);
                Ok(())
            }
        }
    }
}
