# City Cleanup Challenge

A comprehensive location-based cleanup event platform with React Native (Expo) frontend and Node.js Express backend. Join cleanup events, track your environmental impact, and help make your city cleaner!

## Recent Enhancements (v2.0)

🚀 **Admin Panel & Management System** — Complete administrative interface with role-based access control
📊 **Advanced Analytics Dashboard** — Real-time system metrics with comprehensive usage tracking  
🎯 **Plan Management System** — Create and manage cleanup plans with unique identification codes
👥 **User Role Management** — Admin and user roles with granular permission controls
📈 **Usage Analytics** — Track all user actions and system activities with detailed reporting
🔐 **Enhanced Security** — Role-based authentication with secure admin endpoints
✅ **GitHub Integration** — Proper commit attribution and contribution tracking setup

### Latest Updates (January 24, 2026)
- ✅ **Admin System Complete** — Full admin panel implementation with database integration
- ✅ **Role-Based Authentication** — Secure user/admin role system with middleware protection  
- ✅ **Analytics Dashboard** — Real-time usage tracking and system monitoring capabilities
- ✅ **Git Configuration Fixed** — Proper author attribution for GitHub contribution chart
- ✅ **Documentation Enhanced** — Comprehensive README with v2.0 feature coverage

## Features

### Location-Based Events
- **GPS-Enabled Events**: Create and find cleanup events with precise GPS coordinates
- **Interactive Map**: View all events on an interactive map with color-coded markers
- **Location Check-ins**: Verify attendance with GPS-based check-ins
- **Real-time Updates**: Live event status and participant tracking

### Impact Tracking
- **Progress Logging**: Track waste collected (weight, type, notes)
- **Personal Impact**: View your total environmental impact across all events
- **Event Statistics**: See collective progress for each cleanup event
- **Achievement History**: Historical view of all your cleanup contributions

### Social Features
- **Event Creation**: Create and manage your own cleanup events
- **Community Posts**: Share experiences and motivate others
- **User Profiles**: Manage your account and track personal progress
- **Chatbot Guide**: Get help with app features and cleanup tips

### Admin Panel & Management
- **Role-Based Access**: Admin and user roles with permission controls
- **Plan Management**: Create and manage cleanup plans with unique codes
- **User Administration**: Manage user accounts and assign roles
- **System Analytics**: Comprehensive dashboard with real-time metrics
- **Activity Monitoring**: Track all user actions and system usage
- **Plan Code System**: Unique cleanup plan codes for organization

### Advanced Dashboard
- **Real-time Analytics**: Live charts with auto-updating data visualization
- **Interactive Maps**: Oil field locations with status indicators
- **Dark/Light Mode**: Customizable theme switching for better UX
- **Data Export**: Download reports in PDF, Excel, or CSV formats
- **Smart Filtering**: Advanced search and filter capabilities
- **Toast Notifications**: Real-time feedback for user actions
- **PWA Support**: Offline mode with service worker caching
- **Loading States**: Skeleton loaders for smooth user experience
- **Mobile Responsive**: Optimized for all screen sizes

## Project Structure

- `backend/` — Express server with SQLite database, location APIs, and RESTful endpoints
- `city-cleanup-challenge/` — Expo React Native app with maps, GPS, and event management

## Quick Start

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

## App Features

### Main Navigation
- **Events & Map** — Browse and manage cleanup events
- **My Progress** — Track your environmental impact
- **Posts** — Community discussions and sharing
- **Chatbot Guide** — Get help and guidance
- **Profile** — Manage account settings
- **Dashboard** — Advanced analytics and data visualization
- **Admin Panel** — System administration (admin users only)

### Event Management
- Create events with GPS coordinates
- Set date, time, and location details
- Check into events with location verification
- Track cleanup progress and waste collected

## API Endpoints

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
- `POST /login` — User login (returns role information)
- `GET /profile/:username` — Get user profile
- `PUT /profile/:username` — Update user profile

