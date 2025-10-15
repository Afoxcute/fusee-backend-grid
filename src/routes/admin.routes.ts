// src/routes/admin.routes.ts
import { Router } from 'express';
import {
  getAdminById,
  getAdminByEmail,
  updateAdmin,
  deleteAdmin,
  getAdminsByPermissions,
  createCustomSignerAdmin,
  voteOnTransaction,
  executeTransaction,
  performAdminCleanup,
  getAdminCleanupStatus,
} from '../controllers/admin.controller';
import { validateRequest } from '../middleware/validation.middleware';
import {
  updateAdminSchema,
  createCustomSignerAdminSchema,
} from '../schemas/admin.schemas';

const router = Router();

/**
 * @swagger
 * /api/admin/admins/{id}:
 *   get:
 *     summary: Get admin by ID
 *     description: Retrieve a specific admin by their ID.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID
 *     responses:
 *       200:
 *         description: Admin retrieved successfully.
 *       404:
 *         description: Admin not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/admins/:id', getAdminById);

/**
 * @swagger
 * /api/admin/admins/by-email/{email}:
 *   get:
 *     summary: Get admin by email
 *     description: Retrieve a specific admin by their email address.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Admin email address
 *         example: "admin@example.com"
 *     responses:
 *       200:
 *         description: Admin retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "clx1234567890"
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "admin@example.com"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     walletAddress:
 *                       type: string
 *                       example: "3K9Z3UX2wWZ1tEGUU9aNVgXD4uTxHwAUgJfKJUiX5AsP"
 *                       nullable: true
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [CAN_INITIATE, CAN_VOTE, CAN_EXECUTE, CAN_MANAGE_USERS, CAN_MANAGE_ADMINS]
 *                       example: ["CAN_INITIATE", "CAN_VOTE", "CAN_EXECUTE"]
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     lastActivityAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00.000Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00.000Z"
 *       404:
 *         description: Admin not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/admins/by-email/:email', getAdminByEmail);

/**
 * @swagger
 * /api/admin/admins/{id}:
 *   put:
 *     summary: Update admin
 *     description: Update an existing admin's information and permissions.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [CAN_INITIATE, CAN_VOTE, CAN_EXECUTE, CAN_MANAGE_USERS, CAN_MANAGE_ADMINS]
 *                 example: ["CAN_INITIATE", "CAN_VOTE", "CAN_EXECUTE"]
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Admin updated successfully.
 *       404:
 *         description: Admin not found.
 *       409:
 *         description: Admin update failed due to conflicts.
 *       500:
 *         description: Internal server error.
 */
router.put('/admins/:id', validateRequest(updateAdminSchema), updateAdmin);

/**
 * @swagger
 * /api/admin/admins/{id}:
 *   delete:
 *     summary: Delete admin
 *     description: Delete an admin from the system.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID
 *     responses:
 *       204:
 *         description: Admin deleted successfully.
 *       404:
 *         description: Admin not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/admins/:id', deleteAdmin);

/**
 * @swagger
 * /api/admin/admins/by-permissions:
 *   get:
 *     summary: Get admins by permissions
 *     description: Retrieve admins that have specific permissions.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: permissions
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of permissions (CAN_INITIATE,CAN_VOTE,CAN_EXECUTE)
 *         example: "CAN_INITIATE,CAN_VOTE,CAN_EXECUTE"
 *     responses:
 *       200:
 *         description: Admins with specified permissions retrieved successfully.
 *       400:
 *         description: Invalid permissions parameter.
 *       500:
 *         description: Internal server error.
 */
router.get('/admins/by-permissions', getAdminsByPermissions);

