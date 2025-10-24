import { Router } from 'express';
import {
  login,
  initiateLogin,
  completeLogin,
  initGridAuth,
  completeGridAuth,
  getCurrentUser,
} from '../controllers/user.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { completeLoginSchema } from '../schemas/auth.schemas';
import { gridLoginSchema } from '../schemas/user.schemas';

const router = Router();

// Public routes
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: |
 *       Authenticate a user with their email address. This endpoint provides simple email-based authentication
 *       for existing users in the system.
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
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             validLogin:
 *               summary: Valid login request
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
 *                 summary: Successful login
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
router.post('/login', login);

/**
 * @swagger
 * /api/auth/login/initiate:
 *   post:
 *     summary: Initiate Grid-based login with OTP
 *     description: |
 *       Start the Grid-based authentication process by sending an OTP code to the user's email.
 *       This endpoint is the first step in the two-step Grid authentication flow.
 *       
 *       **Authentication Flow:**
 *       1. User provides their email address
 *       2. System validates the user exists and is active
 *       3. Grid system sends OTP code to user's email
 *       4. Returns success message with instructions
 *       
 *       **Security Features:**
 *       - Email validation
 *       - Active user verification
 *       - OTP code sent via email
 *       - Direct authentication flow
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             validInitiation:
 *               summary: Valid login initiation
 *               value:
 *                 email: "john.doe@example.com"
 *     responses:
 *       201:
 *         description: Login initiation successful, OTP sent to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: ['message', 'email', 'instructions']
 *               properties:
 *                 message:
 *                   type: 'string'
 *                   description: 'Success message'
 *                   example: 'Grid authentication initiated successfully'
 *                 email:
 *                   type: 'string'
 *                   format: 'email'
 *                   description: 'User email address'
 *                   example: 'john.doe@example.com'
 *                 instructions:
 *                   type: 'string'
 *                   description: 'Instructions for completing authentication'
 *                   example: 'Check your email for the OTP code and use it with the complete login endpoint'
 *             examples:
 *               success:
 *                 summary: Successful initiation
 *                 value:
 *                   message: "Grid authentication initiated successfully"
 *                   email: "john.doe@example.com"
 *                   instructions: "Check your email for the OTP code and use it with the complete login endpoint"
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
router.post('/login/initiate', validateRequest(gridLoginSchema), initiateLogin);

/**
 * @swagger
 * /api/auth/grid/init:
 *   post:
 *     summary: Initialize Grid SDK authentication
 *     description: |
 *       Initialize Grid SDK-based authentication using the initAuth method. This is the new
 *       Grid SDK authentication system that provides enhanced security and features.
 *       
 *       **Authentication Flow:**
 *       1. User provides their email address
 *       2. System validates the user exists and is active
 *       3. Grid SDK initAuth method is called
 *       4. Returns success message with instructions
 *       
 *       **Security Features:**
 *       - Email validation
 *       - Active user verification
 *       - Grid SDK initAuth integration
 *       - Direct authentication flow
 *       - Enhanced security through Grid SDK
 *     tags: [Authentication, Grid SDK]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             validInit:
 *               summary: Valid Grid SDK initialization
 *               value:
 *                 email: "john.doe@example.com"
 *     responses:
 *       201:
 *         description: Grid SDK authentication initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: ['message', 'email', 'instructions']
 *               properties:
 *                 message:
 *                   type: 'string'
 *                   description: 'Success message'
 *                   example: 'Grid authentication initiated successfully'
 *                 email:
 *                   type: 'string'
 *                   format: 'email'
 *                   description: 'User email address'
 *                   example: 'john.doe@example.com'
 *                 instructions:
 *                   type: 'string'
 *                   description: 'Instructions for completing authentication'
 *                   example: 'Check your email for the OTP code and use it with the complete authentication endpoint'
 *             examples:
 *               success:
 *                 summary: Successful Grid SDK initialization
 *                 value:
 *                   message: "Grid authentication initiated successfully"
 *                   email: "john.doe@example.com"
 *                   instructions: "Check your email for the OTP code and use it with the complete authentication endpoint"
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
router.post('/grid/init', validateRequest(gridLoginSchema), initGridAuth);

/**
 * @swagger
 * /api/auth/grid/complete:
 *   post:
 *     summary: Complete Grid SDK authentication
 *     description: |
 *       Complete the Grid SDK-based authentication process using OTP verification. This endpoint
 *       completes the authentication flow initiated by the Grid SDK initAuth method.
 *       
 *       **Authentication Flow:**
 *       1. User provides pending key and OTP code
 *       2. System validates the pending session
 *       3. Grid SDK completeAuth method is called
 *       4. Returns JWT token for authenticated requests
 *       
 *       **Security Features:**
 *       - OTP code validation (6 digits)
 *       - Pending session validation
 *       - Grid SDK completeAuth integration
 *       - Secure session cleanup
 *       - JWT token generation
 *     tags: [Authentication, Grid SDK]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteLoginRequest'
 *           examples:
 *             validCompletion:
 *               summary: Valid Grid SDK completion
 *               value:
 *                 email: "john.doe@example.com"
 *                 otpCode: "123456"
 *     responses:
 *       200:
 *         description: Grid SDK authentication completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: ['message', 'token', 'user', 'authData']
 *               properties:
 *                 message:
 *                   type: 'string'
 *                   description: 'Success message'
 *                   example: 'Grid authentication successful'
 *                 token:
 *                   type: 'string'
 *                   description: 'JWT authentication token'
 *                   example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *                 user:
 *                   $ref: '#/components/schemas/LoginResponse/properties/user'
 *                 authData:
 *                   type: 'object'
 *                   description: 'Grid SDK authentication data'
 *                   properties:
 *                     success:
 *                       type: 'boolean'
 *                       example: true
 *                     data:
 *                       type: 'object'
 *                       description: 'Grid SDK response data'
 *             examples:
 *               success:
 *                 summary: Successful Grid SDK completion
 *                 value:
 *                   message: "Grid authentication successful"
 *                   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   user:
 *                     id: "123e4567-e89b-12d3-a456-426614174000"
 *                     email: "john.doe@example.com"
 *                     firstName: "John"
 *                     lastName: "Doe"
 *                     walletAddress: "GC52tLZUiuz8UDSi7BUWn62473Cje3sGKTjxjRZ7oeEz"
 *                     gridAddress: "YmeQtLhGS2GhLcBiGug6Pv1dTv75vUKFCSwdb2nffzV"
 *                     gridStatus: "success"
 *                   authData:
 *                     success: true
 *                     data: {}
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidOtp:
 *                 summary: Invalid OTP code
 *                 value:
 *                   error: "Authentication failed"
 *                   details: "Invalid verification code"
 *       410:
 *         description: Gone - Pending session expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               expiredSession:
 *                 summary: Expired session
 *                 value:
 *                   error: "Pending session not found or expired"
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
router.post('/grid/complete', validateRequest(completeLoginSchema), completeGridAuth);

/**
 * @swagger
 * /api/auth/login/complete:
 *   post:
 *     summary: Complete Grid-based login
 *     description: |
 *       Complete the Grid-based authentication process using OTP verification. This endpoint is used
 *       for users who need to authenticate through the Grid system with OTP codes.
 *       
 *       **Authentication Flow:**
 *       1. User initiates login through Grid system
 *       2. User receives OTP code via email
 *       3. User provides pending key and OTP code
 *       4. System validates OTP and returns JWT token
 *       
 *       **Security Features:**
 *       - OTP code validation (6 digits)
 *       - Pending session validation
 *       - Secure session cleanup
 *       - JWT token generation
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteLoginRequest'
 *           examples:
 *             validCompletion:
 *               summary: Valid completion request
 *               value:
 *                 email: "john.doe@example.com"
 *                 otpCode: "123456"
 *     responses:
 *       200:
 *         description: Login completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             examples:
 *               success:
 *                 summary: Successful completion
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
 *               invalidOtp:
 *                 summary: Invalid OTP code
 *                 value:
 *                   error: "Authentication failed"
 *                   details: "Invalid verification code"
 *       410:
 *         description: Gone - Pending session expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               expiredSession:
 *                 summary: Expired session
 *                 value:
 *                   error: "Pending session not found or expired"
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
router.post(
  '/login/complete',
  validateRequest(completeLoginSchema),
  completeLogin
);

// Protected routes
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: |
 *       Retrieve the current authenticated user's information. This endpoint requires
 *       a valid JWT token in the Authorization header.
 *       
 *       **Authentication Required:**
 *       - Valid JWT token in Authorization header
 *       - Active user account
 *       
 *       **Security Features:**
 *       - JWT token validation
 *       - User existence verification
 *       - Active user check
 *     tags: [Authentication, Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *             examples:
 *               success:
 *                 summary: Successful user retrieval
 *                 value:
 *                   user:
 *                     id: "123e4567-e89b-12d3-a456-426614174000"
 *                     email: "john.doe@example.com"
 *                     firstName: "John"
 *                     lastName: "Doe"
 *                     middleName: "Michael"
 *                     phoneNumber: "+1234567890"
 *                     walletAddress: "GC52tLZUiuz8UDSi7BUWn62473Cje3sGKTjxjRZ7oeEz"
 *                     role: "USER"
 *                     isActive: true
 *                     gridAddress: "YmeQtLhGS2GhLcBiGug6Pv1dTv75vUKFCSwdb2nffzV"
 *                     gridStatus: "success"
 *                     gridPolicies:
 *                       signers: []
 *                       threshold: 1
 *                       time_lock: null
 *                       admin_address: null
 *                     createdAt: "2023-01-01T00:00:00.000Z"
 *                     updatedAt: "2023-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noToken:
 *                 summary: No token provided
 *                 value:
 *                   error: "No token provided"
 *               invalidToken:
 *                 summary: Invalid token
 *                 value:
 *                   error: "Invalid token"
 *               inactiveUser:
 *                 summary: Inactive user
 *                 value:
 *                   error: "User not found or inactive"
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
router.get('/me', authMiddleware, getCurrentUser);

export default router;
