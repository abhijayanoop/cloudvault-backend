import z, { ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { ResponseUtil } from '../utils/response.util';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validateData = schema.parse(req.body);
      req.body = validateData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation error:', { errors, body: req.body });

        ResponseUtil.error(res, 'Validation failed', 400, errors);
        return;
      }

      logger.error('Unexpected validation error:', error);
      ResponseUtil.error(res, 'Validation error', 400);
    }
  };
};
