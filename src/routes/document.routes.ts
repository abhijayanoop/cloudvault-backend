import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  uploadSingleFile,
  validateFile,
  checkStorageQuota,
  handleMulterError,
} from '../middleware/upload.middleware';
import {
  validateRequest,
  validateQuery,
  validateParams,
} from '../middleware/validator.middleware';
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  getDocumentsQuerySchema,
  documentIdSchema,
} from '../validators/document.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Upload document
router.post(
  '/upload',
  uploadSingleFile,
  handleMulterError,
  validateFile,
  checkStorageQuota,
  validateRequest(uploadDocumentSchema),
  DocumentController.uploadDocument
);

// Get all documents (use validateQuery for GET requests)
router.get(
  '/',
  validateQuery(getDocumentsQuerySchema),
  DocumentController.getDocuments
);

// Get single document (use validateParams for route params)
router.get(
  '/:id',
  validateParams(documentIdSchema),
  DocumentController.getDocument
);

// Update document
router.put(
  '/:id',
  validateParams(documentIdSchema),
  validateRequest(updateDocumentSchema),
  DocumentController.updateDocument
);

// Delete document
router.delete(
  '/:id',
  validateParams(documentIdSchema),
  DocumentController.deleteDocument
);

// Download document
router.get(
  '/:id/download',
  validateParams(documentIdSchema),
  DocumentController.downloadDocument
);

// Upload new version
router.post(
  '/:id/version',
  validateParams(documentIdSchema),
  uploadSingleFile,
  handleMulterError,
  validateFile,
  checkStorageQuota,
  DocumentController.uploadVersion
);

export default router;
