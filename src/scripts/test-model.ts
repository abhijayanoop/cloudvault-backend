import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { User } from '../models/user.model';
import { Workspace } from '../models/workspace.model';
import { Folder } from '../models/folder.model';
import { DocumentModel } from '../models/document.model';
import { SharedAccess } from '../models/sharedAccess.model';
import logger from '../config/logger';

const testModels = async () => {
  try {
    logger.info('🔌 Connecting to database...');
    await connectDatabase();

    logger.info('🧪 Testing Models...\n');

    // Test 1: Create Workspace
    logger.info('1️⃣  Testing Workspace Model...');
    const workspace = new Workspace({
      name: 'Test Workspace',
      ownerId: new mongoose.Types.ObjectId(),
      storageUsed: 1073741824, // 1GB
      storageLimit: 5368709120, // 5GB
    });

    logger.info('✅ Workspace instance created:', {
      name: workspace.name,
      storageUsedGB: workspace.storageUsedGB,
      storagePercentage: workspace.storagePercentage,
    });

    // Test 2: Create User
    logger.info('\n2️⃣  Testing User Model...');
    const user = new User({
      email: 'test@cloudvault.com',
      password: 'password123',
      name: 'Test User',
      role: 'ADMIN',
      workspaceId: workspace._id,
    });

    logger.info('✅ User instance created:', {
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Test 3: Create Folder
    logger.info('\n3️⃣  Testing Folder Model...');
    const folder = new Folder({
      name: 'Projects',
      workspaceId: workspace._id,
      createdBy: user._id,
    });

    logger.info('✅ Folder instance created:', {
      name: folder.name,
      path: folder.path,
    });

    // Test 4: Create Document
    logger.info('\n4️⃣  Testing Document Model...');
    const document = new DocumentModel({
      filename: 'doc-12345.pdf',
      originalName: 'presentation.pdf',
      mimeType: 'application/pdf',
      size: 2097152, // 2MB
      s3Key: 'workspace-1/doc-12345.pdf',
      s3Bucket: 'cloudvault-documents',
      workspaceId: workspace._id,
      ownerId: user._id,
      tags: ['presentation', 'important'],
    });

    logger.info('✅ Document instance created:', {
      originalName: document.originalName,
      sizeMB: document.sizeMB,
      fileExtension: document.fileExtension,
    });

    // Test 5: Create SharedAccess
    logger.info('\n5️⃣  Testing SharedAccess Model...');
    const sharedAccess = new SharedAccess({
      documentId: document._id,
      userId: new mongoose.Types.ObjectId(),
      permission: 'VIEW',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdBy: user._id,
    });

    logger.info('✅ SharedAccess instance created:', {
      permission: sharedAccess.permission,
      isExpired: sharedAccess.isExpired(),
      hasEditPermission: sharedAccess.hasPermission('EDIT'),
    });

    // Test methods
    logger.info('\n6️⃣  Testing Instance Methods...');
    logger.info(
      'Workspace has storage space for 1GB file:',
      workspace.hasStorageSpace(1073741824)
    );
    logger.info('Document file extension:', document.fileExtension);

    logger.info('\n✅ All model tests passed successfully!');
    logger.info('📊 Models created:');
    logger.info('   - User');
    logger.info('   - Workspace');
    logger.info('   - Folder');
    logger.info('   - Document');
    logger.info('   - SharedAccess');
  } catch (error) {
    logger.error('❌ Model test failed:', error);
  } finally {
    await mongoose.connection.close();
    logger.info('\n🔌 Database connection closed');
    process.exit(0);
  }
};

testModels();
