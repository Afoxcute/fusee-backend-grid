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
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number',
              example: '+1234567890',
            },
            walletAddress: {
              type: 'string',
              description: 'User wallet address',
              example: 'GC52tLZUiuz8UDSi7BUWn62473Cje3sGKTjxjRZ7oeEz',
            },
            role: {
              type: 'string',
              enum: ['USER'],
              description: 'User role',
              example: 'USER',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user is active',
              example: true,
            },
            gridAddress: {
              type: 'string',
              description: 'Grid account address',
              nullable: true,
              example: 'AiHQERpyjLL1rM45Ywf3uRJgGafabQ9t3fnC4BuPpXPn',
            },
            gridStatus: {
              type: 'string',
              description: 'Grid account status',
              nullable: true,
              example: 'success',
            },
            gridPolicies: {
              type: 'object',
              description: 'Grid account policies',
              nullable: true,
              example: {
                signers: [
                  {
                    address: 'FxPUhEZnfgewKSynpq82htKRCuwkKKgHndrDKFBZzoav',
                    role: 'primary',
                    permissions: ['CAN_INITIATE', 'CAN_VOTE', 'CAN_EXECUTE'],
                    provider: 'privy'
                  }
                ],
                threshold: 1,
                time_lock: null,
                admin_address: null
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
              example: '2023-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
              example: '2023-01-01T00:00:00.000Z',
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
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number',
              example: '+1234567890',
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
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number',
              example: '+1234567890',
            },
            walletAddress: {
              type: 'string',
              description: 'User wallet address',
              example: 'GC52tLZUiuz8UDSi7BUWn62473Cje3sGKTjxjRZ7oeEz',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user is active',
              example: true,
            },
          },
        },
        InitiateGridAccountRequest: {
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
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number',
              example: '+1234567890',
            },
          },
        },
        CompleteGridAccountRequest: {
          type: 'object',
          required: ['pendingKey', 'otpCode'],
          properties: {
            pendingKey: {
              type: 'string',
              description: 'Pending session key from initiate response',
              example: 'abc123...xyz789',
            },
            otpCode: {
              type: 'string',
              description: 'OTP code received via email',
              example: '123456',
            },
          },
        },
        GridAccountInitiateResponse: {
          type: 'object',
          required: ['pendingKey', 'maskedKey', 'expiresAt'],
          properties: {
            pendingKey: {
              type: 'string',
              description: 'Pending session key for completing account creation',
              example: 'abc123...xyz789',
            },
            maskedKey: {
              type: 'string',
              description: 'Masked version of the pending key for display',
              example: 'abc123...z789',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Expiration time for the pending session',
              example: '2023-01-01T01:00:00.000Z',
            },
          },
        },
        GridAccountCompleteResponse: {
          type: 'object',
          required: ['user', 'gridAccount'],
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            gridAccount: {
              type: 'object',
              required: ['address', 'status', 'policies'],
              properties: {
                address: {
                  type: 'string',
                  description: 'Grid account address',
                  example: '33atfECaKPr97XLin7WbvCjLKgetZXPpfGJprgWAYE7j',
                },
                status: {
                  type: 'string',
                  description: 'Grid account status',
                  example: 'success',
                },
                policies: {
                  type: 'object',
                  description: 'Grid account policies',
                  properties: {
                    signers: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          address: {
                            type: 'string',
                            description: 'Signer address',
                          },
                          role: {
                            type: 'string',
                            description: 'Signer role',
                          },
                          permissions: {
                            type: 'array',
                            items: {
                              type: 'string',
                            },
                            description: 'Signer permissions',
                          },
                        },
                      },
                    },
                    threshold: {
                      type: 'integer',
                      description: 'Signature threshold',
                    },
                    time_lock: {
                      type: 'integer',
                      description: 'Time lock in seconds',
                    },
                  },
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'User not found',
            },
            conflicts: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of conflict messages',
            },
            fields: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of conflicting fields',
            },
          },
        },
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Something went wrong!',
            },
            stack: {
              type: 'string',
              description: 'Error stack trace (only in development)',
              example: 'Error: Something went wrong!\n    at ...',
            },
          },
        },
        ValidationError: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Validation error message',
              example: 'Validation failed',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name that failed validation',
                  },
                  message: {
                    type: 'string',
                    description: 'Validation error message for this field',
                  },
                },
              },
              description: 'Detailed validation errors',
            },
          },
        },
        RateLimitError: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Rate limit error message',
              example: 'Too many requests',
            },
            retryAfter: {
              type: 'integer',
              description: 'Seconds to wait before retrying',
              example: 60,
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
              example: 'Operation completed successfully',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          required: ['status', 'timestamp', 'uptime', 'environment', 'version'],
          properties: {
            status: {
              type: 'string',
              description: 'Server health status',
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
              description: 'Application version',
              example: '1.0.0',
            },
          },
        },
        TokenBalance: {
          type: 'object',
          required: ['balance', 'formattedBalance', 'decimals', 'mint', 'symbol', 'uiAmount'],
          properties: {
            balance: {
              type: 'string',
              description: 'Raw token balance as a string (to handle large numbers)',
              example: '1000000',
            },
            formattedBalance: {
              type: 'string',
              description: 'Human-readable formatted balance',
              example: '1.000000',
            },
            decimals: {
              type: 'integer',
              description: 'Number of decimal places for this token',
              example: 6,
            },
            mint: {
              type: 'string',
              description: 'Token mint address',
              example: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
            },
            symbol: {
              type: 'string',
              description: 'Token symbol',
              example: 'USDC',
            },
            uiAmount: {
              type: 'number',
              description: 'Balance as a number for UI display',
              example: 1.0,
            },
          },
        },
        UserBalancesResponse: {
          type: 'object',
          required: ['user', 'balances'],
          properties: {
            user: {
              type: 'object',
              required: ['id', 'email', 'firstName', 'lastName', 'walletAddress'],
              properties: {
                id: {
                  type: 'string',
                  description: 'User ID',
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
                walletAddress: {
                  type: 'string',
                  description: 'User wallet address',
                  example: 'GC52tLZUiuz8UDSi7BUWn62473Cje3sGKTjxjRZ7oeEz',
                },
              },
            },
            balances: {
              type: 'object',
              required: ['sol', 'usdc'],
              properties: {
                sol: {
                  $ref: '#/components/schemas/TokenBalance',
                  description: 'SOL balance information',
                },
                usdc: {
                  $ref: '#/components/schemas/TokenBalance',
                  description: 'USDC balance information',
                },
                summary: {
                  type: 'object',
                  required: ['totalTokens', 'hasNative', 'hasUsdc'],
                  properties: {
                    totalTokens: {
                      type: 'integer',
                      description: 'Total number of SPL tokens',
                      example: 5,
                    },
                    hasNative: {
                      type: 'boolean',
                      description: 'Whether the account has native SOL',
                      example: true,
                    },
                    hasUsdc: {
                      type: 'boolean',
                      description: 'Whether the account has USDC',
                      example: true,
                    },
                    queryParams: {
                      type: 'object',
                      description: 'Query parameters used (if any)',
                      nullable: true,
                    },
                  },
                },
                allTokens: {
                  type: 'array',
                  items: {
                    type: 'object',
                    description: 'All SPL token balances',
                  },
                  description: 'Complete list of all token balances',
                },
                native: {
                  type: 'object',
                  nullable: true,
                  description: 'Native SOL balance information',
                },
              },
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
          },
        },
        CompleteLoginRequest: {
          type: 'object',
          required: ['pendingKey', 'otpCode'],
          properties: {
            pendingKey: {
              type: 'string',
              description: 'Pending session key from login initiation',
              example: 'abc123...xyz789',
            },
            otpCode: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              description: 'OTP code received via email (6 digits)',
              example: '123456',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          required: ['message', 'token', 'user'],
          properties: {
            message: {
              type: 'string',
              description: 'Login success message',
              example: 'Login successful',
            },
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              type: 'object',
              required: ['id', 'email', 'firstName', 'lastName'],
              properties: {
                id: {
                  type: 'string',
                  description: 'User ID',
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
                walletAddress: {
                  type: 'string',
                  description: 'User wallet address',
                  example: 'GC52tLZUiuz8UDSi7BUWn62473Cje3sGKTjxjRZ7oeEz',
                },
                gridAddress: {
                  type: 'string',
                  description: 'Grid account address',
                  example: 'YmeQtLhGS2GhLcBiGug6Pv1dTv75vUKFCSwdb2nffzV',
                },
                gridStatus: {
                  type: 'string',
                  description: 'Grid account status',
                  example: 'success',
                },
              },
            },
          },
        },
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'API key authentication',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token authentication',
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export default swaggerJsdoc(options);