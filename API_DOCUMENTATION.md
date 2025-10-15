# API Documentation Overview

## 🔒 Fusee Backend Grid API

A comprehensive, secure backend API built with Express.js, TypeScript, Prisma, and PostgreSQL.

### **📋 API Information**
- **Version**: 1.0.0
- **Base URL**: `http://localhost:3000` (Development)
- **Production URL**: `https://api.fusee.com`
- **Documentation**: `/api-docs` (Swagger UI)

### **🛡️ Security Features**

#### **Authentication & Authorization**
- **JWT Bearer Token**: `Authorization: Bearer <token>`
- **API Key**: `X-API-Key: <key>` (for service-to-service)
- **Role-Based Access Control**: User, Admin roles
- **Resource Ownership**: Users can only access their own resources

#### **Rate Limiting**
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **Grid Account Creation**: 3 attempts per hour per IP
- **Documentation**: 5 requests per 15 minutes per IP

#### **Input Validation & Security**
- **Zod Schema Validation**: All inputs validated
- **Input Sanitization**: HTML entities escaped, dangerous characters removed
- **SQL Injection Prevention**: Pattern matching and Prisma ORM
- **XSS Prevention**: Script tag and event handler detection
- **Request Size Limiting**: Maximum 1MB payload

### **📚 Available Endpoints**

#### **Health & Documentation**
- `GET /health` - Server health check
- `GET /api-docs` - Interactive API documentation

#### **User Management**
- `GET /api/users` - List all users (optional auth)
- `POST /api/users` - Create new user (validation required)
- `GET /api/users/{id}` - Get user by ID (auth required)
- `PUT /api/users/{id}` - Update user (auth + ownership required)
- `DELETE /api/users/{id}` - Delete user (auth + ownership required)

#### **Grid Account Management**
- `POST /api/users/grid/initiate` - Start Grid account creation (rate limited)
- `POST /api/users/grid/complete` - Complete Grid account creation (rate limited)

### **🔐 Authentication Flow**

#### **JWT Token Authentication**
1. **Login/Register** (if implemented)
2. **Receive JWT Token**
3. **Include in requests**: `Authorization: Bearer <token>`
4. **Token expires**: Refresh or re-authenticate

#### **API Key Authentication**
1. **Obtain API Key** from admin
2. **Include in requests**: `X-API-Key: <key>`
3. **Use for service-to-service communication**

### **📊 Response Formats**

#### **Success Responses**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "middleName": "Michael",
    "phoneNumber": "+1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **Error Responses**
```json
{
  "error": "Validation failed",
  "message": "Invalid input data",
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "code": "invalid_string"
    }
  ]
}
```

#### **Rate Limit Responses**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 900
}
```

### **🚨 Error Codes**

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `AUTHENTICATION_ERROR` | Invalid or expired token | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `NOT_FOUND_ERROR` | Resource not found | 404 |
| `CONFLICT_ERROR` | Resource already exists | 409 |
| `SESSION_EXPIRED` | Pending session expired | 410 |
| `RATE_LIMIT_ERROR` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

### **🔧 Development Setup**

#### **Environment Variables**
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/fusee_backend

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Grid
GRID_ENVIRONMENT=sandbox
GRID_API_KEY=your-grid-api-key
GRID_BASE_URL=https://grid.squads.xyz

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

#### **Installation & Setup**
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npx prisma generate
npx prisma db push
npx prisma db seed

# Start development server
npm run dev
```

### **📖 Interactive Documentation**

Visit `/api-docs` for the complete interactive Swagger UI documentation where you can:

- **Explore all endpoints** with detailed descriptions
- **Test API calls** directly from the browser
- **View request/response schemas** with examples
- **Understand authentication requirements** for each endpoint
- **See rate limiting information** and error responses
- **Download OpenAPI specification** for code generation

### **🛠️ API Testing**

#### **Using Swagger UI**
1. Visit `http://localhost:3000/api-docs`
2. Click "Authorize" to add JWT token or API key
3. Select any endpoint to test
4. Fill in required parameters
5. Click "Execute" to make the request

#### **Using cURL**
```bash
# Health check
curl -X GET http://localhost:3000/health

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Get user (with auth)
curl -X GET http://localhost:3000/api/users/{id} \
  -H "Authorization: Bearer <your-jwt-token>"
```

### **🔍 Monitoring & Logging**

The API includes comprehensive logging for:
- **Request/Response logging** with Morgan
- **Security event logging** (auth failures, rate limits)
- **Error logging** with stack traces
- **Database query logging** in development
- **Performance metrics** and health checks

### **📞 Support**

For API support and questions:
- **Email**: support@fusee.com
- **Documentation**: `/api-docs`
- **Health Check**: `/health`

---

**Note**: This API implements enterprise-grade security measures. Always use HTTPS in production and keep your secrets secure.


