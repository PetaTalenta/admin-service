# Admin Service API Documentation

**Version**: 5.0.0
**Phase**: 5 - Real-time Features & Optimization
**Last Updated**: 2025-10-14

---

## Overview

The Admin Service provides comprehensive monitoring and management capabilities for the FutureGuide platform. This document details all available API endpoints, request/response formats, and authentication requirements.

**Base URL**: `http://localhost:3007` (internal) or `https://api.futureguide.id/api` and `http://localhost:3000/api` (via API Gateway)

**Note**: The `api/` prefix is handled by the API gateway. The admin-service implements endpoints under `admin/`.

---

## Authentication

All admin endpoints (except login) require authentication via JWT token.

### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Admin Roles

- `admin`: Standard admin access
- `superadmin`: Full system access with elevated permissions

---

## Phase 1 Endpoints

### Health Check Endpoints

#### GET admin/health

Basic health check endpoint.

**Authentication**: None required

**Response**:
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "service": "admin-service",
    "version": "1.0.0",
    "timestamp": "2025-10-13T10:00:00.000Z",
    "uptime": 3600,
    "environment": "production"
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

---

#### GET admin/health/detailed

Detailed health check including database connections.

**Authentication**: None required

**Response**:
```json
{
  "success": true,
  "message": "Detailed health check completed",
  "data": {
    "status": "healthy",
    "service": "admin-service",
    "version": "1.0.0",
    "timestamp": "2025-10-13T10:00:00.000Z",
    "uptime": 3600,
    "environment": "production",
    "database": {
      "auth": {
        "status": "healthy",
        "pool": {
          "size": 1,
          "available": 1,
          "using": 0,
          "waiting": 0
        }
      },
      "assessment": {
        "status": "healthy",
        "pool": {
          "size": 1,
          "available": 1,
          "using": 0,
          "waiting": 0
        }
      },
      "archive": {
        "status": "healthy",
        "pool": {
          "size": 1,
          "available": 1,
          "using": 0,
          "waiting": 0
        }
      },
      "chat": {
        "status": "healthy",
        "pool": {
          "size": 1,
          "available": 1,
          "using": 0,
          "waiting": 0
        }
      }
    },
    "memory": {
      "used": 45,
      "total": 128,
      "unit": "MB"
    },
    "responseTime": 25
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

---

#### GET admin/health/ready

Readiness probe for container orchestration.

**Authentication**: None required

**Response**:
```json
{
  "success": true,
  "message": "Service is ready",
  "data": {
    "ready": true
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

---

#### GET admin/health/live

Liveness probe for container orchestration.

**Authentication**: None required

**Response**:
```json
{
  "success": true,
  "message": "Service is alive",
  "data": {
    "alive": true
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

---

### Authentication Endpoints

#### POST /admin/auth/login

Admin login endpoint. Authenticates admin user and returns JWT token.

**Authentication**: None required  
**Rate Limit**: 10 requests per 15 minutes per IP

**Request Body**:
```json
{
  "email": "admin@futureguide.id",
  "password": "securePassword123"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@futureguide.id",
      "username": "admin",
      "user_type": "admin",
      "is_active": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

**Error Responses**:

- **401 Unauthorized**: Invalid credentials
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Username or email not found",
  "timestamp": "2025-10-14T06:37:49.123Z"
}
```

- **403 Forbidden**: Non-admin user
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

- **429 Too Many Requests**: Rate limit exceeded
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many authentication attempts, please try again later"
  }
}
```

- **400 Bad Request**: Validation error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "timestamp": "2025-10-14T06:37:55.123Z"
}
```

---

#### POST /admin/auth/logout

Admin logout endpoint. Invalidates the current session.

**Authentication**: Required (Bearer token)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

**Error Response** (401):
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Access token is required"
}
```

---

#### GET /admin/auth/verify

Verify admin token and return admin information.

**Authentication**: Required (Bearer token)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@futureguide.id",
    "user_type": "admin"
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

**Error Response** (401):
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Access token is required"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Internal server error |

**Example Error Response**:
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Route GET /api/nonexistent-route not found",
  "timestamp": "2025-10-14T06:38:05.678Z"
}
```

---

## Rate Limiting

- **Admin Endpoints**: 100 requests per 15 minutes per IP
- **Auth Endpoints**: 10 requests per 15 minutes per IP

Rate limit information is returned in response headers:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Remaining requests
- `RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Phase 2 Endpoints - User Management Module

### User List & Search

#### GET /admin/users

