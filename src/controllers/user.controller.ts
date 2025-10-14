import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import Logger from '../utils/logger';
import gridClient from '../lib/squad';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  savePending,
  getPending,
  removePending,
  PENDING_TTL_MS,
} from '../lib/gridSessions';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    Logger.info(`Retrieved ${users.length} users`);
    res.json({ users });
  } catch (error) {
    Logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    // Basic validation
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: 'User with this email already exists' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    Logger.info(`Created user: ${user.email}`);
    res.status(201).json({ user });
  } catch (error) {
    Logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    Logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    Logger.info(`Updated user: ${user.email}`);
    res.json({ user });
  } catch (error) {
    Logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({
      where: { id },
    });

    Logger.info(`Deleted user: ${existingUser.email}`);
    res.status(204).send();
  } catch (error) {
    Logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const initiateGridAccount = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().max(100).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues[0].message });
    const { name, email } = parsed.data;

    const response = await gridClient.createAccount({ email });
    const user = response.data;

    const sessionSecrets = await gridClient.generateSessionSecrets();

    const pendingKey = uuidv4();
    const createdAt = Date.now();
    await savePending(pendingKey, { user, sessionSecrets, createdAt });

    const expiresAt = new Date(createdAt + PENDING_TTL_MS).toISOString();
    const maskedKey = `${pendingKey.slice(0, 8)}...${pendingKey.slice(-4)}`;

    Logger.info(
      `Initiated Grid account for ${email}, pendingKey=${pendingKey}`
    );
    // Frontend-friendly payload: opaque key, masked preview, and expiry info
    res.status(201).json({ pendingKey, maskedKey, expiresAt });
  } catch (error) {
    Logger.error('Error initiating Grid account:', error);
    res.status(500).json({ error: 'Failed to initiate Grid account' });
  }
};

export const completeGridAccount = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      pendingKey: z.string().uuid(),
      otpCode: z.string().regex(/^[0-9]{6}$/),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues[0].message });
    const { pendingKey, otpCode } = parsed.data;

    const pending = await getPending(pendingKey);
    if (!pending)
      return res
        .status(410)
        .json({ error: 'Pending session not found or expired' });

    const authResult = await gridClient.completeAuthAndCreateAccount({
      user: pending.user,
      otpCode,
      sessionSecrets: pending.sessionSecrets,
    });

    if (authResult?.success) {
      await removePending(pendingKey);
      Logger.info(`Grid account created: ${authResult.data?.address}`);
      return res.status(201).json({ data: authResult.data });
    }

    Logger.error('Grid auth failed:', authResult);
    res
      .status(400)
      .json({ error: 'Grid authentication failed', details: authResult });
  } catch (error) {
    Logger.error('Error completing Grid account:', error);
    res.status(500).json({ error: 'Failed to complete Grid account' });
  }
};
