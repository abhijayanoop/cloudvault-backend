import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ResponseUtil } from '../utils/response.util';
import logger from '../config/logger';

// Extend Express Request to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: any;
      validatedParams?: any;
    }
  }
}

/**
 * Validate request body against Zod schema
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse request body
      const validatedData = schema.parse(req.body);

      // Replace req.body with validated and sanitized data
      req.body = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod errors
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation error:', { errors, body: req.body });

        return ResponseUtil.error(res, 'Validation failed', 400, errors);
      }

      // Handle unexpected errors
      logger.error('Unexpected validation error:', error);
      return ResponseUtil.error(res, 'Validation error', 400);
    }
  };
};

/**
 * Validate query parameters against Zod schema
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse query parameters
      const validatedData = schema.parse(req.query);

      // Store validated query in a custom property
      req.validatedQuery = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod errors
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Query validation error:', { errors, query: req.query });

        return ResponseUtil.error(res, 'Query validation failed', 400, errors);
      }

      // Handle unexpected errors
      logger.error('Unexpected query validation error:', error);
      return ResponseUtil.error(res, 'Query validation error', 400);
    }
  };
};

/**
 * Validate route parameters against Zod schema
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse route parameters
      const validatedData = schema.parse(req.params);

      // Store validated params in a custom property
      req.validatedParams = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod errors
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Params validation error:', { errors, params: req.params });

        return ResponseUtil.error(
          res,
          'Parameter validation failed',
          400,
          errors
        );
      }

      // Handle unexpected errors
      logger.error('Unexpected params validation error:', error);
      return ResponseUtil.error(res, 'Parameter validation error', 400);
    }
  };
};