Get paginated list of users with search and filter capabilities.

**Authentication**: Required (Bearer token)  
**Rate Limit**: 100 requests per 15 minutes per IP

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `search` (string, optional): Search by email or username
- `user_type` (string, optional): Filter by user_type (user, admin, superadmin)
- `is_active` (boolean, optional): Filter by active status
- `auth_provider` (string, optional): Filter by auth_provider (local, google, firebase)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "johndoe",
      "email": "john@example.com",
      "user_type": "user",
      "is_active": true,
      "auth_provider": "local",
      "token_balance": 100,
      "last_login": "2025-10-10T08:30:00.000Z",
      "created_at": "2025-01-15T10:00:00.000Z",
      "profile": {
        "full_name": "John Doe",
        "date_of_birth": "1990-05-15",
        "gender": "male",
        "school_id": 123
      }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  },
  "timestamp": "2025-10-14T10:00:00.000Z"
}
```

---

### User Details

#### GET /admin/users/:id

Get detailed information about a specific user including profile, statistics, and recent activity.

**Authentication**: Required (Bearer token)  
**Rate Limit**: 100 requests per 15 minutes per IP

**Path Parameters**:
- `id` (UUID): User ID

**Success Response** (200):
```json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "johndoe",
      "email": "john@example.com",
      "user_type": "user",
      "is_active": true,
      "token_balance": 100,
      "last_login": "2025-10-10T08:30:00.000Z",
      "firebase_uid": "j4LtzZhK8ud2EKWH2dRrbMB7wh82",
      "auth_provider": "firebase",
      "provider_data": {
        "disabled": false,
        "provider_id": "password",
        "email_verified": false,
        "last_sign_in_time": "Mon, 13 Oct 2025 04:34:34 GMT"
      },
      "last_firebase_sync": "2025-10-13T04:55:34.778Z",
      "federation_status": "active",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-10-14T06:08:51.612Z",
      "profile": null
    },
    "statistics": {
      "jobs": [],
      "conversations": 0
    },
    "recentJobs": [],
    "recentConversations": []
  },
  "timestamp": "2025-10-14T10:00:00.000Z"
}
```

---

#### PUT /admin/users/:id

Update user information and profile data.

**Authentication**: Required (Bearer token)  
**Rate Limit**: 100 requests per 15 minutes per IP

**Path Parameters**:
- `id` (UUID): User ID

**Request Body**:
```json
{
  "username": "johndoe_updated",
  "is_active": true,
  "user_type": "user",
  "federation_status": "active",
  "profile": {
    "full_name": "John Doe Updated",
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "school_id": 123
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe_updated",
    "email": "john@example.com",
    "user_type": "user",
    "is_active": true,
    "federation_status": "active",
    "profile": {
      "full_name": "John Doe Updated",
      "date_of_birth": "1990-05-15",
      "gender": "male",
      "school_id": 123
    }
  },
  "timestamp": "2025-10-14T10:00:00.000Z"
}
```

---

### Token Management

#### GET /admin/users/:id/tokens

Get user's token balance and transaction history.

**Authentication**: Required (Bearer token)  
**Rate Limit**: 100 requests per 15 minutes per IP

**Path Parameters**:
- `id` (UUID): User ID

**Success Response** (200):
```json
{
  "success": true,
  "message": "Token history retrieved successfully",
  "data": {
    "currentBalance": 100,
    "history": [
      {
        "id": "460cc73f-888d-424f-bfe6-2b32b87eb1c2",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "admin_id": "00000000-0000-0000-0000-000000000001",
        "activity_type": "TOKEN_UPDATE",
        "activity_data": {
          "amount": 50,
          "reason": "Bonus for completing assessment",
          "newBalance": 150,
          "oldBalance": 100
        },
        "ip_address": "::ffff:172.21.0.11",
        "user_agent": "axios/1.12.2",
        "created_at": "2025-10-14T06:50:41.026Z"
      }
    ]
  },
  "timestamp": "2025-10-14T10:00:00.000Z"
}
```

---

#### PUT /admin/users/:id/tokens

Update user's token balance with logging.

**Authentication**: Required (Bearer token)  
**Rate Limit**: 100 requests per 15 minutes per IP

**Path Parameters**:
- `id` (UUID): User ID

**Request Body**:
```json
{
  "amount": 25,
  "reason": "Bonus for completing assessment"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Token balance updated successfully",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "oldBalance": 100,
    "newBalance": 125,
    "amount": 25
  },
  "timestamp": "2025-10-14T10:00:00.000Z"
}
```

---

### User Activity

#### GET /admin/users/:id/jobs

Get user's analysis jobs with pagination.

**Authentication**: Required (Bearer token)  
**Rate Limit**: 100 requests per 15 minutes per IP

**Path Parameters**:
- `id` (UUID): User ID

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)

**Success Response** (200):
```json
{
  "success": true,
  "message": "User jobs retrieved successfully",
  "data": [
    {
      "id": "job-123",
      "job_id": "analysis-456",
      "status": "completed",
      "assessment_name": "AI-Driven Talent Mapping",
      "created_at": "2025-10-12T14:30:00.000Z",
      "completed_at": "2025-10-12T14:35:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  },
  "timestamp": "2025-10-14T10:00:00.000Z"
}
```

---

#### GET /admin/users/:id/conversations

Get user's chat conversations with pagination.

**Authentication**: Required (Bearer token)  
**Rate Limit**: 100 requests per 15 minutes per IP

**Path Parameters**:
- `id` (UUID): User ID

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)

**Success Response** (200):
```json
{
  "success": true,
  "message": "User conversations retrieved successfully",
  "data": [
    {
      "id": "conv-456",
      "title": "Career Advice",
      "context_type": "general",
      "status": "active",
      "created_at": "2025-10-11T16:45:00.000Z",
      "updated_at": "2025-10-11T17:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "timestamp": "2025-10-14T10:00:00.000Z"
}
```

## Phase 2.5 Endpoints - School Management Module

### School List & Search

#### GET /admin/schools

Get paginated list of schools with search and sorting.

**Authentication**: Required (Bearer token)
**Rate Limit**: 100 requests per 15 minutes per IP

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `search` (string, optional): Search by name, city, or province
- `sort_by` (string, optional): Sort field (name, city, province, created_at) (default: created_at)
- `sort_order` (string, optional): Sort order (ASC, DESC) (default: DESC)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Schools retrieved successfully",
  "data": {
    "schools": [
      {
        "id": 1,
        "name": "SMA Dummy 1",
        "address": "Jl. Dummy 1",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "created_at": "2025-10-17T07:29:34.371Z"
      },
      {
        "id": 2,
        "name": "SMA Dummy 2",
        "address": "Jl. Dummy 2",
        "city": "Bandung",
        "province": "Jawa Barat",
        "created_at": "2025-10-17T07:29:34.371Z"
      }
    ],
    "pagination": {
      "total": 6,
      "page": 1,
      "limit": 3,
      "totalPages": 2
    }
  },
  "timestamp": "2025-10-18T01:22:02.165Z"
}
```

---

### School Details

#### GET /admin/schools/:id

Get detailed information about a specific school including user count.

**Authentication**: Required (Bearer token)
**Rate Limit**: 100 requests per 15 minutes per IP

**Path Parameters**:
- `id` (integer): School ID

**Success Response** (200):
```json
{
  "success": true,
  "message": "School details retrieved successfully",
  "data": {
    "school": {
      "id": 1,
      "name": "SMA Dummy 1",
      "address": "Jl. Dummy 1",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "created_at": "2025-10-17T07:29:34.371Z"
    },
    "userCount": 1
  },
  "timestamp": "2025-10-18T01:22:17.998Z"
}
```

**Error Response** (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "School not found"
  }
}
```

---

### School Creation

#### POST /admin/schools

Create a new school.

**Authentication**: Required (Bearer token)
**Rate Limit**: 100 requests per 15 minutes per IP

**Request Body**:
```json
{
  "name": "SMA Test Create",
  "address": "Jl. Create No. 456",
  "city": "Malang",
  "province": "Jawa Timur"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "School created successfully",
  "data": {
    "id": 8,
    "name": "SMA Test Create",
    "address": "Jl. Create No. 456",
    "city": "Malang",
    "province": "Jawa Timur",
    "created_at": "2025-10-18T01:22:10.829Z"
  },
  "timestamp": "2025-10-18T01:22:10.834Z"
}
```

---

### School Update

#### PUT /admin/schools/:id

Update school information (partial update supported).

**Authentication**: Required (Bearer token)
**Rate Limit**: 100 requests per 15 minutes per IP

**Path Parameters**:
- `id` (integer): School ID

**Request Body**:
```json
{
  "name": "SMA Test Updated",
  "city": "Malang Raya"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "School updated successfully",
  "data": {
    "id": 8,
    "name": "SMA Test Updated",
    "address": "Jl. Create No. 456",
    "city": "Malang Raya",
    "province": "Jawa Timur",
    "created_at": "2025-10-18T01:22:10.829Z"
  },
  "timestamp": "2025-10-18T01:22:25.381Z"
}
```

**Error Response** (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "School not found"
  }
}
```

---

### School Deletion

#### DELETE /admin/schools/:id

Delete a school (only if no users are associated with it).

**Authentication**: Required (Bearer token)
**Rate Limit**: 100 requests per 15 minutes per IP

**Path Parameters**:
- `id` (integer): School ID

**Success Response** (200):
```json
{
  "success": true,
  "message": "School deleted successfully",
  "data": {
    "message": "School deleted successfully"
  },
  "timestamp": "2025-10-18T01:22:33.963Z"
}
```

**Error Responses**:

- **404 Not Found**: School not found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "School not found"
  }
}
```

- **400 Bad Request**: School has associated users
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Cannot delete school. 1 user(s) are associated with this school."
  }
}
```

---

## Phase 3 Endpoints

### Job Monitoring Endpoints

#### GET /admin/jobs/stats

Get comprehensive job statistics dashboard.

**Authentication**: Required (Admin)

**Query Parameters**: None

**Response**:
```json
{
  "success": true,
  "message": "Job statistics retrieved successfully",
  "data": {
    "overview": {
      "total": 1068,
      "queued": 0,
      "processing": 0,
      "completed": 1056,
      "failed": 11,
      "successRate": 98.97,
      "avgProcessingTimeMinutes": "0.00"
    }
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

**Performance**: < 600ms

---

#### GET /admin/jobs

Get paginated list of jobs with filtering and sorting.

**Authentication**: Required (Admin)

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 50, max: 100)
- `status` (string, optional): Filter by status (queue, processing, completed, failed, cancelled)
- `user_id` (uuid, optional): Filter by user ID
- `user_email` (string, optional): Filter by user email (partial match)
- `user_username` (string, optional): Filter by username (partial match)
- `assessment_name` (string, optional): Filter by assessment name (partial match)
- `date_from` (ISO date, optional): Filter jobs created from this date
- `date_to` (ISO date, optional): Filter jobs created until this date
- `sort_by` (string, optional): Sort field (created_at, updated_at, completed_at, status, priority) (default: created_at)
- `sort_order` (string, optional): Sort order (ASC, DESC) (default: DESC)

**Example Request**:
```
GET /admin/jobs?page=1&limit=20&status=completed&sort_by=completed_at&sort_order=DESC
```

**Response**:
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": {
    "jobs": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "job_id": "job-550e8400",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "status": "completed",
        "result_id": "789e0123-e89b-12d3-a456-426614174000",
        "error_message": null,
        "completed_at": "2025-10-13T09:45:00.000Z",
        "assessment_name": "AI-Driven Talent Mapping",
        "priority": 0,
        "retry_count": 0,
        "max_retries": 3,
        "processing_started_at": "2025-10-13T09:40:00.000Z",
        "created_at": "2025-10-13T09:35:00.000Z",
        "updated_at": "2025-10-13T09:45:00.000Z",
        "user": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "email": "user@example.com",
          "username": "johndoe"
        }
      }
    ],
    "pagination": {
      "total": 1150,
      "page": 1,
      "limit": 20,
      "totalPages": 58
    }
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

**Performance**: < 400ms

---

#### GET /admin/jobs/:id

Get detailed information about a specific job.

**Authentication**: Required (Admin)

**Path Parameters**:
- `id` (uuid, required): Job ID

**Response**:
```json
{
  "success": true,
  "message": "Job details retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job_id": "job-550e8400",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "result_id": "789e0123-e89b-12d3-a456-426614174000",
    "error_message": null,
    "completed_at": "2025-10-13T09:45:00.000Z",
    "assessment_name": "AI-Driven Talent Mapping",
    "priority": 0,
    "retry_count": 0,
    "max_retries": 3,
    "processing_started_at": "2025-10-13T09:40:00.000Z",
    "created_at": "2025-10-13T09:35:00.000Z",
    "updated_at": "2025-10-13T09:45:00.000Z",
    "processingTimeSeconds": 300,
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "username": "johndoe"
    }
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Job not found

**Performance**: < 300ms

---

#### GET /admin/jobs/:id/results

Get complete analysis results for a specific job.

**Authentication**: Required (Admin)

**Path Parameters**:
- `id` (uuid, required): Job ID

**Response**:
```json
{
  "success": true,
  "message": "Job results retrieved successfully",
  "data": {
    "job": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "job_id": "job-550e8400",
      "status": "completed",
      "assessment_name": "AI-Driven Talent Mapping",
      "completed_at": "2025-10-13T09:45:00.000Z"
    },
    "result": {
      "id": "789e0123-e89b-12d3-a456-426614174000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "test_data": {
        "questions": [...],
        "responses": [...]
      },
      "test_result": {
        "scores": {...},
        "recommendations": [...],
        "analysis": {...}
      },
      "raw_responses": {...},
      "is_public": false,
      "chatbot_id": null,
      "created_at": "2025-10-13T09:45:00.000Z",
      "updated_at": "2025-10-13T09:45:00.000Z"
    }
  },
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Job not found or job has no results

**Performance**: < 800ms

---

### WebSocket Real-time Monitoring

#### Connection

Connect to WebSocket server for real-time job monitoring.

**Endpoint**: `ws://admin-service:3007/admin/socket.io` (or via API Gateway)

**Authentication**: Required via handshake

**Connection Example** (JavaScript):
```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3007', {
  path: '/admin/socket.io',
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');

  // Subscribe to job updates
  socket.emit('subscribe:jobs');
});

socket.on('job-stats', (stats) => {
  console.log('Job statistics:', stats);
});

socket.on('job-update', (update) => {
  console.log('Job update:', update);
});

socket.on('job-alert', (alert) => {
  console.log('Job alert:', alert);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

---

#### WebSocket Events

##### Client → Server Events

**subscribe:jobs**
Subscribe to job updates.
```javascript
socket.emit('subscribe:jobs');
```

**unsubscribe:jobs**
Unsubscribe from job updates.
```javascript
socket.emit('unsubscribe:jobs');
```

**request:job-stats**
Request current job statistics.
```javascript
socket.emit('request:job-stats');
```

---

##### Server → Client Events

**job-stats**
Periodic job statistics update (every 5 seconds by default).
```javascript
socket.on('job-stats', (stats) => {
  // stats object same as GET /admin/jobs/stats response
});
```

**job-update**
Individual job status change notification.
```javascript
socket.on('job-update', (update) => {
  // update: {
  //   event: 'created' | 'updated' | 'completed' | 'failed',
  //   job: { /* job object */ },
  //   timestamp: '2025-10-13T10:00:00.000Z'
  // }
});
```

**job-alert**
Critical job alert notification.
```javascript
socket.on('job-alert', (alert) => {
  // alert: {
  //   type: 'high_failure_rate' | 'queue_overflow' | 'processing_timeout',
  //   severity: 'low' | 'medium' | 'high' | 'critical',
  //   message: 'Alert description',
  //   data: { /* additional data */ },
  //   timestamp: '2025-10-13T10:00:00.000Z'
  // }
});
```

**error**
Error notification.
```javascript
socket.on('error', (error) => {
  // error: {
  //   message: 'Error description'
  // }
});
```

---

## Phase 4 Endpoints - Chatbot Monitoring

### Chatbot Statistics

#### GET /admin/chatbot/stats

Get comprehensive chatbot performance metrics and analytics.

**Authentication**: Required (Admin)

**Query Parameters**: None

**Response**:
```json
{
  "success": true,
  "message": "Chatbot statistics retrieved successfully",
  "data": {
    "overview": {
      "totalConversations": 132,
      "totalMessages": 288,
      "activeConversations": 132,
      "avgMessagesPerConversation": "2.18"
    },
    "today": {
      "conversations": 0,
      "messages": 0
    },
    "performance": {
      "avgResponseTimeMs": 6757.66
    },
    "tokenUsage": {
      "totalTokens": 303933
    },
    "modelUsage": [
      {
        "model": "meta-llama/llama-3.2-3b-instruct:free",
        "count": 96,
        "totalTokens": 189490
      },
      {
        "model": "openai/gpt-oss-20b:free",
        "count": 2,
        "totalTokens": 4109
      }
    ]
  },
  "timestamp": "2025-10-14T07:23:39.000Z"
}
```

**Performance**: ~150-300ms

---

### Conversation Management

#### GET /admin/conversations

Get paginated list of conversations with filtering and sorting.

**Authentication**: Required (Admin)

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `status` (string, optional): Filter by status (active, archived, deleted)
- `user_id` (uuid, optional): Filter by user ID
- `context_type` (string, optional): Filter by context type
- `search` (string, optional): Search in conversation titles
- `date_from` (ISO date, optional): Filter from date
- `date_to` (ISO date, optional): Filter to date
- `sort_by` (string, optional): Sort field (created_at, updated_at, title, status)
- `sort_order` (string, optional): Sort order (ASC, DESC)

**Response**:
```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": {
    "conversations": [
      {
        "id": "ba94a361-110b-4f44-8de7-33027d321118",
        "title": "Test Conversation",
        "status": "active",
        "messageCount": 8,
        "created_at": "2025-10-13T02:09:21.775Z"
      }
    ],
    "pagination": {
      "total": 132,
      "page": 1,
      "limit": 10,
      "totalPages": 14
    }
  },
  "timestamp": "2025-10-14T07:23:39.000Z"
}
```

**Performance**: ~200-400ms

---

#### GET /admin/conversations/:id

Get detailed information about a specific conversation.

**Authentication**: Required (Admin)

**URL Parameters**:
- `id` (uuid, required): Conversation ID

**Response**:
```json
{
  "success": true,
  "message": "Conversation details retrieved successfully",
  "data": {
    "id": "ba94a361-110b-4f44-8de7-33027d321118",
    "title": "Test Conversation",
    "status": "active",
    "context_type": "career_guidance",
    "messageCount": 8,
    "totalTokens": 9333,
    "totalCost": 0,
    "created_at": "2025-10-13T02:09:21.775Z",
    "user": {
      "email": "test_user_1760321309064@example.com"
    }
  },
  "timestamp": "2025-10-14T07:23:39.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Conversation not found

**Performance**: ~100-200ms

---

#### GET /admin/conversations/:id/chats

Get paginated chat message history for a conversation.

**Authentication**: Required (Admin)

**URL Parameters**:
- `id` (uuid, required): Conversation ID

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 50, max: 100)

