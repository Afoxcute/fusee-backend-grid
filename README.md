# Fusee Backend Grid

A comprehensive Node.js backend API built with Express, TypeScript, Prisma, and PostgreSQL.

## Features

- 🚀 **Express.js** with TypeScript
- 🗄️ **Prisma ORM** with PostgreSQL
- 📚 **Swagger/OpenAPI** documentation
- 🔒 **Security middleware** (Helmet, CORS)
- 📝 **Structured logging** with Winston
- 🧪 **Testing setup** with Jest
- 🔄 **Database migrations** and seeding

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

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
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL="postgresql://username:password@localhost:5432/fusee_backend"
   ```

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
