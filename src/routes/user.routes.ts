import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createUserSchema,
  updateUserSchema,
  initiateGridAccountSchema,
  completeGridAccountSchema,
} from '../schemas/user.schemas';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users in the system. Authentication is optional - if provided, additional user details may be included.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', userController.getUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user in the system. All input data is validated and sanitized for security.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *           examples:
 *             validUser:
 *               summary: Valid user creation
 *               value:
 *                 email: "john.doe@example.com"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 middleName: "Michael"
 *                 phoneNumber: "+1234567890"
 *             minimalUser:
 *               summary: Minimal user creation
 *               value:
 *                 email: "jane.smith@example.com"
 *                 firstName: "Jane"
 *                 lastName: "Smith"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - Invalid input data or validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Conflict - User with this email or phone number already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       413:
 *         description: Request entity too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', validateRequest(createUserSchema), userController.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID. Requires authentication.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       403:
 *         description: Forbidden - Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', userController.getUserById);

/**
 * @swagger
 * /api/users/email/{email}:
 *   get:
 *     summary: Get user by email
 *     description: Retrieve a specific user by their email address
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *         example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/email/:email', userController.getUserByEmail);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update an existing user's information
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', validateRequest(updateUserSchema), userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user from the system. Requires authentication and ownership of the user resource.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       403:
 *         description: Forbidden - Access denied or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', userController.deleteUser);

// Grid account routes with validation
/**
 * @swagger
 * /api/users/grid/initiate:
 *   post:
 *     summary: Initiate Grid account creation
 *     description: |
 *       Starts the process of creating a new Grid account for a user. This endpoint has special rate limiting (3 attempts per hour per IP).
 *       
 *       The process involves:
 *       1. Creating a Grid account with the provided user information
 *       2. Generating session secrets for authentication
 *       3. Storing pending session data with a unique key
 *       4. Returning a pending key for completing the account creation
 *       
 *       **Security Features:**
 *       - Rate limited to 3 attempts per hour per IP
 *       - Input validation and sanitization
 *       - Secure session management
 *     tags: [Users, Grid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InitiateGridAccountRequest'
 *           examples:
 *             completeUser:
 *               summary: Complete user information
 *               value:
 *                 email: "john.doe@example.com"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 middleName: "Michael"
 *                 phoneNumber: "+1234567890"
 *             minimalUser:
 *               summary: Minimal required information
 *               value:
 *                 email: "jane.smith@example.com"
 *                 firstName: "Jane"
 *                 lastName: "Smith"
 *     responses:
 *       201:
 *         description: Grid account initiation successful. Returns a pending key for completion.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GridAccountInitiateResponse'
 *             examples:
 *               success:
 *                 summary: Successful initiation
 *                 value:
 *                   pendingKey: "123e4567-e89b-12d3-a456-426614174000"
 *                   maskedKey: "123e4567...4000"
 *                   expiresAt: "2024-01-01T00:10:00.000Z"
 *       400:
 *         description: Bad request - Invalid input data or validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               validationError:
 *                 summary: Validation error
 *                 value:
 *                   error: "Validation failed"
 *                   message: "Invalid input data"
 *                   code: "VALIDATION_ERROR"
 *                   details:
 *                     - field: "email"
 *                       message: "Please provide a valid email address"
 *                       code: "invalid_string"
 *       413:
 *         description: Request entity too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - Grid account creation rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *             examples:
 *               rateLimit:
 *                 summary: Rate limit exceeded
 *                 value:
 *                   error: "Too many requests"
 *                   message: "Too many Grid account creation attempts, please try again later."
 *                   retryAfter: 3600
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/grid/initiate', validateRequest(initiateGridAccountSchema), userController.initiateGridAccount);

/**
 * @swagger
 * /api/users/grid/complete:
 *   post:
 *     summary: Complete Grid account creation
 *     description: |
 *       Completes the Grid account creation process using the pending key and OTP code. This endpoint has special rate limiting (3 attempts per hour per IP).
 *       
 *       The process involves:
 *       1. Validating the pending key and checking expiration
 *       2. Authenticating with the Grid service using the OTP code
 *       3. Creating the final Grid account
 *       4. Optionally creating a local user record
 *       5. Cleaning up the pending session
 *       
 *       **Security Features:**
 *       - Rate limited to 3 attempts per hour per IP
 *       - OTP code validation (6 digits)
 *       - Pending key expiration (10 minutes)
 *       - Secure session cleanup
 *     tags: [Users, Grid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteGridAccountRequest'
 *           examples:
 *             validCompletion:
 *               summary: Valid completion request
 *               value:
 *                 pendingKey: "123e4567-e89b-12d3-a456-426614174000"
 *                 otpCode: "123456"
 *     responses:
 *       201:
 *         description: Grid account created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GridAccountCompleteResponse'
 *             examples:
 *               success:
 *                 summary: Successful completion
 *                 value:
 *                   data:
 *                     address: "grid123456789abcdef"
 *       400:
 *         description: Bad request - Invalid input data or Grid authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               invalidOtp:
 *                 summary: Invalid OTP code
 *                 value:
 *                   error: "Validation failed"
 *                   message: "Invalid OTP code"
 *                   code: "VALIDATION_ERROR"
 *               gridAuthFailed:
 *                 summary: Grid authentication failed
 *                 value:
 *                   error: "Grid authentication failed"
 *                   message: "Invalid OTP code or expired session"
 *                   code: "AUTHENTICATION_ERROR"
 *       410:
 *         description: Gone - Pending session not found or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               expiredSession:
 *                 summary: Expired session
 *                 value:
 *                   error: "Pending session not found or expired"
 *                   message: "The pending session has expired. Please initiate a new Grid account creation."
 *                   code: "SESSION_EXPIRED"
 *       413:
 *         description: Request entity too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - Grid account completion rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/grid/complete', validateRequest(completeGridAccountSchema), userController.completeGridAccount);

// Balance routes
/**
 * @swagger
 * /api/users/email/{email}/balances:
 *   get:
 *     summary: Get user balances by email
 *     description: Retrieve SOL and USDC balances for a user identified by their email address (USDC on devnet). Supports filtering and pagination.
 *     tags: [Users, Balances]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *         example: "john.doe@example.com"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of tokens to return
 *         example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of tokens to skip
 *         example: 0
 *       - in: query
 *         name: mint
 *         schema:
 *           type: string
 *         description: Filter by specific token mint address
 *         example: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
 *     responses:
 *       200:
 *         description: User balances retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserBalancesResponse'
 *       400:
 *         description: Bad request - User does not have a wallet address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/email/:email/balances', userController.getUserBalances);

/**
 * @swagger
 * /api/users/wallet/{walletAddress}/balances:
 *   get:
 *     summary: Get user balances by wallet address
 *     description: Retrieve SOL and USDC balances for a user identified by their wallet address (USDC on devnet). Supports filtering and pagination.
 *     tags: [Users, Balances]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: User wallet address (Solana public key)
 *         example: "GC52tLZUiuz8UDSi7BUWn62473Cje3sGKTjxjRZ7oeEz"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of tokens to return
 *         example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of tokens to skip
 *         example: 0
 *       - in: query
 *         name: mint
 *         schema:
 *           type: string
 *         description: Filter by specific token mint address
 *         example: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
 *     responses:
 *       200:
 *         description: User balances retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserBalancesResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/wallet/:walletAddress/balances', userController.getUserBalancesByWallet);

// Test endpoint for debugging Grid configuration
/**
 * @swagger
 * /api/users/test-grid-config:
 *   get:
 *     summary: Test Grid configuration
 *     description: Test endpoint to debug Grid API configuration and connectivity
 *     tags: [Users, Debug]
 *     responses:
 *       200:
 *         description: Grid configuration test results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Grid configuration is valid"
 *                 environment:
 *                   type: string
 *                   example: "sandbox"
 *                 hasApiKey:
 *                   type: boolean
 *                   example: true
 *                 apiKeyLength:
 *                   type: integer
 *                   example: 32
 *                 testResult:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     error:
 *                       type: string
 *                     hasData:
 *                       type: boolean
 *       500:
 *         description: Grid configuration error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/test-grid-config', userController.testGridConfig);

export default router;
