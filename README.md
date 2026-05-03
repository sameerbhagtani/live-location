# Live Location Sharing

A real-time collaborative location sharing application that enables authenticated users to view and broadcast their live locations on an interactive map. Users can see other connected users' locations in real-time and receive instant updates when locations change or users disconnect.

This project is part of my [ChaiCode Web Dev Cohort 2026 Archive](https://github.com/sameerbhagtani/web-dev-cohort-2026). Checkout my entire journey there!

## Overview

Live Location Sharing is a full-stack web application that demonstrates event-driven architecture using Apache Kafka as the message broker. The system decouples location producers (clients) from consumers (UI updates and persistence layer), enabling horizontal scaling and reliable event processing. Users authenticate via a custom OAuth 2.0 and OpenID Connect server, and only authenticated users can appear on the shared map with their names displayed on location markers.

## Local Setup

### Prerequisites

- Node.js 18+ (npm 9+)
- Docker and Docker Compose
- PostgreSQL 12+ (for running the auth server separately)
- Git

### Installation

1. Clone the repository

```bash
git clone https://github.com/sameerbhagtani/live-location.git
cd live-location
```

2. Install dependencies

```bash
npm install
```

3. Start Docker Compose (Kafka broker)

```bash
npm run db:up
```

4. Create Kafka topic (run once)

```bash
node kafka-admin.js
```

5. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your OAuth credentials.

6. Start the server and consumer

```bash
node index.js &
node database-processor.js &
```

The application will run on `http://localhost:5000`.

## Live URL

Deployed at: `https://live-location.sameerbhagtani.dev`

## Tech Stack

Frontend:

- Leaflet.js (interactive map rendering)
- Socket.IO client (real-time WebSocket communication)
- Vanilla JavaScript (no frameworks)
- CSS3 (responsive design)

Backend:

- Express.js 5 (HTTP server)
- Socket.IO 4 (WebSocket server)
- Apache Kafka (event streaming and message broker)
- KafkaJS (Kafka client for Node.js)
- jose (JWT verification and validation)
- axios (HTTP client for OAuth token exchange)
- cookie-parser (HTTP-only cookie handling)
- dotenv (environment configuration)

External Services:

- Custom OIDC/OAuth 2.0 server at https://auth.sameerbhagtani.dev

## Architecture and Data Flow

### Real-Time Location Update Flow

1. User opens the application and clicks Login
2. Browser redirects to the custom OIDC server for authentication
3. After successful login, the server sets an HTTP-only id_token cookie
4. User's browser retrieves location from the device geolocation API every 10 seconds
5. Socket.IO client emits location update to the server
6. Server validates the id_token and publishes message to Kafka topic "location-updates"
7. Kafka message structure: "userId as key, {userId, userName, latitude, longitude} as value"
8. Two consumers process the message independently:
    - Socket.IO consumer (same server) re-broadcasts to all connected clients via "server:location:update" event
    - Database processor logs message for future persistence or audit trails
9. Connected clients receive the update and render markers on the Leaflet map
10. Map displays user markers with popups showing userName

### Message Format

Kafka messages published to "location-updates" topic:

```json
{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "userName": "John Doe",
    "latitude": 28.6139,
    "longitude": 77.209,
    "timestamp": "2026-05-04T15:30:45.123Z"
}
```

### Consumer Groups

The system uses two independent Kafka consumer groups:

- "socket-server-5000": Receives location updates and broadcasts to all connected WebSocket clients in real-time
- "database-processor": Receives the same messages independently for logging and future database persistence

This decoupling ensures that UI updates and data persistence do not block each other.

## Authentication

User authentication is delegated to a custom OIDC/OAuth 2.0 server hosted at https://auth.sameerbhagtani.dev. The authorization code flow is used:

1. User initiates login and is redirected to the auth server
2. After authentication, the auth server redirects back with an authorization code
3. Backend exchanges the code for tokens (access_token, id_token, refresh_token)
4. The id_token (JWT) is validated using the auth server's JWKS endpoint
5. User claims (sub, name, email) are extracted from the verified id_token
6. The id_token is stored in an HTTP-only, SameSite-strict cookie for subsequent requests
7. All future requests validate the token from the cookie before granting access

Only authenticated users can emit location updates or connect via Socket.IO. The id_token is verified on every Socket.IO connection and HTTP request.

## Database Processor

The database-processor.js runs as a separate long-lived process that subscribes to the "location-updates" Kafka topic as a consumer. It simulates location history logging by:

1. Receiving location update messages from Kafka
2. Parsing the message payload (userId, userName, latitude, longitude)
3. Logging the message to console with a timestamp (format: ISO 8601)
4. Acknowledging the message to Kafka via heartbeat

This consumer can be replaced with actual database write logic (INSERT into PostgreSQL, MongoDB, or other storage). The decoupling via Kafka allows database writes to happen asynchronously without blocking the real-time map updates. If the database is slow or temporarily unavailable, location updates continue flowing to connected users without interruption.

Example console output from database-processor:

```
[2026-05-04T15:30:45.123Z] INSERT INTO DB - User: John Doe (123e4567-e89b-12d3-a456-426614174000), Location: (28.6139, 77.2090)
[2026-05-04T15:30:55.456Z] INSERT INTO DB - User: Jane Smith (456e5678-e89b-12d3-a456-426614174111), Location: (28.5355, 77.3910)
```

## Features

- Real-time location sharing with authenticated users
- Responsive map view with Leaflet.js
- User marker display with names and popups
- Automatic marker removal when users logout or close browser
- OAuth 2.0 / OIDC authentication integration
- Message-driven architecture using Apache Kafka
- Independent producer and consumer processes
- HTTP-only cookie security for token storage
- Location update every 10 seconds (configurable)
