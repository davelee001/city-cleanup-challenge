# City Cleanup Challenge

A comprehensive location-based cleanup event platform with React Native (Expo) frontend and Node.js Express backend. Join cleanup events, track your environmental impact, and help make your city cleaner!

## ✨ Features

### 🗺️ Location-Based Events
- **GPS-Enabled Events**: Create and find cleanup events with precise GPS coordinates
- **Interactive Map**: View all events on an interactive map with color-coded markers
- **Location Check-ins**: Verify attendance with GPS-based check-ins
- **Real-time Updates**: Live event status and participant tracking

### 📊 Impact Tracking
- **Progress Logging**: Track waste collected (weight, type, notes)
- **Personal Impact**: View your total environmental impact across all events
- **Event Statistics**: See collective progress for each cleanup event
- **Achievement History**: Historical view of all your cleanup contributions

### 👥 Social Features
- **Event Creation**: Create and manage your own cleanup events
- **Community Posts**: Share experiences and motivate others
- **User Profiles**: Manage your account and track personal progress
- **Chatbot Guide**: Get help with app features and cleanup tips

## Project Structure

- `backend/` — Express server with SQLite database, location APIs, and RESTful endpoints
- `city-cleanup-challenge/` — Expo React Native app with maps, GPS, and event management

## 🚀 Quick Start

### Backend Setup

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

### Frontend Setup (Expo)

```powershell
Push-Location "D:\PROJECTS\city-cleanup-challenge\city-cleanup-challenge"
npm install
npx expo start
Pop-Location
```

**Note**: Location permissions will be requested on first use for GPS functionality.

## 📱 App Features

### Main Navigation
- **🗺️ Events & Map** — Browse and manage cleanup events
- **📊 My Progress** — Track your environmental impact
- **💬 Posts** — Community discussions and sharing
- **🤖 Chatbot Guide** — Get help and guidance
- **👤 Profile** — Manage account settings

### Event Management
- Create events with GPS coordinates
- Set date, time, and location details
- Check into events with location verification
- Track cleanup progress and waste collected

## 🔧 API Endpoints

### Event Management
- `POST /events` — Create cleanup event with GPS coordinates
- `GET /events` — Get all active events
- `GET /events/:id` — Get specific event details
- `PUT /events/:id` — Update event (creator only)
- `DELETE /events/:id` — Cancel event (creator only)

### Check-in System
- `POST /events/:id/checkin` — Check into event with location verification
- `GET /events/:id/checkins` — View event check-ins
- `GET /users/:username/checkins` — User's check-in history

### Progress Tracking
- `POST /events/:id/progress` — Log cleanup progress and waste collected
- `GET /events/:id/progress` — View event progress with totals
- `GET /users/:username/progress` — User's cleanup impact across events

### Posts & Social
- `POST /posts` — Create community posts
- `GET /posts` — Get all posts
- `PUT /posts/:id` — Edit post (owner only)
- `DELETE /posts/:id` — Delete post (owner only)

### Authentication
- `POST /signup` — Register new user
- `POST /login` — User login
- `GET /profile/:username` — Get user profile
- `PUT /profile/:username` — Update user profile

### Additional Features
- `POST /chatbot` — Get guidance from chatbot
- `GET /health` — Backend health check

## 🗄️ Database Schema

### Core Tables
- **users** — User accounts and authentication
- **events** — Cleanup events with GPS coordinates
- **event_checkins** — User check-ins with location verification
- **cleanup_progress** — Waste collection tracking
- **posts** — Community posts and discussions

## 🧪 Testing

```powershell
Push-Location "D:\PROJECTS\city-cleanup-challenge\backend"
npm test
Pop-Location
```

Tests cover authentication, event management, check-ins, and API functionality.

## 📋 App Workflow

1. **Sign Up/Login** — Create account or sign in
2. **Browse Events** — View cleanup events on map or list
3. **Create Events** — Organize your own cleanup events
4. **Check In** — Use GPS to check into events you attend
5. **Track Progress** — Log waste collected and environmental impact
6. **Share & Connect** — Post about your experiences

## 🌍 Environmental Impact

Track meaningful metrics:
- **Waste Collected** — Total weight in kg across all events
- **Event Participation** — Number of cleanup events attended
- **Community Impact** — Collective progress by location
- **Personal Growth** — Your cleanup journey over time

## 💻 Tech Stack

### Frontend
- React Native (Expo)
- expo-location (GPS/geolocation)
- react-native-maps (Interactive maps)
- Modern UI components

### Backend
- Node.js with Express
- SQLite database with persistent storage
- RESTful API design
- CORS enabled for cross-origin requests

## 🤝 Contributing

- Use feature branches and PRs
- Commit messages: `type(scope): subject` (e.g., `feat(frontend): add event filtering`)
- Test your changes before submitting

## 📄 License

This project is for demo and educational purposes. Add appropriate license if publishing commercially.

