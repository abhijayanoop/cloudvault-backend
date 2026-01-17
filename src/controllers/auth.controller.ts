import logger from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';
import type { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response.util';
import { ajEmailValidation } from '../config/arcjet';
import { AuthService } from '../services/auth.service';
import { UnauthorizedError } from '../middleware/error.middleware';

export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    const email = req.body.email;
    const emailDecision = await ajEmailValidation.protect(req, { email });

    if (emailDecision.isDenied()) {
      logger.warn('Email validation failed:', {
        email: req.body.email,
        reason: emailDecision.reason,
      });

      let errorMessage = 'Invalid or disposable email address';

      // Check specific email validation errors
      if (emailDecision.reason.isEmail()) {
        const emailReason = emailDecision.reason;

        if (emailReason.emailTypes.includes('DISPOSABLE')) {
          errorMessage = 'Disposable email addresses are not allowed';
        } else if (emailReason.emailTypes.includes('INVALID')) {
          errorMessage = 'Invalid email address format';
        } else if (emailReason.emailTypes.includes('NO_MX_RECORDS')) {
          errorMessage = 'Email domain has no valid MX records';
        }
      }

      ResponseUtil.error(res, errorMessage, 400);
      return;
    }

    const result = await AuthService.registerUser(req.body);

    ResponseUtil.created(res, result, 'User registered successfully');
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    console.log('login req body', req.body);
    const result = await AuthService.loginUser(req.body);

    ResponseUtil.success(res, result, 'Login successful');
  });

  static refreshAccessToken = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await AuthService.refreshAccessToken(req.body.token);

      ResponseUtil.success(res, result, 'Access token refreshed successfully');
    }
  );

  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { currentPassword, newPassword } = req.body;

    const result = await AuthService.changePassword(req.user._id.toString(), {
      currentPassword,
      newPassword,
    });

    ResponseUtil.success(res, result);
  });

  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    const result = await AuthService.getProfile(req.user._id.toString());

    ResponseUtil.success(res, result, 'User profile retrieved successfully');
  });
}
