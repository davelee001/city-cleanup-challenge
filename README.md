# City Cleanup Challenge

A comprehensive location-based cleanup event platform with React Native (Expo) frontend and Node.js Express backend. Join cleanup events, track your environmental impact, and help make your city cleaner!

## Latest Enhancements (v2.4 - February 2026)

📷 **Complete Image Upload System** — Comprehensive photo documentation for cleanup events
🖼️ **Before/After Photo Tracking** — Visual proof of environmental impact with GPS metadata
👤 **Profile Avatar Upload** — Personalized user profiles with custom avatars
📊 **Visual Progress Documentation** — Photo-enhanced cleanup progress tracking
🔧 **Multer Integration** — Professional-grade file upload handling with security
🎨 **Enhanced UI Components** — New reusable image upload components

### New Image Upload Features (February 20, 2026)
- ✅ **Image Upload Service** — Complete backend service for handling file uploads with validation
- ✅ **Avatar Upload System** — Users can upload and manage profile pictures  
- ✅ **Progress Photo Documentation** — Before/after photo upload for cleanup events
- ✅ **Reusable Upload Components** — Modular React components for various upload types
- ✅ **Image Processing Pipeline** — Automatic image optimization and thumbnail generation
- ✅ **Secure File Storage** — Organized directory structure with file validation
- ✅ **REST API Endpoints** — Complete API coverage for image upload operations

## Recent Enhancements (v2.3)

🚀 **Complete DevOps Infrastructure** — Docker, Kubernetes, CI/CD with GitHub Actions
📊 **Comprehensive Monitoring** — Prometheus, Grafana, Sentry, Application Insights
📝 **Log Aggregation** — Centralized logging with Loki and structured logging
🔔 **Intelligent Alerting** — Multi-channel alerts with Prometheus and Alertmanager
🏥 **Health Monitoring** — Advanced health checks and uptime monitoring
🔐 **Azure Key Vault Integration** — Secure secrets management
🧪 **Complete Testing Suite** — Unit, integration, and E2E tests with Playwright

## Previous Enhancements (v2.2)

🎯 **Event-Driven Architecture** — Implemented publish/subscribe pattern for decoupled, scalable services.
🚀 **API Versioning** — All backend endpoints are now versioned under `/api/v1` for better scalability and future-proofing.
🎨 **Modernized UI** — Enhanced user authentication screens with a fresh, modern look.
👤 **Enhanced Profile Management** — Users can now upload a profile avatar for personalization.
💳 **Subscription Management** — New dashboard for viewing and managing subscription tiers.
🏠 **Redesigned Home Screen** — New grid-based layout for easier and more intuitive navigation.
🚀 **Admin Panel & Management System** — Complete administrative interface with role-based access control
📊 **Advanced Analytics Dashboard** — Real-time system metrics with comprehensive usage tracking  
🎯 **Plan Management System** — Create and manage cleanup plans with unique identification codes
👥 **User Role Management** — Admin and user roles with granular permission controls
📈 **Usage Analytics** — Track all user actions and system activities with detailed reporting
🔐 **Enhanced Security** — Role-based authentication with secure admin endpoints
✅ **GitHub Integration** — Proper commit attribution and contribution tracking setup

### Latest Updates (January 25, 2026)
- ✅ **Event-Driven Architecture** — Implemented central event emitter for decoupled analytics tracking.
- ✅ **Modular Analytics** — Refactored signup, posts, events, and plans to use event listeners.
- ✅ **API Versioning** — Implemented `/api/v1` for all backend routes and updated frontend clients.
- ✅ **Individual Commits** — Split recent work into separate, feature-specific commits.
- ✅ **Modernized Auth UI** — Refreshed login and signup screens for a better user experience.
- ✅ **Profile Avatars** — Users can now upload and display a profile picture.
- ✅ **Subscription Dashboard** — New screen to display available subscription plans.
- ✅ **Grid Navigation** — Home screen now uses a modern grid-based layout.
- ✅ **Database Schema Updates** — Added support for user avatars and subscriptions.
- ✅ **Admin System Complete** — Full admin panel implementation with database integration
- ✅ **Role-Based Authentication** — Secure user/admin role system with middleware protection  
- ✅ **Analytics Dashboard** — Real-time usage tracking and system monitoring capabilities
- ✅ **Git Configuration Fixed** — Proper author attribution for GitHub contribution chart
- ✅ **Documentation Enhanced** — Comprehensive README with v2.2 feature coverage