**Response**:
```json
{
  "success": true,
  "message": "Conversation chats retrieved successfully",
  "data": {
    "conversation": {
      "title": "Test Conversation"
    },
    "messages": [
      {
        "sender_type": "user",
        "content": "Halo! Berdasarkan profile persona saya...",
        "usage": null
      },
      {
        "sender_type": "assistant",
        "content": "Halo Test User! Aku Guider...",
        "usage": {
          "model_used": "alibaba/tongyi-deepresearch-30b-a3b:free",
          "total_tokens": 1133
        }
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  },
  "timestamp": "2025-10-14T07:23:39.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Conversation not found

**Performance**: ~150-300ms

---

### Model Analytics

#### GET /admin/chatbot/models

Get information about available AI models and their usage statistics.

**Authentication**: Required (Admin)

**Query Parameters**: None

**Response**:
```json
{
  "success": true,
  "message": "Models information retrieved successfully",
  "data": {
    "summary": {
      "totalModels": 5,
      "totalUsage": 131,
      "freeModelUsage": 131,
      "freeModelPercentage": "100.00%",
      "paidModelUsage": 0
    },
    "models": [
      {
        "model": "meta-llama/llama-3.2-3b-instruct:free",
        "usageCount": 96,
        "totalTokens": 189490,
        "avgProcessingTimeMs": 4047.07,
        "isFreeModel": true
      },
      {
        "model": "alibaba/tongyi-deepresearch-30b-a3b:free",
        "usageCount": 15,
        "totalTokens": 47448,
        "avgProcessingTimeMs": 5897.07,
        "isFreeModel": true
      }
    ]
  },
  "timestamp": "2025-10-14T07:23:39.000Z"
}
```

**Performance**: ~200-350ms

---

## Changelog

### Version 4.0.0 - Phase 4 (2025-10-14)
- Added Chatbot Monitoring Module
- Chatbot statistics dashboard with comprehensive metrics
- Conversation management with advanced filtering
- Conversation details with token and cost tracking
- Chat message history with usage analytics
- Model usage statistics and performance comparison
- Support for 5+ AI models tracking
- Token consumption and cost monitoring
- Daily conversation and message trends
- Free vs paid model analytics

### Version 3.0.0 - Phase 3 (2025-10-13)
- Added Jobs Monitoring Module
- Real-time job statistics dashboard
- Job list with advanced filtering and sorting
- Job details and results viewing
- WebSocket real-time monitoring
- Job alert system
- Cross-schema database associations
- Comprehensive job performance analytics

### Version 2.0.0 - Phase 2 (2025-10-14)
- Added User Management Module
- User list and search with pagination
- User details with profile and statistics
- User update functionality
- Token management with history
- User activity monitoring (jobs and conversations)
- Comprehensive input validation
- Activity logging for all modifications

### Version 1.0.0 - Phase 1 (2025-10-13)
- Initial release
- Health check endpoints
- Admin authentication
- Multi-schema database connections
- Security middleware
- Rate limiting
- User management
- Jobs monitoring
- Chatbot monitoring
- Real-time WebSocket updates
- System health monitoring
- Alert management
- Performance optimization with caching

---

## Phase 5 Endpoints

### System Monitoring Endpoints

#### GET /admin/system/health

Get comprehensive system health status.

**Authentication**: Required (Admin)

**Response**:
```json
{
  "success": true,
  "message": "System health retrieved successfully",
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-14T09:28:05.123Z",
    "uptime": 3600,
    "database": {
      "auth": {
        "status": "healthy",
        "responseTime": "1ms"
      },
      "archive": {
        "status": "healthy",
        "responseTime": "1ms"
      },
      "chat": {
        "status": "healthy",
        "responseTime": "0ms"
      }
    },
    "cache": {
      "status": "healthy",
      "connected": true
    },
    "resources": {
      "cpu": {
        "cores": 4,
        "model": "Intel(R) Core(TM) i7-7500U CPU @ 2.70GHz",
        "loadAverage": [2.9, 2.55, 2.06]
      },
      "memory": {
        "total": "7.64 GB",
        "used": "6.53 GB",
        "free": "1.11 GB",
        "usagePercent": "85.45"
      },
      "process": {
        "memory": "25.12 MB",
        "pid": 1,
        "uptime": 342.162503678
      }
    },
    "version": "1.0.0"
  },
  "timestamp": "2025-10-14T09:28:05.123Z"
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

