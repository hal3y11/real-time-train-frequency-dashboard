# Real-Time Train Frequency Dashboard

A browser-based dashboard that monitors train frequency for selected London Underground stations. The project uses a Node.js middleware service to receive MQTT data and forward updates to the browser through WebSockets.

## Features

- Subscribe to and unsubscribe from selected station topics
- Receive real-time data through an MQTT broker
- Forward live updates from Node.js to the browser with WebSockets
- Count trains reported at a platform during three-minute intervals
- Display connection status and station updates in a responsive interface
- Keep broker credentials outside the source code with environment variables

## Technologies

- HTML5
- CSS3
- JavaScript
- Node.js
- MQTT
- WebSockets
- HiveMQ Cloud

## Architecture

```text
HiveMQ MQTT broker
        ↓
Node.js middleware
        ↓
WebSocket server
        ↓
Browser dashboard
```

## Project Structure

```text
train-frequency-dashboard/
├── client/
│   ├── index.html
│   ├── index.js
│   └── style.css
├── middleware/
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the environment file

Copy `.env.example` and rename the copy to `.env`.

On Windows Command Prompt:

```bat
copy .env.example .env
```

Add your own HiveMQ Cloud host, username, and password to `.env`:

```env
MQTT_HOST=your-cluster.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=your-hivemq-username
MQTT_PASSWORD=your-hivemq-password
WEBSOCKET_PORT=8080
```

Do not commit the `.env` file to GitHub.

### 3. Start the middleware

```bash
npm run dev
```

The terminal should report that the MQTT client is connected and the WebSocket server is running on port `8080`.

### 4. Open the dashboard

Open `client/index.html` with the VS Code Live Server extension. You can also run:

```bash
npx serve client
```

Then open the local address shown in the terminal.

## Available Commands

```bash
npm run dev
npm start
npm run check
```

## Security

Broker credentials are read from `.env`, which is excluded through `.gitignore`. If credentials were previously included directly in source code or shared in a ZIP file, replace them in HiveMQ before using this version.

## Author

Heliya Fernando
