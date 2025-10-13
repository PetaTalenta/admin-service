# Admin Service - Phase 2

Admin Service for FutureGuide Backend - Comprehensive admin dashboard monitoring and management system.

## Phase 1: Foundation & Authentication ✅

### Features Implemented
- ✅ Service Setup with Express.js
- ✅ Health Check Endpoints (basic, detailed, ready, live)
- ✅ Authentication Integration with auth-service
- ✅ Multi-Schema Database Connections (auth, assessment, archive, chat)
- ✅ Security Middleware (Helmet, CORS, Rate Limiting)
- ✅ Input Validation with Joi
- ✅ Error Handling Middleware
- ✅ Logging System with Winston
- ✅ Admin Login/Logout Endpoints
- ✅ JWT Token Validation
- ✅ Role-Based Access Control

## Phase 2: User Management Module ✅

### Features Implemented
- ✅ User List & Search with Pagination
- ✅ User Details with Statistics
- ✅ User Profile Updates
- ✅ Token Balance Management
- ✅ Token History Tracking
- ✅ User Activity Logs
- ✅ User Jobs Listing
- ✅ User Conversations Listing
- ✅ Advanced Filtering (by user_type, is_active, auth_provider)
- ✅ Comprehensive Input Validation

### API Endpoints

#### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with database status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

#### Authentication
- `POST /admin/auth/login` - Admin login (rate limited: 10 req/15min)
- `POST /admin/auth/logout` - Admin logout (requires authentication)
- `GET /admin/auth/verify` - Verify admin token (requires authentication)

#### User Management (Phase 2)
- `GET /admin/users` - Get paginated list of users with search and filter
- `GET /admin/users/:id` - Get detailed user information
- `PUT /admin/users/:id` - Update user information
- `GET /admin/users/:id/tokens` - Get user token history
- `PUT /admin/users/:id/tokens` - Update user token balance
- `GET /admin/users/:id/jobs` - Get user's analysis jobs
- `GET /admin/users/:id/conversations` - Get user's conversations

### Environment Variables

See `.env.example` for all required environment variables.

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start the service
npm start

# Development mode with auto-reload
npm run dev
```

### Docker

```bash
# Build image
docker build -t fg-admin-service .

# Run container
docker run -p 3007:3007 --env-file .env fg-admin-service
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Watch mode
npm run test:watch
```

### Architecture

```
admin-service/
├── src/
│   ├── config/
│   │   └── database.js          # Multi-schema database connections
│   ├── controllers/
│   │   └── authController.js    # Authentication controllers
│   ├── middleware/
│   │   ├── auth.js              # JWT validation middleware
│   │   ├── errorHandler.js      # Error handling
│   │   ├── rateLimiter.js       # Rate limiting
│   │   └── validation.js        # Input validation
│   ├── routes/
│   │   ├── auth.js              # Auth routes
│   │   └── health.js            # Health check routes
│   ├── services/
│   │   └── authService.js       # Auth service integration
│   ├── utils/
│   │   ├── logger.js            # Winston logger
│   │   └── responseFormatter.js # Response formatting
│   ├── app.js                   # Express app setup
│   └── server.js                # Server entry point
├── logs/                        # Log files
├── Dockerfile
├── package.json
└── README.md
```

### Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: 
  - Admin endpoints: 100 req/15min
  - Auth endpoints: 10 req/15min
- **Input Validation**: Joi schema validation
- **JWT Validation**: Via auth-service
- **Role-Based Access**: Admin/Superadmin only

### Database Schemas

The service connects to multiple PostgreSQL schemas:
- **auth**: User accounts and profiles
- **assessment**: Assessment data and idempotency
- **archive**: Analysis jobs, results, and metrics
- **chat**: Conversations and messages

### Logging

Logs are written to:
- Console (formatted based on environment)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

Log levels: error, warn, info, http, debug

### Testing Phase 2

Run the Phase 2 test script:

```bash
# Make sure the service is running
npm start

# In another terminal, run the test script
node test-phase2.js
```

### Next Steps (Phase 3)

- Jobs Monitoring Module
- Job Statistics Dashboard
- Job List & Management
- Job Details & Results
- Real-time Job Monitoring

### Support

For issues or questions, contact the FutureGuide development team.

---

**Version**: 2.0.0
**Phase**: 2 - User Management Module
**Status**: ✅ Complete

