import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  workspaceId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const UserSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    role: {
      type: String,
      enum: {
        values: ['ADMIN', 'EDITOR', 'VIEWER'],
        message: '{VALUE} is not a role',
      },
      default: 'VIEWER',
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Workspace ID is required'],
      ref: 'Workspace',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        delete ret.password;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

UserSchema.index({ email: 1 });
UserSchema.index({ workspaceId: 1 });
UserSchema.index({ createdAt: -1 });

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export const User = mongoose.model<IUser, UserModel>('User', UserSchema);
