import { getFeatureID } from "../helpers/feature-helpers.js";
import features from "../feature-manager.js";
import "./settings-panel.css";
import React from "dom-chef";
import { $ } from "select-dom";

async function initSettingsPanel(activate = true) {
  if (!activate) {
    return;
  }

  const handleClose = (e) => {
    // <button> was clicked
    $("#update-content-modal").click();
    $("body").classList.remove("iref-settings-panel-open");
    $("#iref-log").scrollTop = $("#iref-log").scrollHeight;
  };

  const handleReload = (e) => {
    location.reload();
  };

  let settings = JSON.parse(localStorage.getItem("iref_settings")) || {};

  const handleChange = (e) => {
    if (e.target.type === "checkbox") {
      settings[e.target.name] = e.target.checked;
    }

    if (e.target.type === "number") {
      settings[e.target.name] = parseInt(e.target.value);
    }

    if (e.target.type === "select-one") {
      settings[e.target.name] = e.target.value;
    }
  };

  const handleSave = (e) => {
    localStorage.setItem("iref_settings", JSON.stringify(settings));
    features.rerunAll();
    handleClose();
  };

  const settingsPanelEl = (
    <div id="update-content-modal-modal-content" class="modal-content">
      <div class="modal-header">
        <a class="close" onClick={handleClose}>
          <i class="icon-cancel"></i>
        </a>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24px"
          height="24px"
          style={{ float: "left", marginRight: 7 }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-rocket"
        >
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
        <h6 class="modal-title" data-testid="modal-title">
          iRefined
        </h6>
      </div>
      <div
        id="alert-banner-alert-1739463611065"
        class="alert alert-banner m-b-0 alert-warning alert-dismissible text-overflow"
        role="alert"
      >
        <div class="">
          <a class="close">
            <i class="icon-cancel"></i>
          </a>
          <span>
            <i class="icon-caution m-r-1"></i>
            <strong></strong>
          </span>
        </div>
      </div>
      <div class="modal-body has-dynamic-height">
        <div
          id="modal-children"
          class="height-limiter"
          style={{ maxHeight: 1244 }}
        >
          <div id="modal-children-container" style={{ position: "relative" }}>
            <div>
              <div class="row">
                <div class="col-xs-12">
                  <h1 class="m-b-1">
                    <strong>Settings</strong>
                  </h1>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Adds download and upload buttons to the session settings window so that conditions can be shared using .json"
                    ></i>
                    Test Drive session sharing buttons
                    <input
                      type="checkbox"
                      name="share-test-session"
                      checked={settings["share-test-session"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Adds download and upload buttons to the session settings window so that session setup can be shared using .json"
                    ></i>
                    Hosted/League session sharing buttons
                    <input
                      type="checkbox"
                      name="share-hosted-session"
                      checked={settings["share-hosted-session"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Adds queue buttons to future races to automatically register to them when available. You must select a car to queue with. Will forfeit/withdraw your current session when queued session becomes available. To reset your queue restart the UI."
                    ></i>
                    Queue system for future sessions
                    <input
                      type="checkbox"
                      name="auto-register"
                      checked={settings["auto-register"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Green join button will display session type. Doesn't work well with official sessions that don't go official (low attendance)."
                    ></i>
                    Join button displays session type
                    <input
                      type="checkbox"
                      name="better-join-button"
                      checked={settings["better-join-button"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Automatically launch the sim for all or official race only sessions. Doesn't work well with official sessions that don't go official (low attendance)."
                    ></i>
                    Auto join
                    <select name="auto-join-type" onChange={handleChange}>
                      <option
                        value="race"
                        selected={settings["auto-join-type"] == "race"}
                      >
                        scored
                      </option>
                      <option
                        value="all"
                        selected={settings["auto-join-type"] == "all"}
                      >
                        all
                      </option>
                    </select>
                    sessions
                    <input
                      type="checkbox"
                      name="auto-join"
                      checked={settings["auto-join"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Automatically forfeit official race sessions. Only activates if the sim is running. Recommended to not forfeit before warmup and quali is complete."
                    ></i>
                    Auto forfeit after
                    <input
                      type="number"
                      name="auto-forfeit-m"
                      value={settings["auto-forfeit-m"] || 13}
                      onChange={handleChange}
                    />
                    minutes
                    <input
                      type="checkbox"
                      name="auto-forfeit"
                      checked={settings["auto-forfeit"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Don't show any notifications at the top of the screen."
                    ></i>
                    No notifications
                    <input
                      type="checkbox"
                      name="no-toasts"
                      checked={settings["no-toasts"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Close notifications at the top of the screen after a delay. Does not work with the previous option."
                    ></i>
                    Auto close notifications after
                    <input
                      type="number"
                      name="toast-timeout-s"
                      value={settings["toast-timeout-s"] || 5}
                      onChange={handleChange}
                    />
                    seconds
                    <input
                      type="checkbox"
                      name="auto-close-toasts"
                      checked={settings["auto-close-toasts"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Hide the left and right sidebars for a cleaner UI with more space."
                    ></i>
                    Hide sidebars
                    <input
                      type="checkbox"
                      name="no-sidebars"
                      checked={settings["no-sidebars"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Folds in the left hand menu so that it only uses icons, to free up even more space for more important stuff."
                    ></i>
                    Collapse menu
                    <input
                      type="checkbox"
                      name="collapse-menu"
                      checked={settings["collapse-menu"]}
                      onChange={handleChange}
                    />
                  </label>
                  <label htmlFor="" class="iref-setting">
                    <i
                      class="icon-information text-info"
                      title="Helpful to figure out why something happened."
                    ></i>
                    Show log messages
                    <input
                      type="checkbox"
                      name="logger"
                      checked={settings["logger"]}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <div>
          <div class="pull-xs-left">
            <a
              id="default-close-modal-btn-71327f90-c5eb-2239-da82-fd2d60e5ea02"
              class="btn btn-md btn-secondary"
              data-testid="button-close-modal"
              onClick={handleClose}
            >
              <i class="icon-cancel"></i> Close
            </a>
            <a
              id="reload-ui"
              class="btn btn-md btn-secondary"
              onClick={handleReload}
            >
              Reload without iRef
            </a>
          </div>
          <div class="pull-xs-right">
            <span class="m-l-h">
              <button
                type="button"
                class="btn btn-success"
                aria-label="button"
                tabindex="0"
                onClick={handleSave}
              >
                Save
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const handleClick = (e) => {
    $("#menubar-right > span:nth-child(4) button").click();

    let waitForSettings = setInterval(() => {
      if ($("#update-content-modal-modal-dialog")) {
        clearInterval(waitForSettings);
        $("#update-content-modal-modal-dialog").innerHTML = "";
        $("#update-content-modal-modal-dialog").appendChild(settingsPanelEl);
        $("body").classList.add("iref-settings-panel-open");
      }
    }, 100);
  };

  const menuButtonEl = (
    <button
      type="button"
      className="iref-toolbar-btn"
      aria-label="iRefined"
      tabindex="0"
      onClick={handleClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20px"
        height="20px"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-rocket"
      >
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    </button>
  );

  $(".iref-bar-right").appendChild(menuButtonEl);

  const plausibleEl = (
    <script
      defer
      data-domain="iracing.com"
      src="https://plausible.jsn256.com/js/script.js"
    ></script>
  );

  $("body").appendChild(plausibleEl);
}

const id = getFeatureID(import.meta.url);
const bodyClass = "iref-" + id;
const selector = "body";

features.add(id, true, selector, bodyClass, initSettingsPanel);
