# Admin Service Docker Guide

**Version**: 1.0.0  
**Date**: 2025-10-14  
**Phase**: 6 - Docker Integration & Production Readiness

---

## Table of Contents

1. [Overview](#overview)
2. [Docker Configuration](#docker-configuration)
3. [Environment Variables](#environment-variables)
4. [Building and Running](#building-and-running)
5. [API Gateway Integration](#api-gateway-integration)
6. [Health Checks and Monitoring](#health-checks-and-monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)
9. [Maintenance Procedures](#maintenance-procedures)

---

## Overview

The Admin Service is containerized using Docker and integrated into the FutureGuide microservices ecosystem. It runs on port 3007 and communicates with:

- **PostgreSQL Database**: Multi-schema access (auth, archive, chat)
- **Redis Cache**: For performance optimization
- **Auth Service**: For authentication and authorization
- **API Gateway**: For external access routing

### Architecture

```
┌─────────────────┐
│  API Gateway    │ :3000
│  (nginx/node)   │
└────────┬────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         v                                 v
┌─────────────────┐              ┌─────────────────┐
│  Auth Service   │ :3001        │  Admin Service  │ :3007
└────────┬────────┘              └────────┬────────┘
         │                                 │
         └─────────────┬───────────────────┘
                       │
         ┌─────────────┴─────────────┬─────────────┐
         v                           v             v
    ┌─────────┐                 ┌────────┐    ┌────────┐
    │PostgreSQL│                 │ Redis  │    │  Logs  │
    │  :5432   │                 │ :6379  │    │ Volume │
    └──────────┘                 └────────┘    └────────┘
```

---

## Docker Configuration

### Dockerfile

The Admin Service uses a multi-stage build optimized for production:

**Location**: `admin-service/Dockerfile`

```dockerfile
# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3007

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "src/server.js"]
```

### .dockerignore

**Location**: `admin-service/.dockerignore`

```
node_modules
npm-debug.log
.env
.env.local
.env.*.local
.git
.gitignore
README.md
.vscode
.idea
*.log
logs/*.log
coverage
.nyc_output
dist
build
.DS_Store
```

---

## Environment Variables

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment mode | `production` | `production` |
| `PORT` | Service port | `3007` | `3007` |
| `DB_HOST` | PostgreSQL host | - | `postgres` |
| `DB_PORT` | PostgreSQL port | `5432` | `5432` |
| `DB_NAME` | Database name | - | `futureguide` |
| `DB_USER` | Database user | - | `postgres` |
| `DB_PASSWORD` | Database password | - | `your_password` |
| `AUTH_SERVICE_URL` | Auth service URL | - | `http://auth-service:3001` |
| `INTERNAL_SERVICE_KEY` | Internal API key | - | `your_secret_key` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DB_LOGGING` | Enable SQL logging | `false` | `true` |
| `DB_POOL_MAX` | Max DB connections | `20` | `20` |
| `DB_POOL_MIN` | Min DB connections | `5` | `5` |
| `DB_POOL_ACQUIRE` | Connection timeout | `30000` | `30000` |
| `DB_POOL_IDLE` | Idle timeout | `10000` | `10000` |
| `REDIS_HOST` | Redis host | - | `redis` |
| `REDIS_PORT` | Redis port | `6379` | `6379` |
| `REDIS_PASSWORD` | Redis password | - | `your_redis_password` |
| `REDIS_DB` | Redis database | `2` | `2` |
| `ALLOWED_ORIGINS` | CORS origins | `*` | `https://app.example.com` |
| `LOG_LEVEL` | Logging level | `info` | `debug` |
| `LOG_FILE` | Log file path | `logs/admin-service.log` | `logs/admin.log` |

### Docker Compose Configuration

**Location**: `docker-compose.yml` (admin-service section)

```yaml
admin-service:
  build:
    context: ./admin-service
    dockerfile: Dockerfile
  container_name: fg-admin-service
  environment:
    NODE_ENV: production
    PORT: 3007
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: ${POSTGRES_DB}
    DB_USER: ${POSTGRES_USER}
    DB_PASSWORD: ${POSTGRES_PASSWORD}
    DB_LOGGING: false
    DB_POOL_MAX: 20
    DB_POOL_MIN: 5
    DB_POOL_ACQUIRE: 30000
    DB_POOL_IDLE: 10000
    AUTH_SERVICE_URL: http://auth-service:3001
    INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}
    ALLOWED_ORIGINS: "*"
    LOG_LEVEL: info
    LOG_FILE: logs/admin-service.log
    REDIS_HOST: redis
    REDIS_PORT: 6379
    REDIS_PASSWORD: ${REDIS_PASSWORD}
    REDIS_DB: 2
  ports:
    - "3007:3007"
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    auth-service:
      condition: service_started
  networks:
    - fg-network
  restart: unless-stopped
  volumes:
    - ./admin-service/logs:/app/logs
```

---

## Building and Running

### Local Development

```bash
# Build the Docker image
docker build -t fg-admin-service:latest ./admin-service

# Run standalone container
docker run -d \
  --name fg-admin-service \
  -p 3007:3007 \
  --env-file .env \
  fg-admin-service:latest

# View logs
docker logs -f fg-admin-service

# Stop container
docker stop fg-admin-service

# Remove container
docker rm fg-admin-service
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# Start only admin-service and dependencies
docker-compose up -d admin-service

# View logs
docker-compose logs -f admin-service

# Restart service
docker-compose restart admin-service

# Stop service
docker-compose stop admin-service

# Remove service
docker-compose down admin-service
```

### Production Build

```bash
# Build optimized production image
docker build \
  --no-cache \
  --build-arg NODE_ENV=production \
  -t fg-admin-service:1.0.0 \
  ./admin-service

# Tag for registry
docker tag fg-admin-service:1.0.0 registry.example.com/fg-admin-service:1.0.0

# Push to registry
docker push registry.example.com/fg-admin-service:1.0.0
```

---

## API Gateway Integration

### Routing Configuration

The API Gateway routes requests to the Admin Service using the `/api/admin/*` path prefix.

**API Gateway Configuration** (example):

```javascript
// In api-gateway routing configuration
{
  path: '/api/admin/*',
  target: 'http://admin-service:3007',
  stripPrefix: '/api',
  requireAuth: true,
  requireAdmin: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 1000 requests per windowMs
  }
}
```

### Endpoint Mapping

| External URL (via Gateway) | Internal URL (Admin Service) | Description |
|----------------------------|------------------------------|-------------|
| `GET /api/admin/users` | `GET /admin/users` | List users |
| `GET /api/admin/jobs/stats` | `GET /admin/jobs/stats` | Job statistics |
| `GET /api/admin/chatbot/stats` | `GET /admin/chatbot/stats` | Chatbot stats |
| `GET /api/admin/system/health` | `GET /admin/system/health` | System health |

**Note**: The `api/` prefix is handled by the API gateway. The admin-service only implements endpoints under `admin/`.

### Testing Gateway Integration

```bash
# Test direct access (development)
curl http://localhost:3007/health

# Test via API gateway (production)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/system/health
```

---

## Health Checks and Monitoring

### Health Check Endpoint

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-14T10:30:00.000Z",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "schemas": ["auth", "archive", "chat"]
  },
  "cache": {
    "status": "connected",
    "type": "redis"
  }
}
```

### Docker Health Check

The Dockerfile includes a built-in health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### Monitoring Commands

```bash
# Check container health status
docker ps --filter name=fg-admin-service

# View health check logs
docker inspect --format='{{json .State.Health}}' fg-admin-service | jq

# Monitor resource usage
docker stats fg-admin-service

# Check logs for errors
docker logs fg-admin-service 2>&1 | grep -i error
```

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

**Symptoms**: Container exits immediately after starting

**Solutions**:
```bash
# Check logs
docker logs fg-admin-service

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Port already in use

# Verify environment variables
docker exec fg-admin-service env | grep DB_

# Check port availability
netstat -tuln | grep 3007
```

#### 2. Database Connection Errors

**Symptoms**: "Unable to connect to database" errors

**Solutions**:
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Test database connectivity
docker exec fg-admin-service nc -zv postgres 5432

# Check database credentials
docker exec fg-postgres psql -U postgres -d futureguide -c "SELECT 1"

# Restart with fresh connection
docker-compose restart admin-service
```

#### 3. Redis Connection Issues

**Symptoms**: Cache-related errors, degraded performance

**Solutions**:
```bash
# Check Redis status
docker ps | grep redis

# Test Redis connectivity
docker exec fg-admin-service nc -zv redis 6379

# Verify Redis authentication
docker exec fg-redis redis-cli -a YOUR_PASSWORD ping

# Service continues without Redis (graceful degradation)
```

#### 4. Authentication Failures

**Symptoms**: 401 Unauthorized errors

**Solutions**:
```bash
# Verify auth-service is running
docker ps | grep auth-service

# Check auth-service connectivity
docker exec fg-admin-service curl http://auth-service:3001/health

# Verify INTERNAL_SERVICE_KEY matches
docker exec fg-admin-service env | grep INTERNAL_SERVICE_KEY
docker exec fg-auth-service env | grep INTERNAL_SERVICE_KEY
```

### 5. Performance Issues

**Symptoms**: Slow response times, high CPU/memory usage

**Solutions**:
```bash
# Check resource usage
docker stats fg-admin-service

# Increase connection pool if needed
# Edit docker-compose.yml:
# DB_POOL_MAX: 30
# DB_POOL_MIN: 10

# Enable Redis caching
# Verify REDIS_HOST is set correctly

# Check for slow queries
docker logs fg-admin-service | grep "Executing"

# Restart service
docker-compose restart admin-service
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables configured in `.env` file
- [ ] Database migrations completed
- [ ] Redis cache available and configured
- [ ] Auth service running and accessible
- [ ] API gateway configured with admin-service routes
- [ ] SSL/TLS certificates configured (if applicable)
- [ ] Monitoring and alerting setup
- [ ] Backup procedures in place
- [ ] Disaster recovery plan documented

### Deployment Steps

#### 1. Prepare Environment

```bash
# Create production .env file
cp .env.example .env.production

# Edit with production values
nano .env.production

# Verify configuration
source .env.production
echo $DB_HOST
echo $AUTH_SERVICE_URL
```

#### 2. Build Production Image

```bash
# Build with production optimizations
docker build \
  --no-cache \
  --build-arg NODE_ENV=production \
  -t fg-admin-service:1.0.0 \
  ./admin-service

# Verify image
docker images | grep fg-admin-service
```

#### 3. Deploy with Docker Compose

```bash
# Pull latest images
docker-compose pull

# Start services in correct order
docker-compose up -d postgres redis
sleep 10
docker-compose up -d auth-service
sleep 5
docker-compose up -d admin-service

# Verify all services are running
docker-compose ps
```

#### 4. Verify Deployment

```bash
# Check health
curl http://localhost:3007/health

# Check logs
docker-compose logs -f admin-service

# Run integration tests
cd admin-service
node test-phase6.js
```

### Rolling Updates

```bash
# Build new version
docker build -t fg-admin-service:1.1.0 ./admin-service

# Tag as latest
docker tag fg-admin-service:1.1.0 fg-admin-service:latest

# Update service (zero-downtime with multiple replicas)
docker-compose up -d --no-deps --build admin-service

# Verify new version
docker exec fg-admin-service cat package.json | grep version
```

### Rollback Procedure

```bash
# Stop current version
docker-compose stop admin-service

# Revert to previous image
docker tag fg-admin-service:1.0.0 fg-admin-service:latest

# Start previous version
docker-compose up -d admin-service

# Verify rollback
docker-compose logs -f admin-service
```

---

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks

```bash
# Check service health
docker ps --filter name=fg-admin-service
curl http://localhost:3007/health

# Review error logs
docker logs --since 24h fg-admin-service 2>&1 | grep -i error

# Monitor resource usage
docker stats --no-stream fg-admin-service
```

#### Weekly Tasks

```bash
# Rotate logs
docker exec fg-admin-service sh -c "gzip /app/logs/admin-service.log"

# Clean old logs (keep last 30 days)
find ./admin-service/logs -name "*.log.gz" -mtime +30 -delete

# Review performance metrics
curl http://localhost:3007/admin/system/metrics

# Update dependencies (if needed)
docker exec fg-admin-service npm outdated
```

---

## Emergency Procedures

### Service Down

```bash
# 1. Check service status
docker ps -a | grep admin-service

# 2. Check logs for errors
docker logs --tail=50 fg-admin-service

# 3. Restart service
docker-compose restart admin-service

# 4. If restart fails, recreate container
docker-compose up -d --force-recreate admin-service

# 5. Verify recovery
curl http://localhost:3007/health
```

### Database Connection Lost

```bash
# 1. Check PostgreSQL status
docker ps | grep postgres

# 2. Restart PostgreSQL
docker-compose restart postgres

# 3. Wait for health check
docker-compose ps postgres

# 4. Restart admin-service
docker-compose restart admin-service

# 5. Verify connection
docker logs fg-admin-service | grep "Database connected"
```

---

## Changelog

### Version 1.0.0 (2025-10-14)
- Initial Docker integration
- Multi-schema database support
- Redis caching integration
- API gateway routing configuration
- Health checks and monitoring
- Production deployment procedures
- Emergency procedures documentation

---

**Document Maintained By**: DevOps Team
**Last Updated**: 2025-10-14
**Next Review**: 2025-11-14