/**
 * @swagger
 * /api/admin/custom-signer:
 *   post:
 *     summary: Create admin with custom signer (keypair)
 *     description: Create an admin using custom ed25519 keypair with Grid account integration.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *                 example: "admin@example.com"
 *               firstName:
 *                 type: string
 *                 description: Admin first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Admin last name
 *                 example: "Doe"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [CAN_INITIATE, CAN_VOTE, CAN_EXECUTE, CAN_MANAGE_USERS, CAN_MANAGE_ADMINS]
 *                 description: Admin permissions
 *                 example: ["CAN_INITIATE", "CAN_VOTE", "CAN_EXECUTE"]
 *               secretKey:
 *                 type: string
 *                 description: Optional existing secret key (base64 encoded)
 *                 example: "base64EncodedSecretKey"
 *     responses:
 *       201:
 *         description: Custom signer admin created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Custom signer admin created successfully"
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "clx1234567890"
 *                     email:
 *                       type: string
 *                       example: "admin@example.com"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     walletAddress:
 *                       type: string
 *                       example: "3K9Z3UX2wWZ1tEGUU9aNVgXD4uTxHwAUgJfKJUiX5AsP"
 *                     publicKey:
 *                       type: string
 *                       example: "ABC123..."
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["CAN_INITIATE", "CAN_VOTE", "CAN_EXECUTE"]
 *                     secretKey:
 *                       type: string
 *                       example: "base64EncodedSecretKey"
 *                 gridAccount:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: "3K9Z3UX2wWZ1tEGUU9aNVgXD4uTxHwAUgJfKJUiX5AsP"
 *                     publicKey:
 *                       type: string
 *                       example: "ABC123..."
 *       400:
 *         description: Invalid secret key format.
 *       409:
 *         description: Admin with this email already exists.
 *       500:
 *         description: Internal server error.
 */
router.post('/custom-signer', validateRequest(createCustomSignerAdminSchema), createCustomSignerAdmin);

/**
 * @swagger
 * /api/admin/transactions/{transactionId}/vote:
 *   post:
 *     summary: Vote on a transaction
 *     description: Allow an admin to vote (approve/reject) on a pending transaction.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *         example: "clx1234567890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminId
 *               - vote
 *             properties:
 *               adminId:
 *                 type: string
 *                 description: Admin ID
 *                 example: "clx1234567890"
 *               vote:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: Vote decision
 *                 example: "approve"
 *     responses:
 *       200:
 *         description: Vote recorded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vote approve recorded successfully"
 *                 transactionId:
 *                   type: string
 *                   example: "clx1234567890"
 *                 adminEmail:
 *                   type: string
 *                   example: "admin@example.com"
 *                 vote:
 *                   type: string
 *                   example: "approve"
 *       400:
 *         description: Transaction is not in PENDING status.
 *       403:
 *         description: Admin does not have CAN_VOTE permission or is not authorized.
 *       404:
 *         description: Admin or transaction not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/transactions/:transactionId/vote', voteOnTransaction);

/**
 * @swagger
 * /api/admin/transactions/{transactionId}/execute:
 *   post:
 *     summary: Execute a transaction
 *     description: Allow an admin to execute an approved transaction.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *         example: "clx1234567890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminId
 *             properties:
 *               adminId:
 *                 type: string
 *                 description: Admin ID
 *                 example: "clx1234567890"
 *     responses:
 *       200:
 *         description: Transaction executed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Transaction executed successfully"
 *                 transactionId:
 *                   type: string
 *                   example: "clx1234567890"
 *                 adminEmail:
 *                   type: string
 *                   example: "admin@example.com"
 *                 status:
 *                   type: string
 *                   example: "EXECUTED"
 *       400:
 *         description: Transaction is not in APPROVED status.
 *       403:
 *         description: Admin does not have CAN_EXECUTE permission or is not authorized.
 *       404:
 *         description: Admin or transaction not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/transactions/:transactionId/execute', executeTransaction);

/**
 * @swagger
 * /api/admin/cleanup:
 *   post:
 *     summary: Perform admin cleanup
 *     description: Manually trigger cleanup of inactive admins.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Admin cleanup completed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Admin cleanup completed"
 *                 result:
 *                   type: object
 *                   properties:
 *                     removedAdmins:
 *                       type: number
 *                       example: 2
 *                     updatedAccounts:
 *                       type: number
 *                       example: 5
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *       500:
 *         description: Internal server error.
 */
router.post('/cleanup', performAdminCleanup);

/**
 * @swagger
 * /api/admin/cleanup/status:
 *   get:
 *     summary: Get admin cleanup status
 *     description: Get information about inactive admins and cleanup configuration.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Admin cleanup status retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cleanupEnabled:
 *                   type: boolean
 *                   example: true
 *                 inactiveAdminsCount:
 *                   type: number
 *                   example: 3
 *                 timeoutHours:
 *                   type: number
 *                   example: 48
 *                 cleanupIntervalMinutes:
 *                   type: number
 *                   example: 60
 *       500:
 *         description: Internal server error.
 */
router.get('/cleanup/status', getAdminCleanupStatus);


export default router;