# Fusee Backend Grid

A comprehensive Node.js backend API built with Express, TypeScript, Prisma, and PostgreSQL.

## Features

- 🚀 **Express.js** with TypeScript
- 🗄️ **Prisma ORM** with PostgreSQL
- 📚 **Swagger/OpenAPI** documentation
- 🔒 **Comprehensive Security** (Helmet, CORS, Rate Limiting, Input Validation)
- 🛡️ **Authentication & Authorization** (JWT, bcrypt, Role-based access)
- 🚫 **Attack Prevention** (SQL Injection, XSS, CSRF protection)
- 📝 **Structured logging** with Winston
- 🧪 **Testing setup** with Jest
- 🔄 **Database migrations** and seeding
- 📊 **Monitoring & Health Checks**

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Redis (optional, for caching/sessions)
- npm or yarn
- Grid API key from [Squads Grid](https://grid.squads.xyz)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fusee-backend-grid
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   **Option A: Interactive Setup (Recommended)**
   ```bash
   npm run setup:env
   ```

   **Option B: Manual Setup**
   Create a `.env` file in the root directory:
   ```env
   # Application Configuration
   NODE_ENV=development
   PORT=3000

   # Database Configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/fusee_backend"

   # Grid Configuration (Squads Grid)
   GRID_ENVIRONMENT=sandbox
   GRID_API_KEY=your_grid_api_key_here
   GRID_BASE_URL=https://grid.squads.xyz

   # Redis Configuration (Optional - for caching/sessions)
   REDIS_URL=redis://localhost:6379
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=

   # Security Configuration (Required for Production)
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d
   BCRYPT_ROUNDS=12
   SESSION_SECRET=your-session-secret-key
   VALID_API_KEYS=key1,key2,key3
   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com,https://app.yourdomain.com
   CORS_MAX_AGE=86400
   ENABLE_CORS_LOGGING=true
   
   # Rate Limiting Configuration
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   AUTH_RATE_LIMIT_WINDOW_MS=900000
   AUTH_RATE_LIMIT_MAX_REQUESTS=5
   
   # Logging Configuration
   LOG_LEVEL=info
   ENABLE_REQUEST_LOGGING=true
   ENABLE_ERROR_LOGGING=true
   LOG_TO_FILE=false
   LOG_DIRECTORY=./logs
   
   # Monitoring Configuration
   ENABLE_METRICS=true
   METRICS_PORT=9090
   ENABLE_HEALTH_CHECKS=true
   ```

## Environment Variables Setup

### Required Variables

1. **Database Configuration**
   - `DATABASE_URL`: PostgreSQL connection string
   - Format: `postgresql://username:password@host:port/database_name`

2. **Grid Configuration**
   - `GRID_ENVIRONMENT`: Either `sandbox` or `production`
   - `GRID_API_KEY`: Your API key from Squads Grid
   - `GRID_BASE_URL`: Grid API base URL (default: https://grid.squads.xyz)

### Optional Variables

3. **Redis Configuration** (if using Redis for caching/sessions)
   - `REDIS_URL`: Redis connection string
   - `REDIS_HOST`: Redis host (default: localhost)
   - `REDIS_PORT`: Redis port (default: 6379)
   - `REDIS_PASSWORD`: Redis password (if required)

4. **Application Configuration**
   - `NODE_ENV`: Environment (development/production)
   - `PORT`: Server port (default: 3000)

### Getting Your Grid API Key

1. Visit [Squads Grid](https://grid.squads.xyz)
2. Sign up for an account
3. Navigate to your dashboard
4. Generate an API key
5. Copy the key to your `.env` file

### Database Setup

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database (for development)
   npm run db:push
   
   # Or run migrations (for production)
   npm run db:migrate
   
   # Seed the database with sample data
   npm run db:seed
   ```

## Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Access the API**
   - API Base URL: `http://localhost:3000`
   - Swagger Documentation: `http://localhost:3000/api-docs`
   - Health Check: `http://localhost:3000/health`

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build the TypeScript project
- `npm run start` - Start the production server
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed the database
- `npm run setup:env` - Interactive environment setup

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post
- `GET /api/posts/:id` - Get post by ID
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Grid Account Management
- `POST /api/users/grid/initiate` - Initiate Grid account creation
- `POST /api/users/grid/complete` - Complete Grid account creation with OTP

## Database Schema

### User Model
- `id` (String, Primary Key)
- `email` (String, Unique)
- `name` (String)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Post Model
- `id` (String, Primary Key)
- `title` (String)
- `content` (String, Optional)
- `published` (Boolean, Default: false)
- `authorId` (String, Foreign Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

## Project Structure

```
src/
├── config/
│   ├── env.ts          # Environment configuration
│   └── swagger.ts      # Swagger/OpenAPI configuration
├── controllers/
│   ├── user.controller.ts
│   └── post.controller.ts
├── lib/
│   └── prisma.ts       # Prisma client configuration
├── routes/
│   ├── user.routes.ts
│   └── post.routes.ts
├── utils/
│   └── logger.ts       # Winston logger configuration
├── app.ts              # Express app setup
└── server.ts           # Server entry point

prisma/
├── schema.prisma       # Database schema
└── seed.ts            # Database seeding script
```

## Security

This application implements comprehensive security measures to protect against common vulnerabilities:

- **Input Validation**: All inputs are validated using Zod schemas
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Authorization**: Role-based access control and resource ownership
- **Rate Limiting**: Protection against DDoS and brute force attacks
- **Security Headers**: Helmet.js for comprehensive security headers
- **CORS Protection**: Environment-based cross-origin resource sharing
- **SQL Injection Prevention**: Prisma ORM with input sanitization
- **XSS Protection**: Input sanitization and output encoding
- **Error Handling**: Secure error responses without information leakage

For detailed security information, see [SECURITY.md](./SECURITY.md).

### CORS Configuration

The API uses environment-based CORS configuration for secure cross-origin requests:

- **Development**: Allows localhost origins for local development
- **Production**: Only allows explicitly configured domains
- **Security**: Blocks requests without origin headers in production
- **Flexibility**: Supports multiple subdomains and environments

For detailed CORS setup instructions, see [CORS_CONFIGURATION.md](./CORS_CONFIGURATION.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
