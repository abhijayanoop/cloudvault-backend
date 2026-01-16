import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDocumentVersion {
  s3Key: string;
  version: number;
  size: number;
  createdAt: Date;
}

export interface IDocument extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  s3Bucket: string;
  folderId: mongoose.Types.ObjectId | null;
  workspaceId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  tags: string[];
  versionNumber: number;
  versions: IDocumentVersion[];
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  sizeMB: string;
  sizeKB: string;
  fileExtension: string;
}

interface IDocumentMethods {
  addVersion(s3Key: string, size: number): Promise<IDocument>;
  softDelete(): Promise<IDocument>;
  restore(): Promise<IDocument>;
}

interface IDocumentStatics {
  findByWorkspace(workspaceId: string): Promise<IDocument[]>;
  findByFolder(folderId: string): Promise<IDocument[]>;
  searchDocuments(query: string, workspaceId: string): Promise<IDocument[]>;
}

type DocumentModel = Model<IDocument, {}, IDocumentMethods> & IDocumentStatics;

const DocumentSchema = new Schema<IDocument, DocumentModel, IDocumentMethods>(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative'],
    },
    s3Key: {
      type: String,
      required: [true, 'S3 key is required'],
      unique: true,
    },
    s3Bucket: {
      type: String,
      required: [true, 'S3 bucket is required'],
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace is required'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    tags: {
      type: [String],
      default: [],
    },
    versionNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    versions: [
      {
        s3Key: {
          type: String,
          required: true,
        },
        version: {
          type: Number,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
DocumentSchema.index({ workspaceId: 1, folderId: 1 });
DocumentSchema.index({ ownerId: 1 });
DocumentSchema.index({ s3Key: 1 }, { unique: true });
DocumentSchema.index({ isDeleted: 1 });
DocumentSchema.index({ createdAt: -1 });
DocumentSchema.index({ originalName: 'text', tags: 'text' });

// Virtual: Size in MB
DocumentSchema.virtual('sizeMB').get(function () {
  return (this.size / (1024 * 1024)).toFixed(2);
});

// Virtual: Size in KB
DocumentSchema.virtual('sizeKB').get(function () {
  return (this.size / 1024).toFixed(2);
});

// Virtual: File extension
DocumentSchema.virtual('fileExtension').get(function () {
  const parts = this.originalName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
});

// Instance method: Add new version
DocumentSchema.methods.addVersion = async function (
  s3Key: string,
  size: number
): Promise<IDocument> {
  this.versionNumber += 1;
  this.versions.push({
    s3Key,
    version: this.versionNumber,
    size,
    createdAt: new Date(),
  });
  this.s3Key = s3Key;
  this.size = size;
  return await this.save();
};

// Instance method: Soft delete
DocumentSchema.methods.softDelete = async function (): Promise<IDocument> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

// Instance method: Restore deleted document
DocumentSchema.methods.restore = async function (): Promise<IDocument> {
  this.isDeleted = false;
  this.deletedAt = null;
  return await this.save();
};

// Static method: Find documents by workspace
DocumentSchema.statics.findByWorkspace = function (
  workspaceId: string
): Promise<IDocument[]> {
  return this.find({ workspaceId, isDeleted: false }).sort({ createdAt: -1 });
};

// Static method: Find documents by folder
DocumentSchema.statics.findByFolder = function (
  folderId: string
): Promise<IDocument[]> {
  return this.find({ folderId, isDeleted: false }).sort({ originalName: 1 });
};

// Static method: Search documents
DocumentSchema.statics.searchDocuments = function (
  query: string,
  workspaceId: string
): Promise<IDocument[]> {
  return this.find({
    workspaceId,
    isDeleted: false,
    $text: { $search: query },
  }).sort({ score: { $meta: 'textScore' } });
};

export const DocumentModel = mongoose.model<IDocument, DocumentModel>(
  'Document',
  DocumentSchema
);
