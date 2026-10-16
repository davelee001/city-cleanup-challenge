# City Cleanup Backend

Optional Gemma 3 Vision: [setup, security, tests and demo](../docs/GEMMA_SMART_VERIFICATION.md).
Disabled by default; human review and existing rewards remain authoritative.

A clean Express.js backend for the City Cleanup project.

## Setup

1. Copy env file:

```bash
copy .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Run the server:

```bash
npm run dev
```

4. Health check (server must be running):

```bash
npm run health
```

## Environment

- PORT: Server port (default 3000)

## API

- GET /health → `{ status: "ok", service: "city-cleanup-backend" }`
- GET /api/info → basic app info
