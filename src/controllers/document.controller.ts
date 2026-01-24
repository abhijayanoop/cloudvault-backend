import { asyncHandler } from '../utils/asyncHandler';
import type { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response.util';
import { DocumentService } from '../services/document.service';

export class DocumentController {
  static uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return ResponseUtil.error(res, 'No file found', 400);
    }

    const document = await DocumentService.uploadDocument(
      req.file,
      req.body,
      req.user!._id.toString(),
      req.user!.workspaceId.toString()
    );

    return ResponseUtil.success(
      res,
      document,
      'Document uploaded successfully',
      201
    );
  });

  static getDocuments = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;

    const result = await DocumentService.getDocuments(
      req.user!.workspaceId.toString(),
      query
    );

    return res.status(200).json(result);
  });

  static getDocument = asyncHandler(async (req: Request, res: Response) => {
    const document = await DocumentService.getDocumentById(
      req.params.id as string,
      req.user!._id.toString()
    );

    return ResponseUtil.success(
      res,
      document,
      'Document retrieved successfully'
    );
  });

  static updateDocument = asyncHandler(async (req: Request, res: Response) => {
    const document = await DocumentService.updateDocument(
      req.params.id as string,
      req.body,
      req.user!._id.toString()
    );

    return ResponseUtil.success(res, document, 'Document updated successfully');
  });

  static deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    await DocumentService.deleteDocument(
      req.params.id as string,
      req.user!._id.toString()
    );

    return ResponseUtil.success(res, null, 'Document deleted successfully');
  });

  static downloadDocument = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await DocumentService.downloadDocument(
        req.params.id as string,
        req.user!._id.toString()
      );

      return ResponseUtil.success(res, result, 'Download URL generated');
    }
  );

  static uploadVersion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return ResponseUtil.error(res, 'No file uploaded', 400);
    }

    const document = await DocumentService.uploadNewVersion(
      req.params.id as string,
      req.file,
      req.user!._id.toString()
    );

    return ResponseUtil.success(
      res,
      document,
      'New version uploaded successfully'
    );
  });
}
