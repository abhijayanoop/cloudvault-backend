import multer from 'multer';
import { config } from './environment';
import { BadRequestError } from '../middleware/error.middleware';
import path from 'path';

// Allowed MIME types
const allowedMimeTypes = config.allowedFileTypes;

// Allowed extensions
const allowedExtensions = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
];

// Configure storage (memory storage - files stored in buffer)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new BadRequestError(
        `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`
      )
    );
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(
      new BadRequestError(
        `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`
      )
    );
  }

  cb(null, true);
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize, // 50MB default
    files: 1, // Single file upload
  },
});

// Multiple files upload
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
    files: 10, // Maximum 10 files
  },
});
