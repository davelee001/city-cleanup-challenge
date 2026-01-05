# City Cleanup Challenge

A simple monorepo containing a React Native (Expo) frontend and a Node.js Express backend.

## Project Structure

- `backend/` — Express server with health endpoint and basic middleware.
- `city-cleanup-challenge/` — Expo app (React Native) with router-based navigation.


## Authentication Features

### Backend

- `POST /signup` — Register a new user. Send `{ username, password }` in the request body. Returns success or error if username exists.
- `POST /login` — Log in with existing credentials. Send `{ username, password }` in the request body. Returns success or error if credentials are invalid.

User data is stored in memory for demonstration purposes. No persistent storage is used.

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

Health Page: `GET /health` returns an HTML page displaying the backend status.
Health Data: `GET /api/health-data` returns `{ status: "ok" }`.
Info: `GET /api/info` returns basic app details.
Web: `GET /` returns a sample web page.


## Frontend Quick Start (Expo)

```powershell
Push-Location "D:\PROJECTS\city-cleanup-challenge\city-cleanup-challenge"
npm install
npx expo start
Pop-Location
```

### Authentication UI

The Expo app now includes:

- **Sign Up page**: Allows new users to register (sends data to backend `/signup` endpoint).
- **Login page**: Allows registered users to log in (sends data to backend `/login` endpoint).
- After login, users see a welcome message.

The frontend is now fully connected to the backend API for authentication. All registration and login actions are performed via HTTP requests to the backend server.

Switch between login and signup using the provided links below each form.
## Contributing

- Use feature branches and PRs.
- Commit messages: `type(scope): subject` (e.g., `feat(backend): add reports endpoint`).

## License

This project is for demo purposes; add a license if publishing.

