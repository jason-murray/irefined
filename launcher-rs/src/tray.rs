use anyhow::Result;
use tao::event_loop::EventLoop;
use tray_icon::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem, CheckMenuItem},
    TrayIconBuilder, Icon,
};
use std::sync::mpsc::{channel, Receiver};

const VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrayAction {
    Quit,
    Discord,
    ToggleStartup,
    Reload,
    CheckUpdate,
}

pub struct TrayManager {
    menu_event_rx: Receiver<MenuEvent>,
    quit_item: MenuItem,
    discord_item: MenuItem,
    startup_item: CheckMenuItem,
    reload_item: MenuItem,
    update_item: MenuItem,
}

impl TrayManager {
    pub fn new() -> Result<Self> {
        let _event_loop = EventLoop::new();

        // Load icon
        let icon = load_icon()?;

        // Create menu items
        let title = MenuItem::new(
            format!("iRefined Launcher v{}", VERSION),
            false,
            None
        );
        let discord_item = MenuItem::new("Discord", true, None);
        let separator1 = PredefinedMenuItem::separator();
        let startup_item = CheckMenuItem::new("Run at Startup", true, true, None);
        let reload_item = MenuItem::new("Reload", true, None);
        let update_item = MenuItem::new("Check for Updates", true, None);
        let quit_item = MenuItem::new("Quit", true, None);

        // Build menu
        let menu = Menu::new();
        menu.append(&title)?;
        menu.append(&discord_item)?;
        menu.append(&separator1)?;
        menu.append(&startup_item)?;
        menu.append(&reload_item)?;
        menu.append(&update_item)?;
        menu.append(&quit_item)?;

        // Create tray icon
        let _tray = TrayIconBuilder::new()
            .with_menu(Box::new(menu))
            .with_tooltip("iRefined")
            .with_icon(icon)
            .build()?;

        let (tx, rx) = channel();
        MenuEvent::set_event_handler(Some(move |event| {
            tx.send(event).ok();
        }));

        Ok(Self {
            menu_event_rx: rx,
            quit_item,
            discord_item,
            startup_item,
            reload_item,
            update_item,
        })
    }

    /// Check for menu events (non-blocking)
    pub fn poll_action(&self) -> Option<TrayAction> {
        if let Ok(event) = self.menu_event_rx.try_recv() {
            if event.id == self.quit_item.id() {
                return Some(TrayAction::Quit);
            } else if event.id == self.discord_item.id() {
                return Some(TrayAction::Discord);
            } else if event.id == self.startup_item.id() {
                return Some(TrayAction::ToggleStartup);
            } else if event.id == self.reload_item.id() {
                return Some(TrayAction::Reload);
            } else if event.id == self.update_item.id() {
                return Some(TrayAction::CheckUpdate);
            }
        }
        None
    }

    pub fn set_startup_checked(&self, checked: bool) {
        self.startup_item.set_checked(checked);
    }
}

fn load_icon() -> Result<Icon> {
    let icon_bytes = include_bytes!("../resources/icon.ico");
    let image = image::load_from_memory(icon_bytes)?
        .to_rgba8();
    let (w, h) = image.dimensions();
    let rgba = image.into_raw();
    Ok(Icon::from_rgba(rgba, w, h)?)
}
