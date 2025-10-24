import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createUserSchema,
  updateUserSchema,
  initiateGridAccountSchema,
  completeGridAccountSchema,
  gridLoginSchema,
} from '../schemas/user.schemas';
import {
  prepareTransactionSchema,
  executeTransactionSchema,
  sendTransactionSchema,
  sendSolTransactionSchema,
  sendUsdcTransactionSchema,
} from '../schemas/transaction.schemas';
import { completeLoginSchema } from '../schemas/auth.schemas';

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
 *       3. Initiating Grid account creation with email
 *       4. Returning success message with instructions
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
 *         description: Grid account initiation successful. Returns instructions for completion.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GridAccountInitiateResponse'
 *             examples:
 *               success:
 *                 summary: Successful initiation
 *                 value:
 *                   message: "Account creation initiated successfully"
 *                   email: "john.doe@example.com"
 *                   instructions: "Check your email for the OTP code and use it with the complete endpoint"
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
/**
 * @swagger
 * /api/users/grid/check-status:
 *   post:
 *     summary: Check Grid account status for an email
 *     description: |
 *       Checks if a Grid account exists for the given email and provides guidance on next steps.
 *       This endpoint helps users understand their account status and what actions they can take.
 *       
 *       Possible responses:
 *       - `user_exists`: User account exists in database
 *       - `grid_account_exists`: Grid account exists but no user record
 *       - `grid_account_available`: No account exists, can create new one
 *       - `unknown`: Unable to determine status
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to check
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Account status checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [user_exists, grid_account_exists, grid_account_available, unknown]
 *                   description: Status of the account
 *                 message:
 *                   type: string
 *                   description: Human-readable status message
 *                 user:
 *                   type: object
 *                   description: User data (only present if status is user_exists)
 *                 guidance:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       description: Guidance message
 *                     action:
 *                       type: string
 *                       description: Recommended action
 *                     endpoint:
 *                       type: string
 *                       description: Recommended endpoint to use
 *                     requiredFields:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Required fields for the recommended action
 *                     note:
 *                       type: string
 *                       description: Additional note (optional)
 *       400:
 *         description: Bad request - Missing email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /api/users/grid/request-otp:
 *   post:
 *     summary: Request OTP for existing Grid account
 *     description: |
 *       Requests an OTP code for an existing Grid account that doesn't have a user record in the database.
 *       This is useful when a Grid account exists but the user needs to complete the account setup process.
 *       
 *       Use this endpoint when:
 *       - You get "Grid account already exists" error from the initiate endpoint
 *       - You need to complete account setup for an existing Grid account
 *       - You want to authenticate with an existing Grid account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the existing Grid account
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 email:
 *                   type: string
 *                   description: Email address
 *                 instructions:
 *                   type: string
 *                   description: Instructions for next steps
 *                 guidance:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       description: Recommended action
 *                     endpoint:
 *                       type: string
 *                       description: Next endpoint to use
 *                     requiredFields:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Required fields for the next step
 *       400:
 *         description: Bad request - Missing email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Conflict - User already exists or Grid account issue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 *                 guidance:
 *                   type: object
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/grid/request-otp', userController.requestOtpForExistingAccount);

router.post('/grid/check-status', userController.checkGridAccountStatus);

router.post('/grid/initiate', validateRequest(initiateGridAccountSchema), userController.initiateGridAccount);

/**
 * @swagger
 * /api/users/grid/complete:
 *   post:
 *     summary: Complete Grid account creation
 *     description: |
 *       Completes the Grid account creation process using email and OTP code. This endpoint has special rate limiting (3 attempts per hour per IP).
 *       
 *       The process involves:
 *       1. Validating the email and OTP code
 *       2. Authenticating with the Grid service using the OTP code
 *       3. Creating the final Grid account
 *       4. Creating a local user record with Grid account data
 *       
 *       **Security Features:**
 *       - Rate limited to 3 attempts per hour per IP
 *       - OTP code validation (6 digits)
 *       - Email validation
 *       - Secure account creation
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
 *                 email: "john.doe@example.com"
 *                 otpCode: "123456"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 middleName: "Michael"
 *                 phoneNumber: "+1234567890"
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
 *               invalidOtp:
 *                 summary: Invalid OTP code
 *                 value:
 *                   error: "Invalid OTP code"
 *                   message: "The OTP code provided is invalid or has expired."
 *                   code: "INVALID_OTP"
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

/**
 * @swagger
 * /api/users/grid/login:
 *   post:
 *     summary: Grid-based user login
 *     description: |
 *       Authenticate a user using Grid-based authentication. This endpoint provides an alternative
 *       login method that integrates with the Grid system for enhanced security.
 *       
 *       **Authentication Flow:**
 *       1. User provides their email address
 *       2. System validates the user exists and is active
 *       3. Returns JWT token for authenticated requests
 *       
 *       **Security Features:**
 *       - Email validation
 *       - Active user verification
 *       - JWT token generation with 24-hour expiry
 *       - Grid system integration
 *     tags: [Users, Authentication, Grid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             validLogin:
 *               summary: Valid Grid login request
 *               value:
 *                 email: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             examples:
 *               success:
 *                 summary: Successful Grid login
 *                 value:
 *                   message: "Login successful"
 *                   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   user:
 *                     id: "123e4567-e89b-12d3-a456-426614174000"
 *                     email: "john.doe@example.com"
 *                     firstName: "John"
 *                     lastName: "Doe"
 *                     walletAddress: "GC52tLZUiuz8UDSi7BUWn62473Cje3sGKTjxjRZ7oeEz"
 *                     gridAddress: "YmeQtLhGS2GhLcBiGug6Pv1dTv75vUKFCSwdb2nffzV"
 *                     gridStatus: "success"
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               userNotFound:
 *                 summary: User not found
 *                 value:
 *                   message: "User doesn't exist. Please sign up before proceeding"
 *               inactiveUser:
 *                 summary: Inactive user
 *                 value:
 *                   message: "Account is inactive. Please contact support."
 *       400:
 *         description: Bad request - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/grid/login', validateRequest(gridLoginSchema), userController.initGridAuth);

/**
 * @swagger
 * /api/users/grid/login/complete:
 *   post:
 *     summary: Complete Grid authentication for existing users
 *     description: |
 *       Completes the Grid authentication process for existing users using email and OTP code. 
 *       This endpoint is for users who already have accounts but need to authenticate with Grid.
 *       
 *       The process involves:
 *       1. Validating the email and OTP code
 *       2. Authenticating with the Grid service using the OTP code
 *       3. Updating the user's authentication data in the database
 *       4. Generating a new JWT token
 *       
 *       **Security Features:**
 *       - Rate limited to 3 attempts per hour per IP
 *       - OTP code validation
 *       - User account status verification
 *     tags: [Users, Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteLoginRequest'
 *     responses:
 *       200:
 *         description: Grid authentication completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Bad request - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - Invalid credentials or inactive account
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
router.post('/grid/login/complete', validateRequest(completeLoginSchema), userController.completeGridAuth);

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

// Debug endpoint for troubleshooting balance issues
/**
 * @swagger
 * /api/users/email/{email}/debug-balances:
 *   get:
 *     summary: Debug user balances
 *     description: Debug endpoint to check raw Grid API response for troubleshooting balance issues
 *     tags: [Users, Debug]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *         example: "user@example.com"
 *     responses:
 *       200:
 *         description: Debug information for user balances
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: User information
 *                 debug:
 *                   type: object
 *                   description: Debug information including raw Grid API response
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/email/:email/debug-balances', userController.debugUserBalances);

// Update user Grid account data endpoint
/**
 * @swagger
 * /api/users/email/{email}/update-grid-data:
 *   put:
 *     summary: Update user Grid account data
 *     description: Update a user's Grid account data (address, status, policies) for debugging purposes
 *     tags: [Users, Debug]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *         example: "user@example.com"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gridAddress]
 *             properties:
 *               gridAddress:
 *                 type: string
 *                 description: Grid account address
 *                 example: "YmeQtLhGS2GhLcBiGug6Pv1dTv75vUKFCSwdb2nffzV"
 *               gridStatus:
 *                 type: string
 *                 description: Grid account status
 *                 example: "success"
 *               gridPolicies:
 *                 type: object
 *                 description: Grid account policies
 *                 example:
 *                   signers: []
 *                   threshold: 1
 *                   time_lock: null
 *                   admin_address: null
 *     responses:
 *       200:
 *         description: User Grid account data updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User Grid account data updated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - Grid address is required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/email/:email/update-grid-data', userController.updateUserGridData);

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

/**
 * @swagger
 * /api/users/email/{email}/grid-data:
 *   get:
 *     summary: Get complete Grid account data
 *     description: Retrieve all Grid SDK response data stored for a user, including authentication data, account data, session data, and metadata
 *     tags: [Users, Grid]
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
 *         description: Complete Grid data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: Basic user information
 *                 gridAccount:
 *                   type: object
 *                   description: Grid account basic information
 *                 completeGridData:
 *                   type: object
 *                   description: Complete Grid SDK response data
 *                   properties:
 *                     authData:
 *                       type: object
 *                       description: Complete authentication data from Grid SDK
 *                     accountData:
 *                       type: object
 *                       description: Complete account creation response from Grid SDK
 *                     sessionData:
 *                       type: object
 *                       description: Session and authentication details
 *                     metadata:
 *                       type: object
 *                       description: Additional metadata from Grid SDK responses
 *                 summary:
 *                   type: object
 *                   description: Data completeness summary
 *                   properties:
 *                     hasGridAccount:
 *                       type: boolean
 *                     hasAuthData:
 *                       type: boolean
 *                     hasAccountData:
 *                       type: boolean
 *                     hasSessionData:
 *                       type: boolean
 *                     hasMetadata:
 *                       type: boolean
 *                     dataCompleteness:
 *                       type: object
 *                       properties:
 *                         authData:
 *                           type: string
 *                           enum: [Complete, Missing]
 *                         accountData:
 *                           type: string
 *                           enum: [Complete, Missing]
 *                         sessionData:
 *                           type: string
 *                           enum: [Complete, Missing]
 *                         metadata:
 *                           type: string
 *                           enum: [Complete, Missing]
 *       400:
 *         description: User does not have a Grid account
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
router.get('/email/:email/grid-data', userController.getUserGridData);

// Transaction routes
/**
 * @swagger
 * /api/users/transactions/prepare:
 *   post:
 *     summary: Prepare transaction for Grid SDK execution
 *     description: |
 *       Prepares a transaction for execution using the Grid SDK. This endpoint creates a raw transaction
 *       using the blockchain service and then prepares it using Grid's prepareArbitraryTransaction method.
 *       
 *       **Transaction Flow:**
 *       1. Validates sender and recipient users
 *       2. Checks Grid account data availability
 *       3. Creates raw transaction using blockchain service
 *       4. Prepares transaction using Grid SDK
 *       5. Returns prepared transaction payload for execution
 *       
 *       **Requirements:**
 *       - Sender must have complete Grid account data (gridAddress, gridAccountData, gridSessionData)
 *       - Both users must be active
 *       - Blockchain service must be available
 *     tags: [Users, Transactions, Grid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromEmail, toEmail, amount, tokenMint]
 *             properties:
 *               fromEmail:
 *                 type: string
 *                 format: email
 *                 description: Sender's email address
 *               toEmail:
 *                 type: string
 *                 format: email
 *                 description: Recipient's email address
 *               amount:
 *                 type: string
 *                 description: Amount to send
 *               tokenMint:
 *                 type: string
 *                 description: Token mint address
 *               memo:
 *                 type: string
 *                 description: Optional transaction memo
 *           examples:
 *             solTransaction:
 *               summary: SOL transaction preparation
 *               value:
 *                 fromEmail: "sender@example.com"
 *                 toEmail: "recipient@example.com"
 *                 amount: "0.1"
 *                 tokenMint: "So11111111111111111111111111111111111111112"
 *                 memo: "Payment for services"
 *             usdcTransaction:
 *               summary: USDC transaction preparation
 *               value:
 *                 fromEmail: "sender@example.com"
 *                 toEmail: "recipient@example.com"
 *                 amount: "10.0"
 *                 tokenMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
 *                 memo: "USDC payment"
 *     responses:
 *       200:
 *         description: Transaction prepared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transaction:
 *                   type: object
 *                 transactionPayload:
 *                   type: object
 *                 gridData:
 *                   type: object
 *                 blockchainInfo:
 *                   type: object
 *       400:
 *         description: Bad request - Missing Grid account data or invalid input
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
router.post('/transactions/prepare', validateRequest(prepareTransactionSchema), userController.prepareTransaction);

/**
 * @swagger
 * /api/users/transactions/execute:
 *   post:
 *     summary: Execute prepared transaction using Grid SDK
 *     description: |
 *       Executes a prepared transaction using the Grid SDK's signAndSend method. This endpoint
 *       takes a prepared transaction payload and executes it using the user's Grid account data.
 *       
 *       **Execution Flow:**
 *       1. Validates sender user and Grid account data
 *       2. Uses stored sessionSecrets and accountData from database
 *       3. Executes transaction using Grid SDK signAndSend
 *       4. Returns transaction signature and execution result
 *       
 *       **Requirements:**
 *       - Sender must have complete Grid account data
 *       - Valid transaction payload from prepare endpoint
 *     tags: [Users, Transactions, Grid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromEmail, transactionPayload]
 *             properties:
 *               fromEmail:
 *                 type: string
 *                 format: email
 *                 description: Sender's email address
 *               transactionPayload:
 *                 type: object
 *                 properties:
 *                   transaction:
 *                     type: string
 *                   transaction_signers:
 *                     type: array
 *                     items:
 *                       type: string
 *                   kms_payloads:
 *                     type: array
 *                     items:
 *                       type: object
 *               memo:
 *                 type: string
 *                 description: Optional transaction memo
 *           examples:
 *             executeTransaction:
 *               summary: Execute prepared transaction
 *               value:
 *                 fromEmail: "sender@example.com"
 *                 transactionPayload:
 *                   transaction: "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABBCk..."
 *                   transaction_signers: ["ELZZGyUaouBYC4K23QhL82BR8VRnQNvofkjoP5z7HvBV"]
 *                   kms_payloads:
 *                     - provider: "privy"
 *                       address: "5FHwkrdxntdK24hgQU8qgBjn35Y1zwhz1GZwCkP2UJnM"
 *                       payload: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 memo: "Payment execution"
 *     responses:
 *       200:
 *         description: Transaction executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transaction:
 *                   type: object
 *                 executionResult:
 *                   type: object
 *                 gridData:
 *                   type: object
 *       400:
 *         description: Bad request - Missing Grid account data
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
router.post('/transactions/execute', validateRequest(executeTransactionSchema), userController.executeTransaction);

/**
 * @swagger
 * /api/users/transactions/send:
 *   post:
 *     summary: Send transaction (prepare and execute in one call)
 *     description: |
 *       Sends a transaction by combining preparation and execution in a single call. This endpoint
 *       creates a raw transaction, prepares it using Grid SDK, and immediately executes it.
 *       
 *       **Complete Flow:**
 *       1. Validates sender and recipient users
 *       2. Creates raw transaction using blockchain service
 *       3. Prepares transaction using Grid SDK
 *       4. Executes transaction using Grid SDK signAndSend
 *       5. Returns transaction signature and execution result
 *       
 *       **Requirements:**
 *       - Sender must have complete Grid account data
 *       - Both users must be active
 *       - Blockchain service must be available
 *     tags: [Users, Transactions, Grid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromEmail, toEmail, amount, tokenMint]
 *             properties:
 *               fromEmail:
 *                 type: string
 *                 format: email
 *               toEmail:
 *                 type: string
 *                 format: email
 *               amount:
 *                 type: string
 *               tokenMint:
 *                 type: string
 *               memo:
 *                 type: string
 *           examples:
 *             solTransaction:
 *               summary: Send SOL transaction
 *               value:
 *                 fromEmail: "sender@example.com"
 *                 toEmail: "recipient@example.com"
 *                 amount: "0.1"
 *                 tokenMint: "So11111111111111111111111111111111111111112"
 *                 memo: "SOL payment"
 *             usdcTransaction:
 *               summary: Send USDC transaction
 *               value:
 *                 fromEmail: "sender@example.com"
 *                 toEmail: "recipient@example.com"
 *                 amount: "10.0"
 *                 tokenMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
 *                 memo: "USDC payment"
 *     responses:
 *       200:
 *         description: Transaction sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transaction:
 *                   type: object
 *                 executionResult:
 *                   type: object
 *                 blockchainInfo:
 *                   type: object
 *       400:
 *         description: Bad request - Missing Grid account data or invalid input
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
router.post('/transactions/send', validateRequest(sendTransactionSchema), userController.sendTransaction);

/**
 * @swagger
 * /api/users/transactions/send-sol:
 *   post:
 *     summary: Send SOL transaction
 *     description: |
 *       Convenience endpoint for sending SOL transactions. This endpoint automatically sets the
 *       token mint to SOL and calls the general send transaction endpoint.
 *       
 *       **Token Details:**
 *       - Token: SOL (Native Solana)
 *       - Mint: So11111111111111111111111111111111111111112
 *       - Decimals: 9
 *       
 *       **Requirements:**
 *       - Sender must have complete Grid account data
 *       - Both users must be active
 *     tags: [Users, Transactions, Grid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromEmail, toEmail, amount]
 *             properties:
 *               fromEmail:
 *                 type: string
 *                 format: email
 *               toEmail:
 *                 type: string
 *                 format: email
 *               amount:
 *                 type: string
 *               memo:
 *                 type: string
 *           examples:
 *             solPayment:
 *               summary: Send SOL payment
 *               value:
 *                 fromEmail: "sender@example.com"
 *                 toEmail: "recipient@example.com"
 *                 amount: "0.5"
 *                 memo: "SOL payment for services"
 *     responses:
 *       200:
 *         description: SOL transaction sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transaction:
 *                   type: object
 *                 executionResult:
 *                   type: object
 *                 blockchainInfo:
 *                   type: object
 *       400:
 *         description: Bad request - Missing Grid account data or invalid input
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
router.post('/transactions/send-sol', validateRequest(sendSolTransactionSchema), userController.sendSolTransaction);

/**
 * @swagger
 * /api/users/transactions/send-usdc:
 *   post:
 *     summary: Send USDC transaction
 *     description: |
 *       Convenience endpoint for sending USDC transactions on devnet. This endpoint automatically
 *       sets the token mint to devnet USDC and calls the general send transaction endpoint.
 *       
 *       **Token Details:**
 *       - Token: USDC (USD Coin)
 *       - Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU (Devnet USDC)
 *       - Decimals: 6
 *       
 *       **Requirements:**
 *       - Sender must have complete Grid account data
 *       - Both users must be active
 *     tags: [Users, Transactions, Grid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromEmail, toEmail, amount]
 *             properties:
 *               fromEmail:
 *                 type: string
 *                 format: email
 *               toEmail:
 *                 type: string
 *                 format: email
 *               amount:
 *                 type: string
 *               memo:
 *                 type: string
 *           examples:
 *             usdcPayment:
 *               summary: Send USDC payment
 *               value:
 *                 fromEmail: "sender@example.com"
 *                 toEmail: "recipient@example.com"
 *                 amount: "25.0"
 *                 memo: "USDC payment for services"
 *     responses:
 *       200:
 *         description: USDC transaction sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transaction:
 *                   type: object
 *                 executionResult:
 *                   type: object
 *                 blockchainInfo:
 *                   type: object
 *       400:
 *         description: Bad request - Missing Grid account data or invalid input
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
router.post('/transactions/send-usdc', validateRequest(sendUsdcTransactionSchema), userController.sendUsdcTransaction);

/**
 * @swagger
 * /api/users/test-transaction:
 *   post:
 *     summary: Test transaction creation (debugging endpoint)
 *     description: |
 *       Debug endpoint to test transaction creation without Grid SDK involvement.
 *       This helps isolate issues between transaction creation and Grid SDK preparation.
 *     tags: [Users, Debug]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromAddress, toAddress, tokenMint, amount]
 *             properties:
 *               fromAddress:
 *                 type: string
 *                 description: Sender wallet address
 *               toAddress:
 *                 type: string
 *                 description: Recipient wallet address
 *               tokenMint:
 *                 type: string
 *                 description: Token mint address
 *               amount:
 *                 type: number
 *                 description: Amount to send
 *           examples:
 *             solTest:
 *               summary: Test SOL transaction creation
 *               value:
 *                 fromAddress: "Gu5V8ZEDXTJk4xv5TLeoW3rHYLfCzwZNyW9DJ1ejienH"
 *                 toAddress: "FzGQeL7BSCroAGPWW9n8xwkTzWmUdk8bt78NiqBPnkzH"
 *                 tokenMint: "So11111111111111111111111111111111111111112"
 *                 amount: 0.1
 *             usdcTest:
 *               summary: Test USDC transaction creation
 *               value:
 *                 fromAddress: "Gu5V8ZEDXTJk4xv5TLeoW3rHYLfCzwZNyW9DJ1ejienH"
 *                 toAddress: "FzGQeL7BSCroAGPWW9n8xwkTzWmUdk8bt78NiqBPnkzH"
 *                 tokenMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
 *                 amount: 10.0
 *     responses:
 *       200:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transaction:
 *                   type: object
 *                 blockchainInfo:
 *                   type: object
 *       400:
 *         description: Bad request - Missing required fields
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
router.post('/test-transaction', userController.testTransactionCreation);

/**
 * @swagger
 * /api/users/debug-transaction:
 *   post:
 *     summary: Debug transaction data (shows exactly what's sent to Grid SDK)
 *     description: |
 *       Debug endpoint that shows exactly what transaction data is being created
 *       and sent to the Grid SDK. This helps understand the transaction structure
 *       and identify any issues with the data format.
 *     tags: [Users, Debug]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromAddress, toAddress, tokenMint, amount]
 *             properties:
 *               fromAddress:
 *                 type: string
 *                 description: Sender wallet address
 *               toAddress:
 *                 type: string
 *                 description: Recipient wallet address
 *               tokenMint:
 *                 type: string
 *                 description: Token mint address
 *               amount:
 *                 type: number
 *                 description: Amount to send
 *           examples:
 *             debugUSDC:
 *               summary: Debug USDC transaction data
 *               value:
 *                 fromAddress: "Gu5V8ZEDXTJk4xv5TLeoW3rHYLfCzwZNyW9DJ1ejienH"
 *                 toAddress: "FzGQeL7BSCroAGPWW9n8xwkTzWmUdk8bt78NiqBPnkzH"
 *                 tokenMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
 *                 amount: 2.0
 *     responses:
 *       200:
 *         description: Transaction debug information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 debug:
 *                   type: object
 *                   properties:
 *                     input:
 *                       type: object
 *                     blockchainService:
 *                       type: object
 *                     transactionData:
 *                       type: object
 *                     validation:
 *                       type: object
 *                     gridSDKPayload:
 *                       type: object
 *                     analysis:
 *                       type: object
 *       400:
 *         description: Bad request - Missing required fields
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
router.post('/debug-transaction', userController.debugTransactionData);

// ===========================================
// SESSION REFRESH ROUTES
// ===========================================

/**
 * @swagger
 * /api/users/refresh-session:
 *   post:
 *     summary: Refresh Privy session for existing user
 *     description: Initiates session refresh for users with expired Privy sessions
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: Session refresh initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Session refresh initiated. Please complete authentication with OTP.
 *                 email:
 *                   type: string
 *                   format: email
 *                   description: User email address
 *                   example: john.doe@example.com
 *                 instructions:
 *                   type: string
 *                   description: Instructions for completing session refresh
 *                   example: Check your email for the OTP code and use it with the complete session refresh endpoint
 *                 sessionExpired:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: User not found or inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: User does not have Grid account
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
router.post('/refresh-session', userController.refreshPrivySession);

/**
 * @swagger
 * /api/users/complete-session-refresh:
 *   post:
 *     summary: Complete session refresh with OTP
 *     description: Completes session refresh using OTP verification
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otpCode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: john.doe@example.com
 *               otpCode:
 *                 type: string
 *                 description: OTP code received via email
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Session refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Session refreshed successfully
 *                 token:
 *                   type: string
 *                   description: New JWT token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 sessionRefreshed:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       410:
 *         description: Pending session expired
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
router.post('/complete-session-refresh', userController.completeSessionRefresh);

/**
 * @swagger
 * /api/users/session-status/{email}:
 *   get:
 *     summary: Check session status for user
 *     description: Checks if user's Privy session is expired and provides refresh guidance
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *         example: user@example.com
 *     responses:
 *       200:
 *         description: Session status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 sessionStatus:
 *                   type: object
 *                   properties:
 *                     isExpired:
 *                       type: boolean
 *                       description: Whether the session has expired
 *                     sessionAgeHours:
 *                       type: number
 *                       description: Age of session in hours
 *                     sessionExpiryHours:
 *                       type: number
 *                       description: Session expiry time in hours
 *                       example: 24
 *                     needsRefresh:
 *                       type: boolean
 *                       description: Whether session needs refresh
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       description: When user was last updated
 *                 guidance:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       description: Human-readable message about session status
 *                     action:
 *                       type: string
 *                       description: Recommended action to take
 *                     expiryInfo:
 *                       type: object
 *                       properties:
 *                         sessionExpiresAfter:
 *                           type: string
 *                           example: 24 hours
 *                         otpExpiresAfter:
 *                           type: string
 *                           example: 15 minutes
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Account inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: User does not have Grid account
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
router.get('/session-status/:email', userController.checkSessionStatus);

// Transfer routes
/**
 * @swagger
 * /api/users/email/{email}/transfers:
 *   get:
 *     summary: Get user transfer history using Grid SDK
 *     description: |
 *       Retrieves the transaction history for a user's Grid account, including incoming and outgoing transfers.
 *       Supports filtering by date range, token type, and pagination.
 *       
 *       **Features:**
 *       - Real-time transfer data from Grid SDK
 *       - Support for pagination (limit/offset)
 *       - Date range filtering (startDate/endDate)
 *       - Token filtering by mint address
 *       - Direction filtering (incoming/outgoing)
 *       
 *       **Transfer Data Includes:**
 *       - Transaction signature
 *       - From/to addresses
 *       - Amount and token information
 *       - Transaction status and timestamps
 *       - Fees and memos
 *     tags: [Users, Transfers, Grid]
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
 *           default: 10
 *         description: Maximum number of transfers to return
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of transfers to skip for pagination
 *         example: 0
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering transfers (ISO 8601 format)
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering transfers (ISO 8601 format)
 *         example: "2024-12-31T23:59:59Z"
 *       - in: query
 *         name: tokenMint
 *         schema:
 *           type: string
 *         description: Filter by specific token mint address
 *         example: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [incoming, outgoing]
 *         description: Filter by transfer direction
 *         example: "incoming"
 *     responses:
 *       200:
 *         description: Transfer history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: User information
 *                 transfers:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Transfer ID or signature
 *                           signature:
 *                             type: string
 *                             description: Transaction signature
 *                           from:
 *                             type: string
 *                             description: Sender address
 *                           to:
 *                             type: string
 *                             description: Recipient address
 *                           amount:
 *                             type: string
 *                             description: Transfer amount
 *                           tokenMint:
 *                             type: string
 *                             description: Token mint address
 *                           tokenSymbol:
 *                             type: string
 *                             description: Token symbol
 *                           direction:
 *                             type: string
 *                             description: Transfer direction
 *                           status:
 *                             type: string
 *                             description: Transaction status
 *                           timestamp:
 *                             type: string
 *                             description: Transaction timestamp
 *                           blockTime:
 *                             type: number
 *                             description: Block time
 *                           fee:
 *                             type: string
 *                             description: Transaction fee
 *                           memo:
 *                             type: string
 *                             description: Transaction memo
 *                           rawTransfer:
 *                             type: object
 *                             description: Raw transfer data from Grid SDK
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalTransfers:
 *                           type: integer
 *                           description: Total number of transfers returned
 *                         options:
 *                           type: object
 *                           description: Query options used
 *                         source:
 *                           type: string
 *                           example: "grid-sdk"
 *                         gridAddress:
 *                           type: string
 *                           description: User's Grid account address
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         limit:
 *                           type: integer
 *                           description: Maximum transfers per page
 *                         offset:
 *                           type: integer
 *                           description: Number of transfers skipped
 *                         hasMore:
 *                           type: boolean
 *                           description: Whether there are more transfers available
 *                 gridResponse:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     data:
 *                       type: array
 *                       description: Raw Grid SDK response data
 *       400:
 *         description: Bad request - User does not have a Grid account
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
router.get('/email/:email/transfers', userController.getUserTransfers);

/**
 * @swagger
 * /api/users/email/{email}/debug-transfers:
 *   get:
 *     summary: Debug user transfer history
 *     description: |
 *       Debug endpoint to check raw Grid transfer API response for troubleshooting transfer issues.
 *       This endpoint provides detailed information about the Grid SDK response structure.
 *     tags: [Users, Debug, Transfers]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *         example: "user@example.com"
 *     responses:
 *       200:
 *         description: Debug information for user transfers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: User information
 *                 debug:
 *                   type: object
 *                   properties:
 *                     gridAddress:
 *                       type: string
 *                       description: User's Grid account address
 *                     source:
 *                       type: string
 *                       example: "grid-sdk"
 *                     gridResponse:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         data:
 *                           type: array
 *                           description: Raw Grid SDK response data
 *                     rawTransferData:
 *                       type: array
 *                       description: Complete raw transfer data from Grid SDK
 *       400:
 *         description: User does not have a Grid account
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
router.get('/email/:email/debug-transfers', userController.debugUserTransfers);

export default router;