## Features

### Location-Based Events
- **GPS-Enabled Events**: Create and find cleanup events with precise GPS coordinates
- **Interactive Map**: View all events on an interactive map with color-coded markers
- **Location Check-ins**: Verify attendance with GPS-based check-ins
- **Real-time Updates**: Live event status and participant tracking

### Impact Tracking
- **Progress Logging**: Track waste collected (weight, type, notes)
- **Photo Documentation**: Upload before/after photos for visual impact proof
- **Personal Impact**: View your total environmental impact across all events
- **Event Statistics**: See collective progress for each cleanup event
- **Achievement History**: Historical view of all your cleanup contributions
- **Visual Progress Gallery**: Browse photos from all your cleanup activities

### Social Features
- **Event Creation**: Create and manage your own cleanup events
- **Community Posts**: Share experiences and motivate others
- **User Profiles**: Manage your account with custom avatar uploads
- **Photo Sharing**: Upload and view cleanup photos from the community
- **Chatbot Guide**: Get help with app features and cleanup tips
- **Visual Impact Stories**: Before/after photo galleries for events

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

### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Start with monitoring
docker-compose --profile monitoring up -d

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:3001
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
```

### Manual Setup

#### Backend Setup

Prerequisites: Node.js 18+

```bash
cd backend
cp .env.example .env
npm install
npm run dev

