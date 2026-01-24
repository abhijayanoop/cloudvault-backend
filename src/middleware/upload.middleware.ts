import { upload } from '../config/multer';
import type { Request, Response, NextFunction } from 'express';
import { BadRequestError, NotFoundError } from './error.middleware';
import logger from '../config/logger';
import { Workspace } from '../models/workspace.model';
import multer from 'multer';

export const uploadSingleFile = upload.single('file');

export const validateFile = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return next(new BadRequestError('No file uploaded'));
  }

  logger.debug('File uploaded', {
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });

  next();
};

export const checkStorageQuota = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return next(new BadRequestError('No file uploaded'));
    }

    if (!req.user) {
      return next(new BadRequestError('User not authenticated'));
    }

    const workspace = await Workspace.findOne({ ownerId: req.user._id });
    if (!workspace) {
      return next(new NotFoundError('Workspace not found'));
    }

    if (req.file.size + workspace.storageUsed > workspace.storageLimit) {
      return next(
        new BadRequestError(
          `Storage quota exceeded. Used: ${workspace.storageUsedGB} GB / ${(workspace.storageLimit / (1024 * 1024 * 1024)).toFixed(2)} GB.`
        )
      );
    }

    (req as any).workspace = workspace;

    next();
  } catch (error) {
    logger.error('Storage quota exceeded error:', error);
    next(error);
  }
};

export const handleMulterError = (
  err: any,
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new BadRequestError(
          `File too large. Maximum size: ${(err as any).limit / (1024 * 1024)} MB`
        )
      );
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new BadRequestError('Unexpected file field'));
    }
    return next(new BadRequestError(`Upload error: ${err.message}`));
  }

  next(err);
};
