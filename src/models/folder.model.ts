import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  parentId: mongoose.Types.ObjectId | null;
  workspaceId: mongoose.Types.ObjectId;
  path: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IFolderMethods {
  getFullPath(): Promise<String>;
  getChildren(): Promise<IFolder[]>;
}

interface IFolderStatics {
  findByWorkspace(workspaceId: string): Promise<IFolder[]>;
  findRootFolders(workspaceId: string): Promise<IFolder[]>;
}

type FolderType = Model<IFolder, {}, IFolderMethods> & IFolderStatics;

export const FolderSchema = new Schema<IFolder, FolderType, IFolderMethods>(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      minlength: [1, 'Folder name must be at least 1 character'],
      maxlength: [255, 'Folder name cannot exceed 255 characters'],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace is required'],
    },
    path: {
      type: String,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

FolderSchema.index({ workspaceId: 1, parentId: 1 });
FolderSchema.index({ path: 1 });
FolderSchema.index({ createdBy: 1 });
FolderSchema.index({ createdAt: -1 });

FolderSchema.pre('save', async function () {
  if (!this.isNew && !this.isModified('parentId') && !this.isModified('name')) {
    return;
  }

  if (this.parentId) {
    const parent = await mongoose
      .model<IFolder>('Folder')
      .findById(this.parentId);

    if (parent) {
      this.path = parent.path ? `${parent.path}/${this.name}` : this.name;
    } else {
      this.path = this.name;
    }
  } else {
    this.path = this.name;
  }
});

// methods
FolderSchema.methods.getFullPath = async function (): Promise<string> {
  return this.path;
};

FolderSchema.methods.getChildren = async function (): Promise<IFolder[]> {
  return await mongoose.model('Folder').find({ parentId: this._id });
};

FolderSchema.statics.findByWorkspace = function (
  workspaceId: string
): Promise<IFolder[]> {
  return this.find({ workspaceId }).sort({ path: 1 });
};

FolderSchema.statics.findRootFolders = function (
  workspaceId: string
): Promise<IFolder[]> {
  return this.find({ workspaceId, parentId: null }).sort({ name: 1 });
};

export const Folder = mongoose.model<IFolder, FolderType>(
  'Folder',
  FolderSchema
);
