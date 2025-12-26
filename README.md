# City Cleanup Challenge

A simple monorepo containing a React Native (Expo) frontend and a Node.js Express backend.

## Project Structure

- `backend/` — Express server with health endpoint and basic middleware.
- `city-cleanup-challenge/` — Expo app (React Native) with router-based navigation.

## Backend Quick Start

Prerequisites: Node.js 18+

```powershell
Push-Location "D:\PROJECTS\city-cleanup-challenge\backend"
copy .env.example .env
npm install
npm run dev
# In another terminal, check health
npm run health
Pop-Location
```

- Health: `GET /health` returns `{ status: "ok" }`.
- Info: `GET /api/info` returns basic app details.
- Web: `GET /` returns a sample web page.

## Frontend Quick Start (Expo)

```powershell
Push-Location "D:\PROJECTS\city-cleanup-challenge\city-cleanup-challenge"
npm install
npx expo start
Pop-Location
```

## Contributing

- Use feature branches and PRs.
- Commit messages: `type(scope): subject` (e.g., `feat(backend): add reports endpoint`).

## License

This project is for demo purposes; add a license if publishing.
