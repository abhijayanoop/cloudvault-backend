import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  ownerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  storageUsed: number;
  storageLimit: number;
  createdAt: Date;
  updatedAt: Date;
  // virtuals
  storageUsedMB: string;
  storageUsedGB: string;
  storagePercentage: number;
}

interface IWorkspaceMethods {
  hasStorageSpace(fileSize: number): boolean;
  updateStorageUsed(delta: number): Promise<IWorkspace>;
  addMember(userId: mongoose.Types.ObjectId): Promise<IWorkspace>;
  removeMember(userId: mongoose.Types.ObjectId): Promise<IWorkspace>;
}

type WorkspaceModel = Model<IWorkspace, {}, IWorkspaceMethods>;

export const WorkspaceSchema = new Schema<
  IWorkspace,
  WorkspaceModel,
  IWorkspaceMethods
>(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: [2, 'Workspace name must be at least 2 characters'],
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    storageUsed: {
      type: Number,
      default: 0,
      min: [0, 'Storage used cannot be negative'],
    },
    storageLimit: {
      type: Number,
      default: 5368709120,
      min: [0, 'Storage limit cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

WorkspaceSchema.index({ ownerId: 1 });
WorkspaceSchema.index({ members: 1 });
WorkspaceSchema.index({ createdAt: -1 });

// Virtual: Storage used in GB
WorkspaceSchema.virtual('storageUsedMB').get(function () {
  return (this.storageUsed / (1024 * 1024)).toFixed(2);
});

// Virtual: Storage used in GB
WorkspaceSchema.virtual('storageUsedGB').get(function () {
  return (this.storageUsed / (1024 * 1024 * 1024)).toFixed(2);
});

// Virtual: Storage percentage
WorkspaceSchema.virtual('storagePercentage').get(function () {
  if (this.storageLimit === 0) return 0;
  return Math.round((this.storageUsed / this.storageLimit) * 100);
});

// methods
WorkspaceSchema.methods.hasStorageSpace = function (fileSize: number): boolean {
  return this.storageUsed + fileSize <= this.storageLimit;
};

WorkspaceSchema.methods.updateStorageUsed = async function (
  delta: number
): Promise<IWorkspace> {
  this.storageUsed += delta;
  if (this.storageUsed < 0) {
    this.storageUsed = 0;
  }

  return await this.save();
};

WorkspaceSchema.methods.addMember = async function (
  userId: mongoose.Types.ObjectId
): Promise<IWorkspace> {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    return await this.save();
  }
  return this;
};

WorkspaceSchema.methods.removeMember = async function (
  userId: mongoose.Types.ObjectId
): Promise<IWorkspace> {
  this.members = this.members.filter(
    (member) => member.toString() !== userId.toString()
  );
  return await this.save();
};

export const Workspace = mongoose.model<IWorkspace, WorkspaceModel>(
  'Workspace',
  WorkspaceSchema
);