#### GET /admin/system/metrics

Get comprehensive system metrics.

**Authentication**: Required (Admin)

**Response**:
```json
{
  "success": true,
  "message": "System metrics retrieved successfully",
  "data": {
    "timestamp": "2025-10-14T09:28:05.123Z",
    "jobs": {
      "total_jobs": "0",
      "completed_jobs": "0",
      "failed_jobs": "0",
      "processing_jobs": "0",
      "queued_jobs": "0",
      "avg_processing_time": null
    },
    "users": {
      "total_users": "324",
      "active_users": "324",
      "new_users_today": "0",
      "active_today": "4",
      "total_tokens": "100002947"
    },
    "chat": {
      "total_conversations": "132",
      "conversations_today": "0",
      "total_messages": "288",
      "messages_today": "0",
      "total_tokens_used": "303933"
    },
    "system": {
      "cpu": {
        "cores": 4,
        "model": "Intel(R) Core(TM) i7-7500U CPU @ 2.70GHz",
        "loadAverage": [2.62, 2.46, 2.02]
      },
      "memory": {
        "total": "7.64 GB",
        "used": "6.58 GB",
        "free": "1.06 GB",
        "usagePercent": "86.10"
      },
      "process": {
        "memory": "23.93 MB",
        "pid": 1,
        "uptime": 318.111743558
      }
    }
  },
  "timestamp": "2025-10-14T09:28:05.123Z"
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

#### GET /admin/system/database

Get database health for all schemas.

**Authentication**: Required (Admin)

**Response**:
```json
{
  "success": true,
  "message": "Database health retrieved successfully",
  "data": {
    "auth": {
      "status": "healthy",
      "responseTime": "2ms"
    },
    "archive": {
      "status": "healthy",
      "responseTime": "2ms"
    },
    "chat": {
      "status": "healthy",
      "responseTime": "2ms"
    }
  },
  "timestamp": "2025-10-14T09:28:05.123Z"
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

#### GET /admin/system/resources

Get system resource usage.

**Authentication**: Required (Admin)

**Response**:
```json
{
  "success": true,
  "message": "System resources retrieved successfully",
  "data": {
    "cpu": {
      "cores": 8,
      "model": "Intel Core i7",
      "loadAverage": [1.5, 1.3, 1.2]
    },
    "memory": {
      "total": "16.00 GB",
      "used": "13.63 GB",
      "free": "2.37 GB",
      "usagePercent": "85.21"
    },
    "process": {
      "memory": "150.23 MB",
      "pid": 12345,
      "uptime": 3600
    }
  },
  "timestamp": "2025-10-14T09:28:05.123Z"
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### Alert Management Endpoints

#### GET /admin/system/alerts

Get list of alerts with filtering and pagination.

**Authentication**: Required (Admin)

**Query Parameters**:
- `type` (optional): Filter by alert type (system, job, user, chat, performance, security)
- `severity` (optional): Filter by severity (info, warning, error, critical)
- `status` (optional): Filter by status (active, acknowledged, resolved)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response**:
```json
{
  "success": true,
  "message": "Alerts retrieved successfully",
  "data": {
    "alerts": [
      // Array can be empty if no alerts exist
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 0,
      "totalPages": 0
    }
  },
  "timestamp": "2025-10-14T09:28:05.123Z"
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `401`: Unauthorized
- `500`: Server error

---

#### GET /admin/system/alerts/stats

Get alert statistics.

**Authentication**: Required (Admin)

**Response**:
```json
{
  "success": true,
  "message": "Alert statistics retrieved successfully",
  "data": {
    "total": 0,
    "active": 0,
    "acknowledged": 0,
    "resolved": 0,
    "bySeverity": {
      "info": 0,
      "warning": 0,
      "error": 0,
      "critical": 0
    },
    "byType": {
      "system": 0,
      "job": 0,
      "user": 0,
      "chat": 0,
      "performance": 0,
      "security": 0
    }
  },
  "timestamp": "2025-10-14T09:28:05.123Z"
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

#### GET /admin/system/alerts/:id

Get specific alert by ID.

**Authentication**: Required (Admin)

**Response**:
```json
{
  "success": true,
  "message": "Alert retrieved successfully",
  "data": {
    "id": "alert_1697234567890_abc123",
    "type": "system",
    "severity": "warning",
    "title": "High Memory Usage",
    "message": "System memory usage is above 85%",
    "data": {
      "memoryUsage": "85.21%"
    },
    "status": "active",
    "createdAt": "2025-10-14T09:28:05.123Z",
    "acknowledgedAt": null,
    "acknowledgedBy": null,
    "resolvedAt": null,
    "resolvedBy": null
  },
  "timestamp": "2025-10-14T09:28:05.123Z"
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `404`: Alert not found
- `500`: Server error

---

#### POST /admin/system/alerts/:id/acknowledge

Acknowledge an alert.

**Authentication**: Required (Admin)

**Response**:
```json
{
  "success": true,
  "message": "Alert acknowledged successfully",
  "data": {
    "id": "alert_1697234567890_abc123",
    "status": "acknowledged",
    "acknowledgedAt": "2025-10-14T09:30:00.123Z",
    "acknowledgedBy": "admin-user-id"
  },
  "timestamp": "2025-10-14T09:30:00.123Z"
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `404`: Alert not found
- `500`: Server error

---

#### POST /admin/system/alerts/:id/resolve

Resolve an alert.

**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "resolution": "Memory usage returned to normal after clearing cache"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Alert resolved successfully",
  "data": {
    "id": "alert_1697234567890_abc123",
    "status": "resolved",
    "resolvedAt": "2025-10-14T09:35:00.123Z",
    "resolvedBy": "admin-user-id",
    "resolution": "Memory usage returned to normal after clearing cache"
  },
  "timestamp": "2025-10-14T09:35:00.123Z"
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `404`: Alert not found
- `500`: Server error

---

### WebSocket Events (Phase 5)

#### New Subscriptions

**subscribe:system**
Subscribe to system health updates.

```javascript
socket.emit('subscribe:system');
```

**subscribe:alerts**
Subscribe to alert notifications.

```javascript
socket.emit('subscribe:alerts');
```

**unsubscribe:system**
Unsubscribe from system updates.

```javascript
socket.emit('unsubscribe:system');
```

**unsubscribe:alerts**
Unsubscribe from alert notifications.

```javascript
socket.emit('unsubscribe:alerts');
```

#### New Events

**alert:new**
Emitted when a new alert is created.

```javascript
socket.on('alert:new', (alert) => {
  console.log('New alert:', alert);
});
```

**alert:update**
Emitted when an alert is updated (acknowledged/resolved).

```javascript
socket.on('alert:update', (alert) => {
  console.log('Alert updated:', alert);
});
```

---

## Performance Optimization

### Caching

Phase 5 implements Redis caching for improved performance:

- **System Health**: 10-second cache
- **System Metrics**: 30-second cache
- **User List**: 60-second cache
- **User Details**: 120-second cache

**Cache Headers**:
- `X-Cache`: HIT or MISS
- `X-Cache-Key`: Cache key used

### Response Compression

All responses are automatically compressed using gzip compression (level 6).

To disable compression for specific requests:
```
X-No-Compression: true
```

---

**Support**: For issues or questions, contact the FutureGuide development team.

