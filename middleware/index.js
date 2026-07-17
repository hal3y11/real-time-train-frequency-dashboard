"use strict";

import "dotenv/config";
import mqtt from "mqtt";
import { WebSocket, WebSocketServer } from "ws";

const webSocketPort = Number(process.env.WEBSOCKET_PORT) || 8080;
const mqttHost = process.env.MQTT_HOST;
const mqttPort = Number(process.env.MQTT_PORT) || 8883;
const mqttUsername = process.env.MQTT_USERNAME;
const mqttPassword = process.env.MQTT_PASSWORD;

const missingVariables = [
  ["MQTT_HOST", mqttHost],
  ["MQTT_USERNAME", mqttUsername],
  ["MQTT_PASSWORD", mqttPassword]
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingVariables.length > 0) {
  console.error(
    `Missing environment variables: ${missingVariables.join(", ")}. ` +
      "Copy .env.example to .env and add your HiveMQ credentials."
  );
  process.exit(1);
}

const mqttUrl = `mqtts://${mqttHost}:${mqttPort}`;
const mqttOptions = {
  clean: true,
  username: mqttUsername,
  password: mqttPassword,
  reconnectPeriod: 2000,
  connectTimeout: 10_000
};

const trackedTopics = new Set();
const trainCounts = new Map();

const mqttClient = mqtt.connect(mqttUrl, mqttOptions);
const wsServer = new WebSocketServer({ port: webSocketPort });

function broadcastToClients(message) {
  const payload = JSON.stringify(message);

  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function subscribeTopic(topic) {
  if (!topic || trackedTopics.has(topic)) {
    return;
  }

  mqttClient.subscribe(topic, (error) => {
    if (error) {
      console.error(`Unable to subscribe to ${topic}:`, error.message);
      return;
    }

    trackedTopics.add(topic);
    trainCounts.set(topic, 0);
    console.log(`Subscribed to ${topic}`);

    broadcastToClients({
      msgType: "cmd",
      payload: { msg: "sub", topic }
    });
  });
}

function unsubscribeTopic(topic) {
  if (!topic || !trackedTopics.has(topic)) {
    return;
  }

  mqttClient.unsubscribe(topic, (error) => {
    if (error) {
      console.error(`Unable to unsubscribe from ${topic}:`, error.message);
      return;
    }

    trackedTopics.delete(topic);
    trainCounts.delete(topic);
    console.log(`Unsubscribed from ${topic}`);

    broadcastToClients({
      msgType: "cmd",
      payload: { msg: "unsub", topic }
    });
  });
}

function handleClientMessage(rawMessage) {
  try {
    const message = JSON.parse(rawMessage.toString());
    const command = message?.payload?.msg;
    const topic = message?.payload?.topic;

    if (message?.msgType !== "cmd" || typeof topic !== "string") {
      return;
    }

    if (command === "sub") {
      subscribeTopic(topic);
    } else if (command === "unsub") {
      unsubscribeTopic(topic);
    }
  } catch (error) {
    console.error("Invalid WebSocket message:", error.message);
  }
}

const frequencyTimer = setInterval(() => {
  trackedTopics.forEach((topic) => {
    const count = trainCounts.get(topic) || 0;

    broadcastToClients({
      msgType: "dat",
      payload: {
        topic,
        msg: `Trains at platform in last 3 minutes: ${count}`,
        updatedAt: new Date().toISOString()
      }
    });

    trainCounts.set(topic, 0);
  });
}, 180_000);

mqttClient.on("connect", () => {
  console.log(`Connected securely to MQTT broker at ${mqttHost}.`);
});

mqttClient.on("message", (topic, message) => {
  try {
    const trains = JSON.parse(message.toString());

    if (!Array.isArray(trains)) {
      return;
    }

    const trainsAtPlatform = trains.filter((train) =>
      train.currentLocation?.toLowerCase().includes("platform")
    ).length;

    trainCounts.set(topic, (trainCounts.get(topic) || 0) + trainsAtPlatform);
  } catch (error) {
    console.error("Failed to parse MQTT message:", error.message);
  }
});

mqttClient.on("error", (error) => {
  console.error("MQTT connection error:", error.message);
});

wsServer.on("connection", (socket) => {
  console.log("Client connected through WebSocket.");
  socket.on("message", handleClientMessage);
  socket.on("close", () => console.log("WebSocket client disconnected."));
  socket.on("error", (error) =>
    console.error("WebSocket client error:", error.message)
  );
});

wsServer.on("listening", () => {
  console.log(`WebSocket server running at ws://localhost:${webSocketPort}`);
});

function shutDown() {
  clearInterval(frequencyTimer);
  wsServer.close();
  mqttClient.end(true, () => process.exit(0));
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