# In another terminal, check health
npm run health
```

#### Frontend Setup (Expo)

```bash
cd city-cleanup-challenge
npm install
npx expo start
```

**Note**: Location permissions will be requested on first use for GPS functionality.

### Quick Reference

📚 [DevOps Infrastructure Guide](docs/DEVOPS_INFRASTRUCTURE.md)  
📊 [Monitoring Setup](docs/MONITORING.md)  
🔐 [Azure Key Vault Setup](docs/AZURE_KEYVAULT_SETUP.md)  
🚀 [Quick Start Guide](QUICKSTART.md)
 with photo documentation
- **My Progress** — Track your environmental impact with before/after photos
- **Posts** — Community discussions and sharing with image uploads
- **Chatbot Guide** — Get help and guidance
- **Profile** — Manage account settings and upload customnup events
- **My Progress** — Track your environmental impact
- **Posts** — Community discussions and sharing
- **Chatbot Guide** — Get help and guidance
- **Profile** — Manage account settings and avatar
- **Subscription Dashboard** — View and manage subscription plans
- **Dashboard** — Advanced analytics and data visualization
- **Admin Panel** — System administration (admin users only)

### Event Management
- Upload before/after photos for visual documentation
- View photo galleries from community cleanup efforts
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


### Image Upload & Media
- `POST /api/v1/upload/avatar` — Upload user profile avatar with validation
- `POST /api/v1/upload/progress/:eventId` — Upload before/after cleanup photos
- `POST /api/v1/upload/event/:eventId` — Upload general event photos
- `GET /api/v1/user/:username/avatar` — Get user's current avatar
- `GET /api/v1/progress/:eventId/photos` — Get cleanup progress photos
- `GET /api/v1/images/*` — Serve uploaded images (static files)
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

## Image Upload System (v2.4)

### Technical Architecture
- **Backend Service**: `backend/src/services/imageUpload.js` — Complete file handling with multer integration
- **Frontend Components**:
  - `ImageUploader.js` — Reusable component for avatar and photo uploads
  - `ProgressPhotoUploader.js` — Specialized component for before/after cleanup documentation

### File Management
- **Storage Structure**: Organized directories (`uploads/avatars/`, `uploads/events/`, `uploads/progress/`)
- **File Validation**: Image-only uploads (JPEG, PNG, GIF, WebP) with size limits  
- **Security**: Unique filename generation with timestamp and UUID
- **Processing**: Image optimization pipeline (ready for Sharp integration)

### Upload Types
- **Avatar Upload**: Profile pictures with automatic resizing and optimization  
- **Event Photos**: General event documentation and community sharing
- **Progress Documentation**: Before/after photos linked to cleanup progress records

### Database Integration
- **cleanup_progress** table includes `beforePhotoPath` and `afterPhotoPath` columns
- **users** table includes `avatar` column for profile pictures
- **Photo metadata** stored with progress tracking for comprehensive documentation

### API Features
- **File serving**: Static image access via `/api/v1/images/*` endpoints
- **Metadata extraction**: File size, format, and creation date tracking
- **Error handling**: Comprehensive validation and cleanup on upload failures
- **Scalable design**: Ready for cloud storage integration (AWS S3, Azure Blob, etc.)
- `POST /chatbot` — Get guidance from chatbot
- `GET /health` — Backend health check

## Database Schema

### Core Tables
- **users** — User accounts with role-based authentication (user/admin), profile avatar, and subscription status.
- **subscriptions** — Defines subscription tiers and links them to users.
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

### Run All Tests

```bash
# Backend unit tests
cd backend
npm test

# Backend integration tests
npm run test:integration

# E2E tests with Playwright
npx playwright test

# Run with UI
npx playwright test --ui

# Generate coverage report
npm run test:coverage
```

### Test Coverage

- ✅ Unit tests for core services
- ✅ Integration tests for API endpoints
- ✅ End-to-end tests for user workflows
- ✅ Database operation tests
- ✅ Authentication and authorization tests

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

### DevOps & Infrastructure
- **Docker**: Containerized services for backend and frontend
- **Docker Compose**: Local development and production orchestration
- **Kubernetes**: Production deployment with autoscaling and health checks
- **GitHub Actions**: Automated CI/CD pipeline with testing and deployment
- **Azure Container Registry**: Docker image storage
- **Azure Key Vault**: Secure secrets management

### Monitoring & Observability
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Real-time dashboards and visualization
- **Loki**: Centralized log aggregation
- **Promtail**: Log shipping and processing
- **Sentry**: Error tracking and performance monitoring
- **Application Insights**: APM and distributed tracing
- **Alertmanager**: Multi-channel alert routing
- **Winston**: Structured logging service

### Testing
- **Jest**: Unit and integration testing
- **Playwright**: End-to-end browser testing
- **Supertest**: API endpoint testing
- **Code Coverage**: Automated coverage reports
## Monitoring & Observability

Access monitoring dashboards:

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### Available Metrics

- HTTP request rate, latency, and errors
- Database query performance
- Business metrics (events, check-ins, users)
- System metrics (CPU, memory, disk)

### Logs

View aggregated logs in Grafana using Loki datasource:
```bash
# View backend logs
docker-compose logs -f backend

# View all logs with Loki
# Access Grafana → Explore → Select Loki datasource
```

### Error Tracking

Configure Sentry for production error tracking in `backend/.env`:
```env
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production
```

📖 See [MONITORING.md](docs/MONITORING.md) for complete monitoring setup and troubleshooting.

## Deployment

### Kubernetes Deployment

```bash
# Create namespace and apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/

# Configure Azure Key Vault (optional)
# See docs/AZURE_KEYVAULT_SETUP.md

# Monitor deployment
kubectl get pods -n city-cleanup
kubectl logs -f deployment/backend -n city-cleanup
```

### CI/CD Pipeline

The project uses GitHub Actions for automated deployment:

- **Code Quality**: ESLint checks on every commit
- **Testing**: Unit, integration, and E2E tests
- **Security**: Trivy container scanning
- **Deployment**: Automated deployment to Azure Kubernetes Service
- **Notifications**: Slack alerts for build status

📚 See [DEVOPS_INFRASTRUCTURE.md](docs/DEVOPS_INFRASTRUCTURE.md) for complete deployment guide.

## Contributing

### Development Workflow
- Use feature branches and PRs for all changes
- Commit messages: `type(scope): subject` (e.g., `feat(monitoring): add Prometheus metrics`, `fix(auth): role validation`)
- Test your changes before submitting (run `npm test` in backend/)
- Follow established code patterns and conventions

### Running Tests Locally
```bash
# Backend tests
cd backend
npm test                    # Unit tests
npm run test:integration    # Integration tests
npm run test:coverage      # Coverage report

# E2E tests
npx playwright test
npx playwright test --ui   # Interactive mode
```

### Code Quality Standards
- ESLint for code linting
- Jest for testing
- 80%+ test coverage target
- Security scanning with Trivy

📋 See [CONTRIBUTION_TEST.md](CONTRIBUTION_TEST.md) for detailed contribution guidelines.

## License

This project is for demo and educational purposes. Add appropriate license if publishing commercially.

