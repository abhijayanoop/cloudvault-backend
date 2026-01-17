import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config/environment';

interface TokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate access token (24h expiry)
 */
export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    config.jwt.secret as Secret,
    {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions
  );
};

/**
 * Generate refresh token (7d expiry)
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    config.jwt.refreshSecret as Secret,
    {
      expiresIn: config.jwt.refreshExpiresIn,
    } as SignOptions
  );
};

/**
 * Verify access token
 */
export const validateAccessToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 */
export const validateRefreshToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokens = (
  userId: string
): { accessToken: string; refreshToken: string } => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  };
};
