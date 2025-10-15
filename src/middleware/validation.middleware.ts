// src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import Logger from '../utils/logger';

// Extend Express Request interface to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedParams?: any;
      validatedQuery?: any;
    }
  }
}

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        
        Logger.warn(`Validation failed for ${req.method} ${req.path}:`, errors);
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      
      // Replace req.body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      Logger.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        
        Logger.warn(`Parameter validation failed for ${req.method} ${req.path}:`, errors);
        
        return res.status(400).json({
          error: 'Invalid parameters',
          details: errors,
        });
      }
      
      // Store validated params in a custom property since req.params is read-only
      req.validatedParams = result.data;
      next();
    } catch (error) {
      Logger.error('Parameter validation middleware error:', error);
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        
        Logger.warn(`Query validation failed for ${req.method} ${req.path}:`, errors);
        
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: errors,
        });
      }
      
      // Store validated query in a custom property since req.query is read-only
      req.validatedQuery = result.data;
      next();
    } catch (error) {
      Logger.error('Query validation middleware error:', error);
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
};

