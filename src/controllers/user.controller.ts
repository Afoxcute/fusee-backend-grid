import { Request, Response } from 'express';

export const getUsers = (req: Request, res: Response) => {
  res.json({ users: [] });
};

export const createUser = (req: Request, res: Response) => {
  // Add validation with Joi here
  res.status(201).json({ user: req.body });
};
