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
          required: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the user',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              example: 'John',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              example: 'Doe',
            },
            middleName: {
              type: 'string',
              description: 'User middle name',
              example: 'Michael',
              nullable: true,
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number (supports international formats)',
              example: '+2348101872122',
              pattern: '^(\\+?[1-9]\\d{1,14})|(\\(?[0-9]{3}\\)?[-.\\s]?[0-9]{3}[-.\\s]?[0-9]{4})$',
              nullable: true,
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
          required: ['email', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              example: 'John',
              minLength: 1,
              maxLength: 50,
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              example: 'Doe',
              minLength: 1,
              maxLength: 50,
            },
            middleName: {
              type: 'string',
              description: 'User middle name (optional)',
              example: 'Michael',
              maxLength: 50,
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number (optional)',
              example: '+1234567890',
              pattern: '^(\\+?1[-.\\s]?)?\\(?([0-9]{3})\\)?[-.\\s]?([0-9]{3})[-.\\s]?([0-9]{4})$',
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
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
              example: 3600,
            },
            environment: {
              type: 'string',
              description: 'Current environment',
              example: 'development',
            },
            version: {
              type: 'string',
              description: 'API version',
              example: '1.0.0',
            },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              example: 'John',
              minLength: 1,
              maxLength: 50,
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              example: 'Doe',
              minLength: 1,
              maxLength: 50,
            },
            middleName: {
              type: 'string',
              description: 'User middle name (optional)',
              example: 'Michael',
              maxLength: 50,
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number (optional)',
              example: '+1234567890',
              pattern: '^(\\+?1[-.\\s]?)?\\(?([0-9]{3})\\)?[-.\\s]?([0-9]{3})[-.\\s]?([0-9]{4})$',
            },
          },
        },
        Admin: {
          type: 'object',
          required: ['id', 'email', 'firstName', 'lastName', 'permissions', 'isActive', 'createdAt', 'updatedAt'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the admin',
              example: 'clx1234567890',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Admin email address',
              example: 'admin@example.com',
            },
            firstName: {
              type: 'string',
              description: 'Admin first name',
              example: 'John',
            },
            lastName: {
              type: 'string',
              description: 'Admin last name',
              example: 'Doe',
            },
            walletAddress: {
              type: 'string',
              description: 'Admin wallet address',
              example: '3K9Z3UX2wWZ1tEGUU9aNVgXD4uTxHwAUgJfKJUiX5AsP',
              nullable: true,
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['CAN_INITIATE', 'CAN_VOTE', 'CAN_EXECUTE', 'CAN_MANAGE_USERS', 'CAN_MANAGE_ADMINS'],
              },
              description: 'Admin permissions',
              example: ['CAN_INITIATE', 'CAN_VOTE', 'CAN_EXECUTE'],
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the admin is active',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Admin creation timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Admin last update timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        CreateAdminRequest: {
          type: 'object',
          required: ['email', 'firstName', 'lastName', 'permissions'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Admin email address',
              example: 'admin@example.com',
            },
            firstName: {
              type: 'string',
              description: 'Admin first name',
              example: 'John',
              minLength: 1,
              maxLength: 50,
            },
            lastName: {
              type: 'string',
              description: 'Admin last name',
              example: 'Doe',
              minLength: 1,
              maxLength: 50,
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['CAN_INITIATE', 'CAN_VOTE', 'CAN_EXECUTE', 'CAN_MANAGE_USERS', 'CAN_MANAGE_ADMINS'],
              },
              description: 'Admin permissions',
              example: ['CAN_INITIATE', 'CAN_VOTE', 'CAN_EXECUTE'],
              minItems: 1,
              maxItems: 4,
            },
          },
        },
        UpdateAdminRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Admin email address',
              example: 'admin@example.com',
            },
            firstName: {
              type: 'string',
              description: 'Admin first name',
              example: 'John',
              minLength: 1,
              maxLength: 50,
            },
            lastName: {
              type: 'string',
              description: 'Admin last name',
              example: 'Doe',
              minLength: 1,
              maxLength: 50,
            },
            walletAddress: {
              type: 'string',
              description: 'Admin wallet address',
              example: '3K9Z3UX2wWZ1tEGUU9aNVgXD4uTxHwAUgJfKJUiX5AsP',
              maxLength: 100,
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['CAN_INITIATE', 'CAN_VOTE', 'CAN_EXECUTE', 'CAN_MANAGE_USERS', 'CAN_MANAGE_ADMINS'],
              },
              description: 'Admin permissions',
              example: ['CAN_INITIATE', 'CAN_VOTE', 'CAN_EXECUTE'],
              minItems: 1,
              maxItems: 4,
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the admin is active',
              example: true,
            },
          },
        },
        Transaction: {
          type: 'object',
          required: ['id', 'userEmail', 'adminEmails', 'status', 'createdAt', 'updatedAt'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the transaction',
              example: 'clx1234567890',
            },
            userEmail: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            adminEmails: {
              type: 'array',
              items: {
                type: 'string',
                format: 'email',
              },
              description: 'Admin email addresses who can vote/execute',
              example: ['admin1@example.com', 'admin2@example.com'],
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'EXECUTED', 'REJECTED'],
              description: 'Transaction status',
              example: 'PENDING',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Transaction creation timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Transaction last update timestamp',
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
