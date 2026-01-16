import mongoose, { Schema, Document, Model } from 'mongoose';

export type PermissionType = 'VIEW' | 'EDIT' | 'DOWNLOAD';

export interface ISharedAccess extends Document {
  documentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  permission: PermissionType;
  expiresAt: Date | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

interface ISharedAccessMethods {
  isExpired(): boolean;
  hasPermission(requiredPermission: PermissionType): boolean;
}

interface ISharedAccessStatics {
  findActiveShares(documentId: string): Promise<ISharedAccess[]>;
  cleanupExpired(): Promise<any>;
  findUserShares(userId: string): Promise<ISharedAccess[]>;
}

type SharedAccessModel = Model<ISharedAccess, {}, ISharedAccessMethods> &
  ISharedAccessStatics;

const SharedAccessSchema = new Schema(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    permission: {
      type: String,
      enum: {
        values: ['VIEW', 'EDIT', 'DOWNLOAD'],
        message: '{VALUE} is not a valid permission',
      },
      required: [true, 'Permission is required'],
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SharedAccessSchema.index({ documentId: 1, userId: 1 }, { unique: true });
SharedAccessSchema.index({ userId: 1 });
SharedAccessSchema.index({ expiresAt: 1 });
SharedAccessSchema.index({ createdAt: -1 });

const permissionLevels: Record<PermissionType, number> = {
  VIEW: 1,
  DOWNLOAD: 2,
  EDIT: 3,
};

// Instance method: Check if access has expired
SharedAccessSchema.methods.isExpired = function (): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Instance method: Check if user has required permission
SharedAccessSchema.methods.hasPermission = function (
  this: ISharedAccess,
  requiredPermission: PermissionType
): boolean {
  return (
    permissionLevels[this.permission] >= permissionLevels[requiredPermission]
  );
};

// Static method: Find active (non-expired) shares for a document
SharedAccessSchema.statics.findActiveShares = function (
  documentId: string
): Promise<ISharedAccess[]> {
  return this.find({
    documentId,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).populate('userId', 'name email');
};

// Static method: Find all shares for a user
SharedAccessSchema.statics.findUserShares = function (
  userId: string
): Promise<ISharedAccess[]> {
  return this.find({
    userId,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .populate('documentId', 'originalName mimeType size')
    .sort({ createdAt: -1 });
};

// Static method: Cleanup expired shares
SharedAccessSchema.statics.cleanupExpired = function () {
  return this.deleteMany({
    expiresAt: { $ne: null, $lt: new Date() },
  });
};

export const SharedAccess = mongoose.model<ISharedAccess, SharedAccessModel>(
  'SharedAccess',
  SharedAccessSchema
);
