import mongoose from 'mongoose';
import {
  GetDocumentsQuery,
  UpdateDocumentInput,
  UploadDocumentInput,
} from '../validators/document.validator';
import { Workspace } from '../models/workspace.model';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../middleware/error.middleware';
import { s3Service } from './s3.service';
import { DocumentModel, IDocument } from '../models/document.model';
import logger from '../config/logger';
import { PaginatedResponse } from '../types/common.types';
import { SharedAccess } from '../models/sharedAccess.model';

export class DocumentService {
  static async uploadDocument(
    file: Express.Multer.File,
    data: UploadDocumentInput,
    userId: string,
    workspaceId: string
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const workspace = await Workspace.findById(workspaceId).session(session);
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      if (!workspace.hasStorageSpace(file.size)) {
        throw new BadRequestError('Storage quota exceeded');
      }

      const s3Key = await s3Service.generateUniqueKey(
        workspaceId,
        file.originalname
      );

      await s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

      const [document] = await DocumentModel.create(
        [
          {
            filename: s3Key.split('/').pop(),
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            s3Key,
            s3Bucket: s3Service.getBucketName(),
            folderId: data.folderId || null,
            workspaceId,
            ownerId: userId,
            tags: data.tags || [],
            versions: [
              {
                s3Key,
                version: 1,
                size: file.size,
                createdAt: new Date(),
              },
            ],
          },
        ],
        { session }
      );

      await workspace.updateStorageUsed(file.size);

      await session.commitTransaction();

      logger.info('Document uploaded to S3', {
        documentId: document._id,
        filename: file.originalname,
        size: file.size,
      });

      return document;
    } catch (error) {
      session.abortTransaction();
      logger.error('Document upload error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getDocuments(
    workspaceId: string,
    query: GetDocumentsQuery
  ): Promise<PaginatedResponse<IDocument>> {
    const { page, limit, tags, folderId, search } = query;
    const skip = (page - 1) * limit;

    const filter: any = {
      workspaceId,
      isDeleted: false,
    };

    if (folderId) {
      filter.folderId = folderId;
    }

    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    if (search) {
      filter.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const [documents, total] = await Promise.all([
      DocumentModel.find(filter)
        .populate('ownerId', 'name email')
        .populate('folderId', 'name path')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      DocumentModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: documents as IDocument[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  static async getDocumentById(
    documentId: string,
    userId: string
  ): Promise<IDocument> {
    const document = await DocumentModel.findById(documentId)
      .populate('ownerId', 'name email')
      .populate('folderId', 'name path');
    if (!document || document.isDeleted) {
      throw new NotFoundError('Document not found');
    }

    const hasAccess = this.hasDocumentAccess(documentId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('Access to this document is prohibited');
    }

    return document;
  }

  static async updateDocument(
    documentId: string,
    data: UpdateDocumentInput,
    userId: string
  ): Promise<IDocument> {
    const document = await DocumentModel.findById(documentId);
    if (!document || document.isDeleted) {
      throw new NotFoundError('Document not found');
    }

    if (document.ownerId.toString() !== userId) {
      throw new ForbiddenError('User does not have access to this document');
    }

    if (data.originalName) {
      document.originalName = data.originalName;
    }
    if (data.folderId !== undefined) {
      document.folderId = data.folderId
        ? new mongoose.Types.ObjectId(data.folderId)
        : null;
    }
    if (data.tags) {
      document.tags = data.tags;
    }

    await document.save();

    logger.info('Document updated:', { documentId, updates: data });

    return document;
  }

  static async deleteDocument(documentId: string, userId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const document =
        await DocumentModel.findById(documentId).session(session);
      if (!document || document.isDeleted) {
        throw new NotFoundError('Document not found');
      }

      if (document.ownerId.toString() !== userId) {
        throw new ForbiddenError('User does not have access to document');
      }

      const s3KeysToDelete = [
        document.s3Key,
        ...document.versions.map((v) => v.s3Key),
      ];

      await s3Service.deleteMultipleFiles([...new Set(s3KeysToDelete)]);

      await document.softDelete();

      const workspace = await Workspace.findById(document.workspaceId).session(
        session
      );

      if (workspace) {
        const totalSize =
          document.size + document.versions.reduce((sum, v) => sum + v.size, 0);
        await workspace.updateStorageUsed(-totalSize);
      }

      await session.commitTransaction();

      logger.info('Document deleted:', { documentId });
    } catch (error) {
      session.abortTransaction();
      logger.error('Failed to delete document:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async downloadDocument(documentId: string, userId: string) {
    const document = await DocumentModel.findById(documentId);

    if (!document || document.isDeleted) {
      throw new NotFoundError('Document not found');
    }

    // Check access permissions
    const hasAccess = await this.hasDocumentAccess(documentId, userId);

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this document');
    }

    // Generate presigned URL (valid for 1 hour)
    const downloadUrl = await s3Service.getPresignedDownloadUrl(
      document.s3Key,
      3600
    );

    logger.info('Download URL generated:', { documentId, userId });

    return {
      url: downloadUrl,
      expiresIn: 3600,
      filename: document.originalName,
    };
  }

  static async uploadNewVersion(
    documentId: string,
    file: Express.Multer.File,
    userId: string
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const document =
        await DocumentModel.findById(documentId).session(session);
      if (!document || document.isDeleted) {
        throw new NotFoundError('Document not found');
      }

      if (document.ownerId.toString() !== userId) {
        throw new ForbiddenError('User does not have access to this file');
      }

      const workspace = await Workspace.findById(
        document.workspaceId.toString()
      );
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      if (workspace.hasStorageSpace(file.size)) {
        throw new BadRequestError('Storage quota exceeded for this workspace');
      }

      const s3Key = await s3Service.generateUniqueKey(
        document.workspaceId.toString(),
        file.originalname
      );

      await s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

      await document.addVersion(s3Key, file.size);

      await workspace.updateStorageUsed(file.size);

      session.commitTransaction();

      logger.info('New version of document uploaded successfully:', {
        documentId: document._id,
        version: document.versionNumber,
      });

      return document;
    } catch (error) {
      session.abortTransaction();
      logger.error('Failed to upload new version', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  private static async hasDocumentAccess(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    const document = await DocumentModel.findById(documentId);
    if (!document) {
      return false;
    }

    if (document.ownerId.toString() === userId) {
      return true;
    }

    const sharedAccess = await SharedAccess.findOne({
      documentId,
      userId,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    return !!sharedAccess;
  }
}
