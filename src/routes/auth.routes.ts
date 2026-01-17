import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validator.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../validators/auth.validator';
import { authenticate } from '../middleware/auth.middleware';
import { arcjetMiddleware } from '../middleware/arcjet.middleware';

const router = Router();

// Public routes with rate limiting
router.post(
  '/register',
  arcjetMiddleware('register'),
  validateRequest(registerSchema),
  AuthController.register
);

router.post(
  '/login',
  // arcjetMiddleware('login'),
  validateRequest(loginSchema),
  AuthController.login
);

router.post(
  '/refresh',
  arcjetMiddleware('refresh'),
  validateRequest(refreshTokenSchema),
  AuthController.refreshAccessToken
);

router.get('/profile', authenticate, AuthController.getProfile);

router.put(
  '/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  AuthController.changePassword
);

export default router;
