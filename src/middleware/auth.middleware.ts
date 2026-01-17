import type { Request, Response, NextFunction } from 'express';
import { validateAccessToken } from '../utils/jwt.util';
import { ForbiddenError, UnauthorizedError } from './error.middleware';
import { User } from '../models/user.model';
import logger from '../config/logger';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token not found');
    }
    const token = authHeader.substring(7);

    const payload = validateAccessToken(token);
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn('Authentication failed', error);
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!roles.includes(user.role)) {
      logger.warn('Authorization failed', {
        userId: user._id,
        email: user.email,
        requiredRoles: roles,
      });

      return next(
        new ForbiddenError('You do not have permission to access this resource')
      );
    }

    next();
  };
};