### Admin Panel APIs
- `GET /admin/analytics` — Comprehensive system analytics (admin only)
- `GET /admin/activity` — System activity logs with filtering (admin only)
- `GET /admin/users` — List all users with role information (admin only)
- `PUT /admin/users/:id/role` — Update user roles (admin only)

### Plan Management
- `POST /admin/plans` — Create cleanup plans with codes (admin only)
- `GET /plans` — Get plans (admin sees all, users see active only)
- `PUT /admin/plans/:id` — Update cleanup plans (admin only)
- `DELETE /admin/plans/:id` — Delete cleanup plans (admin only)

### Additional Features
- `POST /chatbot` — Get guidance from chatbot
- `GET /health` — Backend health check

## Database Schema

### Core Tables
- **users** — User accounts with role-based authentication (user/admin)
- **events** — Cleanup events with GPS coordinates
- **event_checkins** — User check-ins with location verification
- **cleanup_progress** — Waste collection tracking
- **posts** — Community posts and discussions

### Admin & Analytics Tables
- **cleanup_plans** — Admin-managed cleanup plans with unique codes
- **usage_analytics** — Comprehensive user activity tracking and system metrics

### Default Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Note**: Created automatically on first database initialization
- **Access**: Full admin panel access with all system management capabilities

### Latest Database Enhancements (v2.0)
- **Role System**: Enhanced user authentication with admin/user role distinction
- **Plan Management**: New cleanup_plans table with unique code generation
- **Analytics Tracking**: Comprehensive usage_analytics table for system monitoring
- **Admin Functions**: Complete administrative backend with secure API endpoints

## Testing

```powershell
Push-Location "D:\PROJECTS\city-cleanup-challenge\backend"
npm test
Pop-Location
```

Tests cover authentication, event management, check-ins, and API functionality.

## App Workflow

### Standard User Flow
1. **Sign Up/Login** — Create account or sign in
2. **Browse Events** — View cleanup events on map or list
3. **Create Events** — Organize your own cleanup events
4. **Check In** — Use GPS to check into events you attend
5. **Track Progress** — Log waste collected and environmental impact
6. **View Dashboard** — Analyze data with real-time charts and maps
7. **Export Reports** — Download your data in PDF, Excel, or CSV
8. **Share & Connect** — Post about your experiences

### Admin User Flow
1. **Admin Login** — Access admin panel with elevated permissions
2. **System Analytics** — Monitor platform usage and performance
3. **Plan Management** — Create and manage cleanup plans with codes
4. **User Administration** — Manage user accounts and assign roles
5. **Activity Monitoring** — Track system usage and user behavior
6. **Content Moderation** — Oversee community posts and events

## Environmental Impact

Track meaningful metrics:
- **Waste Collected** — Total weight in kg across all events
- **Event Participation** — Number of cleanup events attended
- **Community Impact** — Collective progress by location
- **Personal Growth** — Your cleanup journey over time

## Dashboard Features

The advanced dashboard provides comprehensive data visualization and analytics:

### Real-time Analytics
- **Live Charts**: Auto-updating visualizations with Chart.js
- **Data Streaming**: Real-time updates every 3 seconds
- **Multiple Chart Types**: Bar charts, line graphs, and custom visualizations

### Interactive Mapping
- **Oil Field Locations**: Visual markers for cleanup sites
- **Status Indicators**: Active, Operational, Maintenance states
- **GPS Coordinates**: Precise location tracking
- **Custom Markers**: Color-coded location status

### User Experience
- **Dark/Light Mode**: Theme toggle for accessibility
- **Toast Notifications**: Non-intrusive real-time feedback
- **Loading Skeletons**: Smooth placeholder animations
- **Mobile Responsive**: Adapts to all screen sizes

