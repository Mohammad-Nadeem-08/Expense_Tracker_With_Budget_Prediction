# Smart Expense Tracker

Phase 1 establishes the MERN application foundation. Product features are intentionally deferred.

## Structure

```text
client/  React frontend (Vite)
server/  Express API
```

## Prerequisites

- Node.js 20 or newer
- npm

## Run locally

In one terminal:

```bash
cd server
copy .env.example .env
npm run dev
```

In another terminal:

```bash
cd client
npm run dev
```

The API health endpoint is available at `GET http://localhost:5000/api/health`.

## Environment variables

Use `server/.env.example` as the template for local configuration. Do not commit `server/.env`; it will later hold the MongoDB connection URI and JWT secret.
