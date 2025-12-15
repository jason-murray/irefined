import { getFeatureID } from "../helpers/feature-helpers.js";
import { log } from "./logger.js";
import features from "../feature-manager.js";
import { findProps, findState } from "../helpers/react-resolver.js";
import { $, $$ } from "select-dom";
import ws from "../helpers/websockets.js";
import "./auto-register.css";

const selector = 'a.active[href*="go-racing"]';
let persistInterval = 0;

window.watchQueue = [];

function formatSeasonName(seasonName) {
  seasonName = seasonName
    .replace(/(?:\s*-\s*)?\d{4}\sSeason(?:\s\d+)?/, "")
    .replace(/Fixed\s(?:-\s)?Fixed/, "Fixed")
    .replace("Series Series", "Series");
  return seasonName;
}

function checkSession(session, queueItem) {
  if (queueItem.status !== "queued") {
    return;
  }

  let isoTime =
    new Date(queueItem.start_time).toISOString().split(".")[0] + "Z";

  if (session.season_id === queueItem.season_id) {
    if (
      session.season_id === queueItem.season_id &&
      session.event_type === 5 &&
      session.start_time === isoTime &&
      session.session_id > 0
    ) {
      log(
        `📝 Race session for series ${formatSeasonName(
          queueItem.season_name
        )}, start time ${isoTime} found`
      );

      queueItem.session_id = session.session_id;
      queueItem.status = "found";
    }
  }
}

export function activateQueueItem(queueIndex) {
  const queueItem = watchQueue[queueIndex];

  if (queueItem.status !== "found") {
    return;
  }

  queueItem.status = "registering";

  log(
    `📝 Registering for series ${formatSeasonName(
      queueItem.season_name
    )} in 10 seconds...`
  );

  ws.withdraw();

  setTimeout(() => {
    watchQueue = watchQueue.filter(
      (item) => item.start_time !== queueItem.start_time
    );

    ws.register(
      formatSeasonName(queueItem.season_name),
      queueItem.car_id,
      queueItem.car_class_id,
      queueItem.session_id
    );
  }, 5000);
}

setInterval(() => {
  if (watchQueue.length < 1) {
    return;
  }

  watchQueue.forEach((queueItem, queueIndex) => {
    const startTime = new Date(queueItem.start_time);
    const now = new Date();
    const timeDiff = startTime - now;
    if (timeDiff <= 5 * 60 * 1000 && queueItem.status === "found") {
      activateQueueItem(queueIndex);
    }
  });
}, 1000);

const wsCallback = (data) => {
  // loop watchQueue
  watchQueue.forEach((queueItem) => {
    try {
      data.data.delta.INSERT.forEach((session) => {
        checkSession(session, queueItem);
      });
    } catch {}

    try {
      data.data.delta.REGISTRATION.forEach((session) => {
        checkSession(session, queueItem);
      });
    } catch {}
  });
};

ws.callbacks.push(wsCallback);

function addToQueue(e) {
  const sessionProps = findProps(e.target);
  const timestamp = sessionProps.session.start_time;

  let selectedCar = JSON.parse(
    localStorage.getItem(`selected_car_season_${sessionProps.contentId}`)
  );

  if (!selectedCar && !$(".alice-carousel")) {
    const singleCarEl = $(".css-m35ghn > .css-0");

    const reactPropsKey = Object.keys(singleCarEl).find((key) =>
      key.startsWith("__reactProps")
    );

    if (reactPropsKey) {
      selectedCar = {
        car_id: singleCarEl[reactPropsKey].children.props.cars[0].car_id,
        car_class_id: singleCarEl[reactPropsKey].children.props.carClassIds[0],
      };
    }
  }

  if (!selectedCar) {
    log(`🚫 No car selected`);
    e.target.innerHTML = "Select Car";
    e.target.classList.add("danger");
    setTimeout(() => {
      e.target.innerHTML = "Queue";
      e.target.classList.remove("danger");
    }, 3000);

    return;
  }

  if (watchQueue.find((session) => session.start_time === timestamp)) {
    log(`🚫 A session for timeslot ${timestamp} is already queued`);
    return;
  }

  watchQueue.push({
    car_id: selectedCar.car_id,
    car_class_id: selectedCar.car_class_id,
    season_id: sessionProps.contentId,
    season_name: formatSeasonName(
      $(".chakra-screen-billboard .chakra-heading").innerText
    ),
    start_time: timestamp,
    status: "queued",
  });

  log(
    `📝 Added session ${timestamp} for series ${sessionProps.contentId} to queue`
  );
}

async function init(activate = true) {
  if (!activate) {
    clearInterval(persistInterval);
    return;
  }

  persistInterval = setInterval(() => {
    let disabledRegButtons = $$(".chakra-table a.btn-success.disabled");

    if (!disabledRegButtons) {
      return;
    }

    for (let i = 0; i < disabledRegButtons.length; i++) {
      const button = disabledRegButtons[i];

      const sessionProps = findProps(button);

      if (sessionProps.session.max_team_drivers > 1) {
        break;
      }

      button.classList.add("iref-queue-btn");
      button.classList.remove("disabled", "btn-success");
      button.innerHTML = "Queue";
      button.addEventListener("click", addToQueue);
    }

    let regButtons = $$(".chakra-table a.btn-success");

    if (!regButtons) {
      return;
    }

    for (let i = 0; i < regButtons.length; i++) {
      const button = regButtons[i];

      const sessionProps = findProps(button);

      watchQueue.forEach((queueItem) => {
        if (
          queueItem.season_id === sessionProps.contentId &&
          queueItem.start_time === sessionProps.session.start_time
        ) {
          button.classList.add("iref-disabled");
          button.classList.remove("btn-success");
          button.innerHTML = "Queued";
        }
      });
    }
  }, 300);
}

const id = getFeatureID(import.meta.url);
const bodyClass = "iref-" + id;

features.add(id, true, selector, bodyClass, init);