### Data Management
- **Search Functionality**: Real-time search across records
- **Advanced Filters**: Multiple filter options (Active, Date, Priority, Status)
- **Export Options**: Download data as PDF, Excel, or CSV
- **PWA Capabilities**: Offline support with service worker caching

For detailed dashboard documentation, see [DASHBOARD_README.md](city-cleanup-challenge/DASHBOARD_README.md)

## Admin Panel Features

The comprehensive admin panel provides powerful management and analytics capabilities for system administrators.

### System Analytics Dashboard
- **User Statistics**: Total users, admin count, registration trends
- **Event Metrics**: Total events, active events, participation rates  
- **Plan Management**: Cleanup plans created, active plans, completion rates
- **Waste Impact**: Total waste collected, progress tracking, environmental impact
- **Real-time Activity**: Live feed of recent user actions and system events

### Plan & Code Management
- **Create Plans**: Design cleanup plans with unique identification codes
- **Plan Details**: Set target waste amounts, estimated durations, difficulty levels
- **Area Assignment**: Specify cleanup areas and geographic locations  
- **Status Control**: Activate, deactivate, or archive cleanup plans
- **Code Validation**: Automatic unique code generation and validation

### User Administration
- **Role Management**: Assign admin or user roles to accounts
- **User Overview**: View user registration dates and last login times
- **Account Control**: Monitor user activity and account status
- **Bulk Operations**: Manage multiple users efficiently
- **Permission Control**: Fine-grained access control throughout the system

### Activity Monitoring & Audit
- **Action Tracking**: Comprehensive logging of all user actions
- **System Events**: Monitor logins, plan creation, role changes
- **Audit Trail**: Complete activity history with timestamps and details
- **Filtering Options**: Search by user, action type, date ranges
- **Security Monitoring**: Track IP addresses and user agents for security

### Admin Access & Security
- **Default Admin**: Created automatically (`admin` / `admin123`)
- **Role-Based Access**: All admin endpoints protected with permission checks
- **Secure APIs**: Authentication required for all administrative functions
- **Activity Logging**: All admin actions automatically tracked and recorded

## Tech Stack

### Frontend
- React Native (Expo) with cross-platform compatibility
- expo-location (GPS/geolocation services)
- react-native-maps (Interactive mapping)
- Chart.js & D3.js (Data visualization and analytics)
- React Hot Toast (Real-time notifications)
- jsPDF & XLSX (Data export capabilities)
- Leaflet (Advanced mapping features)
- Service Workers (PWA/offline support)
- Modern responsive UI components

### Backend
- Node.js with Express framework
- SQLite database with persistent storage
- RESTful API design with comprehensive endpoints
- CORS enabled for cross-origin requests
- Role-based authentication and authorization
- Activity tracking and analytics logging
- Admin panel APIs with security middleware

### Admin & Analytics
- Real-time system metrics and monitoring
- Comprehensive user activity tracking
### Development Workflow
- Use feature branches and PRs for all changes
- Commit messages: `type(scope): subject` (e.g., `feat(admin): add plan management`, `fix(auth): role validation`)
- Test your changes before submitting (backend has Jest test suite)
- Follow established code patterns and conventions

### Recent Development Updates
- ✅ **Admin Panel Implementation** — Complete administrative interface added
- ✅ **Role-Based Authentication** — User and admin roles with secure endpoints  
- ✅ **Plan Management System** — Cleanup plan creation with unique codes
- ✅ **Usage Analytics** — Comprehensive activity tracking and reporting
- ✅ **Enhanced Documentation** — Updated README with v2.0 feature coverage
- ✅ **Database Schema Updates** — New tables for admin functions and analyticsreporting
- Audit trail for security and compliance

## Contributing

- Use feature branches and PRs
- Commit messages: `type(scope): subject` (e.g., `feat(frontend): add event filtering`)
- Test your changes before submitting

## License

This project is for demo and educational purposes. Add appropriate license if publishing commercially.

