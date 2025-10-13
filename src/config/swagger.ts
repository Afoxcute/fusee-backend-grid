// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fusee Backend Grid API',
      version: '1.0.0',
      description: 'A comprehensive backend API for the Fusee Grid application',
      contact: {
        name: 'API Support',
        email: 'support@fusee.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.fusee.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the user',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        CreateUserRequest: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
          },
        },
        Post: {
          type: 'object',
          required: ['id', 'title', 'authorId', 'published', 'createdAt', 'updatedAt'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the post',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            title: {
              type: 'string',
              description: 'Post title',
              example: 'Getting Started with Prisma',
            },
            content: {
              type: 'string',
              description: 'Post content',
              example: 'This is the content of the post...',
            },
            published: {
              type: 'boolean',
              description: 'Whether the post is published',
              example: true,
            },
            authorId: {
              type: 'string',
              description: 'ID of the post author',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            author: {
              $ref: '#/components/schemas/User',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Post creation timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Post last update timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        CreatePostRequest: {
          type: 'object',
          required: ['title', 'authorId'],
          properties: {
            title: {
              type: 'string',
              description: 'Post title',
              example: 'Getting Started with Prisma',
            },
            content: {
              type: 'string',
              description: 'Post content',
              example: 'This is the content of the post...',
            },
            published: {
              type: 'boolean',
              description: 'Whether the post is published',
              example: true,
            },
            authorId: {
              type: 'string',
              description: 'ID of the post author',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
          },
        },
        UpdatePostRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Post title',
              example: 'Updated Post Title',
            },
            content: {
              type: 'string',
              description: 'Post content',
              example: 'Updated post content...',
            },
            published: {
              type: 'boolean',
              description: 'Whether the post is published',
              example: false,
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Something went wrong!',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Service status',
              example: 'OK',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Current server timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Paths to files containing OpenAPI definitions
};

export const swaggerSpec = swaggerJsdoc(options);
