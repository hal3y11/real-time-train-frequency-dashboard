"use strict";

(() => {
  const subForm = document.getElementById("sub-form");
  const unsubForm = document.getElementById("unsub-form");
  const subSelect = document.getElementById("naptan-sub");
  const unsubSelect = document.getElementById("naptan-unsub");
  const stationData = document.getElementById("station-data");
  const connectionStatus = document.getElementById("connection-status");

  const socket = new WebSocket("ws://127.0.0.1:8080");

  const stationNames = {
    "940GZZLUKSX": "King's Cross St Pancras",
    "940GZZLURSQ": "Russell Square",
    "940GZZLUHBN": "Holborn",
    "940GZZLUCGN": "Covent Garden",
    "940GZZLULSQ": "Leicester Square",
    "940GZZLUPCC": "Piccadilly Circus"
  };

  function setConnectionStatus(message, state) {
    connectionStatus.textContent = message;
    connectionStatus.dataset.state = state;
  }

  function renderStation(topic, message) {
    const id = `station-${topic}`;
    let card = document.getElementById(id);

    if (!card) {
      card = document.createElement("div");
      card.id = id;
      card.className = "station-card";
      stationData.appendChild(card);
    }

    const stationName = document.createElement("strong");
    stationName.textContent = `${stationNames[topic] || topic}: `;

    card.replaceChildren(stationName, document.createTextNode(message));
  }

  function sendCommand(command, topic) {
    if (socket.readyState !== WebSocket.OPEN) {
      setConnectionStatus(
        "The dashboard is not connected. Start the middleware and refresh the page.",
        "error"
      );
      return;
    }

    socket.send(
      JSON.stringify({
        msgType: "cmd",
        payload: { msg: command, topic }
      })
    );
  }

  subForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendCommand("sub", subSelect.value);
  });

  unsubForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendCommand("unsub", unsubSelect.value);
  });

  socket.addEventListener("open", () => {
    setConnectionStatus("Connected to the live data service.", "connected");
  });

  socket.addEventListener("close", () => {
    setConnectionStatus(
      "Disconnected. Start the middleware and refresh the page.",
      "error"
    );
  });

  socket.addEventListener("error", () => {
    setConnectionStatus("Unable to connect to the middleware.", "error");
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      const { msgType, payload } = message;

      if (!payload?.topic) {
        return;
      }

      if (msgType === "dat") {
        renderStation(payload.topic, payload.msg);
      } else if (msgType === "cmd") {
        const action = payload.msg === "sub" ? "Subscribed" : "Unsubscribed";
        renderStation(payload.topic, action);
      }
    } catch (error) {
      console.error("Unable to read server message:", error);
    }
  });
})();
