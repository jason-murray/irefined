import asyncio
import configparser
import json
import os
import sys
import threading
from tkinter import filedialog, messagebox
import tkinter
import webbrowser
from os import makedirs, path

import pystray
import requests
import velopack
import websockets
import win32com.client
from PIL import Image

DISCORD_URL = "https://discord.gg/hxVf8wcGaV"
JS_FILE_PATH = "bootstrap.js"
SHORTCUT_PATH = os.path.join(
    os.environ["APPDATA"],
    "Microsoft\\Windows\\Start Menu\\Programs\\Startup",
    "iRefined.lnk",
)
CONFIG_INI_DIR = path.join(path.expanduser("~"), "Documents", "iRefined")
CONFIG_INI_FILE = path.join(CONFIG_INI_DIR, "irefined.ini")

seen_socket_urls = set()


def find_data_file(filename):
    if getattr(sys, "frozen", False):
        # The application is frozen
        datadir = sys.prefix
    else:
        # The application is not frozen
        datadir = path.dirname(__file__)
    return path.join(datadir, filename)


def create_default_config():
    # Create default config file in Documents/iRefined/
    if not path.exists(CONFIG_INI_DIR):
        makedirs(CONFIG_INI_DIR)

    config = configparser.ConfigParser()
    config["Config"] = {
        "IRACING_PATH": set_iracing_install(),
        "PORT": "9222",
    }

    with open(CONFIG_INI_FILE, "w") as configfile:
        config.write(configfile)

    return config


def create_startup_shortcut():
    shell = win32com.client.Dispatch("WScript.Shell")
    shortcut = shell.CreateShortCut(SHORTCUT_PATH)
    shortcut.TargetPath = sys.executable
    shortcut.WorkingDirectory = os.path.dirname(SHORTCUT_PATH)
    shortcut.IconLocation = sys.executable
    shortcut.save()
    print("[INFO] Startup enabled")


def load_config():
    config = configparser.ConfigParser()

    if path.exists(CONFIG_INI_FILE):
        config.read(CONFIG_INI_FILE)
    else:
        config = create_default_config()
        create_startup_shortcut()

    return config


def save_config(config):
    with open(CONFIG_INI_FILE, "w") as configfile:
        config.write(configfile)


def set_iracing_install():
    if path.exists("C:\\Program Files (x86)\\iRacing\\"):
        return "C:\\Program Files (x86)\\iRacing\\"

    messagebox.showinfo(
        "iRefined",
        "Please locate your iRacing install folder.\n\nUsually found at:\nC:\\Program Files (x86)\\iRacing\\\n\nNOT the one in Documents!",
    )

    iracing_install_path = filedialog.askdirectory(
        title="Select iRacing Install Folder",
        initialdir="C:\\",
    )
    if not iracing_install_path:
        messagebox.showerror("iRefined", "No folder selected, exiting!")
        sys.exit(1)

    return iracing_install_path


root = tkinter.Tk()
root.withdraw()
root.iconbitmap(find_data_file("icon.ico"))

config = load_config()
IRACING_PATH = config.get("Config", "IRACING_PATH")
REMOTE_DEBUGGING_PORT = config.getint("Config", "PORT")


def is_startup_enabled():
    return os.path.exists(SHORTCUT_PATH)


def remove_startup_shortcut():
    if is_startup_enabled():
        os.remove(SHORTCUT_PATH)
        print("[INFO] Startup disabled.")


def get_websocket_url():
    try:
        tabs = requests.get(f"http://127.0.0.1:{REMOTE_DEBUGGING_PORT}/json").json()

        tabs = [tab for tab in tabs if ".iracing.com/web/racing" in tab.get("url")]
        if not tabs:
            return
        return tabs[0]["webSocketDebuggerUrl"]
    except requests.exceptions.ConnectionError:
        return


async def run_js_from_file(ws_url, js_path):
    with open(js_path, "r") as f:
        js_code = f.read()

    try:
        async with websockets.connect(ws_url) as ws:
            await ws.send(
                json.dumps(
                    {
                        "id": 1,
                        "method": "Page.addScriptToEvaluateOnNewDocument",
                        "params": {"source": js_code, "runImmediately": True},
                    }
                )
            )
            seen_socket_urls.add(ws_url)
            print(f"[INFO] Successfully injected script into {ws_url}")
    except (
        websockets.exceptions.ConnectionClosed,
        websockets.exceptions.WebSocketException,
        OSError,
    ) as e:
        print(f"[ERROR] Failed to send script to WebSocket: {e}")
    except Exception as e:
        print(f"[ERROR] Unexpected error with WebSocket: {e}")


def monitor_websocket():

    while True:
        ws_url = get_websocket_url()
        if not ws_url:
            continue
        if ws_url not in seen_socket_urls:
            print(f"[INFO] Found new iRacing WebSocket URL: {ws_url}")
            asyncio.run(run_js_from_file(ws_url, find_data_file(JS_FILE_PATH)))


def on_quit():
    icon.stop()
    os._exit(0)


def open_discord():
    webbrowser.open(DISCORD_URL)


def toggle_startup(icon, item):
    if is_startup_enabled():
        remove_startup_shortcut()
        item.checked = False
    else:
        create_startup_shortcut()
        item.checked = True
    icon.update_menu()


def check_update():
    if getattr(sys, "frozen", False):
        manager = velopack.UpdateManager(
            "https://github.com/jason-murray/irefined/releases/latest/download"
        )

        update_info = manager.check_for_updates()
        if not update_info:
            print("[INFO] No updates available")
            return

        # Download and apply updates
        print("[INFO] Update available! Applying...")
        manager.download_updates(update_info)
        manager.apply_updates_and_restart(update_info)


def create_config_json():
    local_json_dir = path.join(IRACING_PATH, "ui", "config")
    if not path.exists(local_json_dir):
        makedirs(local_json_dir)

    local_json_path = path.join(local_json_dir, "local.json")

    config_data = {
        "scorpioDebugPort": REMOTE_DEBUGGING_PORT,
    }
    with open(local_json_path, "w") as f:
        json.dump(config_data, f, indent=4)
    print("[INFO] Created local.json")


def main():
    check_update()
    create_config_json()
    print("[INFO] iRefined ready")
    threading.Thread(target=monitor_websocket, daemon=True).start()
    icon.run()


if __name__ == "__main__":
    if getattr(sys, "frozen", False):
        velopack.App().run()

    image = Image.open(find_data_file("icon.ico"))
    menu = (
        pystray.MenuItem("Discord", open_discord),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem(
            "Run at Startup", toggle_startup, checked=lambda item: is_startup_enabled()
        ),
        pystray.MenuItem("Check for Updates", check_update),
        pystray.MenuItem("Quit", on_quit),
    )
    icon = pystray.Icon("iRefined", image, "iRefined", menu)

    main()
