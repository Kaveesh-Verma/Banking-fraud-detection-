# FinShield AI — API Documentation

Base URL: `http://localhost:8080/api`

## Authentication

Currently, this application uses session-based authentication via session ID stored in localStorage.

**Demo Mode Note**: OTP is visible in UI for demo purposes. Production implementation should use proper authentication.

---

## Endpoints

### Health Check

#### GET `/healthz`

Check if the server is running and healthy.

**Response (200 OK)**
```json
{ "status": "ok" }
```

---

### Sessions

#### POST `/session/start`

Create a new user session after login.

**Request Body**
```json
{
  "name": "John Doe",
  "mobile": "9876543210",
  "deviceInfo": {
    "os": "Windows",
    "browser": "Chrome",
    "deviceType": "Desktop",
    "userAgent": "Mozilla/5.0..."
  },
  "locationPermission": true,
  "latitude": 28.7041,
  "longitude": 77.1025,
  "city": "New Delhi",
  "country": "IN",
  "ip": "203.0.113.45"
}
```

**Response (201 Created)**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "John Doe",
  "mobile": "9876543210",
  "loginTime": "2024-04-11T10:30:00Z",
  "deviceInfo": {
    "os": "Windows",
    "browser": "Chrome",
    "deviceType": "Desktop",
    "userAgent": "Mozilla/5.0..."
  },
  "locationPermission": true,
  "latitude": 28.7041,
  "longitude": 77.1025,
  "city": "New Delhi",
  "country": "IN",
  "ip": "203.0.113.45",
  "mouseMovements": 0,
  "clicks": 0,
  "keyPresses": 0,
  "createdAt": "2024-04-11T10:30:00Z"
}
```

**Error (400 Bad Request)**
```json
{ "error": "Validation failed: ..." }
```

---

#### GET `/session/:sessionId`

Retrieve details of a specific session.

**Path Parameters**
- `sessionId` (string, UUID) — Session ID to fetch

**Response (200 OK)**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "John Doe",
  "mobile": "9876543210",
  "loginTime": "2024-04-11T10:30:00Z",
  "deviceInfo": { ... },
  "locationPermission": true,
  "latitude": 28.7041,
  "longitude": 77.1025,
  "city": "New Delhi",
  "country": "IN",
  "ip": "203.0.113.45",
  "mouseMovements": 145,
  "clicks": 89,
  "keyPresses": 234,
  "createdAt": "2024-04-11T10:30:00Z"
}
```

**Error (404 Not Found)**
```json
{ "error": "Session not found" }
```

---

#### PATCH `/session/:sessionId/interactions`

Update user interaction counts (mouse movements, clicks, key presses).

**Path Parameters**
- `sessionId` (string, UUID) — Session ID to update

**Request Body**
```json
{
  "mouseMovements": 145,
  "clicks": 89,
  "keyPresses": 234
}
```

**Response (200 OK)** — Returns updated session object (same schema as GET)

**Error (404 Not Found)**
```json
{ "error": "Session not found" }
```

---

### Risk Analysis

#### POST `/risk`

Calculate fraud risk score based on session characteristics.

**Request Body**
```json
{
  "locationPermission": true,
  "mouseMovements": 145,
  "clicks": 89,
  "keyPresses": 234,
  "isNewSession": false
}
```

**Response (200 OK)**
```json
{
  "score": 25,
  "level": "low",
  "reasons": ["N/A"],
  "recommendations": [
    "Continue to maintain secure browsing habits"
  ]
}
```

**Scoring Formula**
- No location permission: +20
- Low interactions (<10): +15
- New session: +25
- Random noise: ±10

**Risk Levels**
- `low` — Score < 30
- `medium` — Score 30-60
- `high` — Score > 60

---

### Location

#### GET `/location`

Get client's IP address and geolocation.

**Query Parameters** — None

**Response (200 OK)**
```json
{
  "ip": "203.0.113.45",
  "city": "New Delhi",
  "country": "India",
  "latitude": 28.7041,
  "longitude": 77.1025
}
```

**Error Response (fallback)**
```json
{
  "ip": "192.0.2.1",
  "city": "Unknown",
  "country": "Unknown",
  "latitude": null,
  "longitude": null
}
```

---

### Admin

#### GET `/admin/sessions`

List all sessions with risk scores (admin only).

**Query Parameters** — None

**Response (200 OK)**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "John Doe",
    "mobile": "9876543210",
    "loginTime": "2024-04-11T10:30:00Z",
    "deviceInfo": { ... },
    "locationPermission": true,
    "latitude": 28.7041,
    "longitude": 77.1025,
    "city": "New Delhi",
    "country": "IN",
    "ip": "203.0.113.45",
    "mouseMovements": 145,
    "clicks": 89,
    "keyPresses": 234,
    "riskScore": 25,
    "riskLevel": "low",
    "riskReasons": ["New session detected"],
    "createdAt": "2024-04-11T10:30:00Z"
  }
]
```

---

#### GET `/admin/stats`

Get aggregate statistics across all sessions.

**Query Parameters** — None

**Response (200 OK)**
```json
{
  "totalSessions": 42,
  "highRiskCount": 5,
  "mediumRiskCount": 12,
  "lowRiskCount": 25,
  "avgRiskScore": 28.5,
  "locationDeniedCount": 8,
  "lowInteractionCount": 3
}
```

---

## Error Handling

All endpoints return structured error responses:

```json
{
  "error": "Descriptive error message"
}
```

**Common HTTP Status Codes**
- `200 OK` — Request successful
- `201 Created` — Resource created
- `400 Bad Request` — Invalid input/validation failed
- `404 Not Found` — Resource not found
- `500 Internal Server Error` — Server error

---

## Rate Limiting

⚠️ **Not currently implemented** — Add for production use.

Recommendations:
- Limit requests per IP: 100 per minute
- Limit session creation: 10 per hour
- Implement backoff for failed attempts

---

## CORS

The server is configured to accept requests from:
- Production: `http://localhost:5173` (development)
- Configure in `server/src/app.ts` for production domain

---

## Testing Endpoints

### Quick Test with curl

```bash
# Health check
curl http://localhost:8080/api/healthz

# Get location
curl http://localhost:8080/api/location

# Create session
curl -X POST http://localhost:8080/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "mobile": "9876543210",
    "deviceInfo": {
      "os": "Windows",
      "browser": "Chrome",
      "deviceType": "Desktop",
      "userAgent": "Mozilla/5.0"
    },
    "locationPermission": true,
    "latitude": 28.7041,
    "longitude": 77.1025,
    "city": "New Delhi",
    "country": "IN",
    "ip": "203.0.113.45"
  }'

# Calculate risk
curl -X POST http://localhost:8080/api/risk \
  -H "Content-Type: application/json" \
  -d '{
    "locationPermission": true,
    "mouseMovements": 145,
    "clicks": 89,
    "keyPresses": 234,
    "isNewSession": false
  }'
```

---

## Version

API Version: `1.0.0`  
Last Updated: April 2024
