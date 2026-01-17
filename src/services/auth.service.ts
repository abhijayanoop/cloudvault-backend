import mongoose from 'mongoose';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../middleware/error.middleware';
import { User } from '../models/user.model';
import { Workspace } from '../models/workspace.model';
import {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from '../validators/auth.validator';
import logger from '../config/logger';
import { generateTokens, validateRefreshToken } from '../utils/jwt.util';
import { comparePassword } from '../utils/password.util';

export class AuthService {
  static async registerUser(data: RegisterInput) {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new BadRequestError('User with this email already exists');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const workspaceName = data.workspaceName || `${data.name}'s workspace`;
      const [workspace] = await Workspace.create(
        [
          {
            name: workspaceName,
            ownerId: new mongoose.Types.ObjectId(),
          },
        ],
        { session }
      );

      const [user] = await User.create(
        [
          {
            name: data.name,
            email: data.email,
            password: data.password,
            workspaceId: workspace._id,
            role: 'ADMIN',
          },
        ],
        { session }
      );

      workspace.ownerId = user._id;
      workspace.members = [user._id];
      await workspace.save({ session });

      await session.commitTransaction();

      logger.info('User registered successfully', {
        user: user._id,
        email: user.email,
        workspace: workspace._id,
      });

      const userObject = await user.toObject();
      //   delete userObject.password;

      const tokens = generateTokens(user._id.toString());

      return {
        user: userObject,
        workspace: workspace.toObject(),
        tokens,
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error('User registration failed', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async loginUser(data: LoginInput) {
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordsMatch = await user.comparePassword(data.password);
    if (!passwordsMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    logger.info('User logged in successfully', {
      user: user._id,
      email: user.email,
    });

    const tokens = generateTokens(user._id.toString());

    const userObject = user.toObject();

    return {
      user: userObject,
      tokens,
    };
  }

  static async refreshAccessToken(refreshToken: string) {
    const payload = validateRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info('Tokens refreshed');

    const tokens = generateTokens(user._id.toString());

    return tokens;
  }

  static async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await comparePassword(
      data.currentPassword,
      user.password
    );
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    logger.info(`Password changed for user ${user._id}`);

    user.password = data.newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  static async getProfile(userId: string) {
    const user = await User.findById(userId).populate(
      'workspaceId',
      'name storageUsed storageLimit'
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}
