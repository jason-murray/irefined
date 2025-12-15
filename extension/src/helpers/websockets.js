import { io } from "socket.io-client";
import { log } from "../features/logger.js";

let wsInitCheck = setInterval(() => {
  if (SENTRY_RELEASE) {
    clearInterval(wsInitCheck);
    initWS();
  }
}, 1000);

let clientSocket;
let callbacks = [];

function id() {
  var t = function () {
    return Math.floor((1 + Math.random()) * 65536)
      .toString(16)
      .substring(1);
  };
  return t() + t() + "-" + t() + "-" + t() + "-" + t() + "-" + t() + t() + t();
}

function formatSeasonName(seasonName) {
  seasonName = seasonName
    .replace(/(?:\s*-\s*)?\d{4}\sSeason(?:\s\d+)?/, "")
    .replace(/Fixed\s(?:-\s)?Fixed/, "Fixed")
    .replace("Series Series", "Series");
  return seasonName;
}

function initWS() {
  const irVersion = SENTRY_RELEASE.id.substring(
    0,
    SENTRY_RELEASE.id.indexOf("-")
  );

  const authSocket = io("https://members-ng.iracing.com", {
    reconnectionAttempts: 100,
    auth: {
      clientVersion: irVersion,
    },
    transports: ["websocket"],
  });

  clientSocket = io("https://members-ng.iracing.com/client.io", {
    reconnectionAttempts: 100,
    auth: {
      clientVersion: irVersion,
    },
    transports: ["websocket"],
  });

  authSocket.on("connect", () => {
    log("⚡ Connected to iRacing");
  });

  authSocket.on("disconnect", () => {
    log("⛓️‍💥 Disconnected from iRacing");
  });

  clientSocket.on("initialized", (data) => {
    authSocket.emit("now");

    clientSocket.emit("data_services", {
      refid: id(),
      service: "season",
      method: "popular_sessions",
      args: {
        include_empty_practice: false,
        subscribe: true,
      },
    });
  });

  authSocket.on("heartbeat", (data) => {
    return data();
  });

  clientSocket.on("data_services_push", (data) => {
    callbacks.forEach((callback) => {
      callback(data);
    });

    if (!window.irefIndex) {
      window.irefIndex = {};
      try {
        data.data.sessions.forEach((session) => {
          window.irefIndex[session.season_id] = formatSeasonName(
            session.season_name
          );
        });
      } catch {}
    }
  });
}

function send(event, data) {
  data.refid = id();
  clientSocket.emit(event, data);
}

function withdraw() {
  log("🚫 Withdrawing from current session");
  send("data_services", {
    service: "registration",
    method: "withdraw",
    args: {},
  });
}

function register(
  session_name,
  car_id,
  car_class_id,
  session_id,
  subsession_id = null
) {
  log(`📝 Registering for ${session_name}`);

  const data = {
    service: "registration",
    method: "register",
    args: {
      register_as: "driver",
      car_id: car_id,
      car_class_id: car_class_id,
      session_id: session_id,
    },
  };

  if (subsession_id) {
    data.args.subsession_id = subsession_id;
  }

  send("data_services", data);
}

const ws = {
  send,
  register,
  withdraw,
  callbacks,
};

export default ws;
