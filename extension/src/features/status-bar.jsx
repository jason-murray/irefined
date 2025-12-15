import { getFeatureID } from "../helpers/feature-helpers.js";
import features from "../feature-manager.js";
import { activateQueueItem } from "./auto-register.js";
import { $$ } from "select-dom";
import React from "dom-chef";
import "./status-bar.css";
import logo from "../assets/logo.png";

const selector = "body";

const barContainerEl = (
  <div class="iref-bar-wrapper">
    <div id="iref-bar">
      <div className="iref-bar-left">
        <div className="iref-logo">
          <img src={logo} />
        </div>
        <div className="iref-queue-items"></div>
      </div>
      <div className="iref-bar-right"></div>
    </div>
  </div>
);

function formatCountdown(targetTime) {
  const now = new Date();
  const target = new Date(targetTime);
  const diff = target - now;

  if (diff <= 5 * 60 * 1000) {
    return "Registering";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

setInterval(() => {
  const queueItemsContainer = barContainerEl.querySelector(".iref-queue-items");
  queueItemsContainer.innerHTML = "";

  if (window.watchQueue && window.watchQueue.length > 0) {
    window.watchQueue.forEach((item, index) => {
      item.originalIndex = index;
    });

    const sortedQueue = [...window.watchQueue].sort(
      (a, b) => new Date(a.start_time) - new Date(b.start_time)
    );

    sortedQueue.forEach((item) => {
      let tooltipText;

      switch (item.status) {
        case "found":
          tooltipText =
            "Race session found, you will be registered 5 minutes before the start time. Click to register now.";
          break;
        case "registering":
          tooltipText = "Registering, this can take up to 30 seconds.";
          break;
        case "queued":
          tooltipText = "Searching for race session.";
          break;
        default:
          tooltipText = "";
      }

      const itemEl = (
        <div className="iref-queue-item">
          <span
            className={`iref-queue-status ${item.status}`}
            title={tooltipText}
            onClick={() => activateQueueItem(item.originalIndex)}
          ></span>
          <span className="iref-queue-text-fixed">
            {formatCountdown(item.start_time)}
          </span>
          <span> {item.season_name}</span>
          <button
            className="iref-remove-btn"
            onClick={() => {
              if (window.watchQueue) {
                window.watchQueue = window.watchQueue.filter((q) => q !== item);
              }

              $$(".iref-disabled").forEach((btn) => {
                btn.classList.remove("iref-disabled");
                btn.classList.add("btn-success");
                btn.innerHTML = "Register";
              });
            }}
            style={{
              marginRight: "5px",
              color: "var(--iref-bar-highlight)",
            }}
          >
            ×
          </button>
        </div>
      );
      queueItemsContainer.appendChild(itemEl);
    });
  }
}, 1000);

let appended = false;

async function init(activate = true) {
  if (!appended) {
    document.body.appendChild(barContainerEl);
    appended = true;
  }
}

const id = getFeatureID(import.meta.url);
const bodyClass = "iref-" + id;

features.add(id, true, selector, bodyClass, init);
