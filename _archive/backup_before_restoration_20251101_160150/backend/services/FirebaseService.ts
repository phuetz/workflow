/**
 * Firebase Service
 * Handles Firebase operations using Admin SDK
 * Supports: Firestore, Realtime Database, Auth, Storage, and Functions
 */

import { logger } from '../../services/LoggingService';
import * as admin from 'firebase-admin';

interface FirebaseCredentials {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

interface FirestoreFilter {
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'in' | 'array-contains-any';
  value: any;
}

export class FirebaseService {
  private app: admin.app.App;
  private firestore: admin.firestore.Firestore;
  private database: admin.database.Database;
  private auth: admin.auth.Auth;
  private storage: admin.storage.Storage;

  constructor(credentials: FirebaseCredentials, appName = 'workflow-firebase') {
    try {
      // Initialize Firebase Admin
      this.app = admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId: credentials.projectId,
            privateKey: credentials.privateKey.replace(/\\n/g, '\n'),
            clientEmail: credentials.clientEmail,
          }),
          databaseURL: `https://${credentials.projectId}.firebaseio.com`,
          storageBucket: `${credentials.projectId}.appspot.com`,
        },
        appName
      );

      this.firestore = this.app.firestore();
      this.database = this.app.database();
      this.auth = this.app.auth();
      this.storage = this.app.storage();

      logger.info(`Firebase service initialized for project: ${credentials.projectId}`);
    } catch (error) {
      logger.error('Failed to initialize Firebase service:', error);
      throw new Error('Firebase initialization failed');
    }
  }

  /**
   * FIRESTORE OPERATIONS
   */

  /**
   * Get document from Firestore
   */
  async getDocument(collection: string, documentId: string): Promise<any> {
    try {
      logger.info(`Getting Firestore document: ${collection}/${documentId}`);

      const docRef = this.firestore.collection(collection).doc(documentId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Document ${documentId} not found in ${collection}`);
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error('Failed to get document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create document in Firestore
   */
  async createDocument(
    collection: string,
    data: any,
    documentId?: string
  ): Promise<any> {
    try {
      logger.info(`Creating document in Firestore collection: ${collection}`);

      let docRef;
      if (documentId) {
        docRef = this.firestore.collection(collection).doc(documentId);
        await docRef.set(data);
      } else {
        docRef = await this.firestore.collection(collection).add(data);
      }

      logger.info(`Document created: ${docRef.id}`);
      return { id: docRef.id, ...data };
    } catch (error) {
      logger.error('Failed to create document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update document in Firestore
   */
  async updateDocument(
    collection: string,
    documentId: string,
    data: any
  ): Promise<any> {
    try {
      logger.info(`Updating Firestore document: ${collection}/${documentId}`);

      const docRef = this.firestore.collection(collection).doc(documentId);
      await docRef.update(data);

      logger.info('Document updated successfully');
      return { id: documentId, ...data };
    } catch (error) {
      logger.error('Failed to update document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete document from Firestore
   */
  async deleteDocument(collection: string, documentId: string): Promise<void> {
    try {
      logger.info(`Deleting Firestore document: ${collection}/${documentId}`);

      await this.firestore.collection(collection).doc(documentId).delete();

      logger.info('Document deleted successfully');
    } catch (error) {
      logger.error('Failed to delete document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Query collection with filters
   */
  async queryCollection(
    collection: string,
    filters?: FirestoreFilter[],
    options?: {
      orderBy?: string;
      limit?: number;
      startAfter?: any;
    }
  ): Promise<any[]> {
    try {
      logger.info(`Querying Firestore collection: ${collection}`);

      let query: admin.firestore.Query = this.firestore.collection(collection);

      // Apply filters
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          query = query.where(filter.field, filter.operator, filter.value);
        });
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.orderBy(options.orderBy);
      }

      // Apply limit
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      // Apply cursor
      if (options?.startAfter) {
        query = query.startAfter(options.startAfter);
      }

      const snapshot = await query.get();

      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      logger.info(`Found ${documents.length} documents`);
      return documents;
    } catch (error) {
      logger.error('Failed to query collection:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List all documents in collection
   */
  async listDocuments(collection: string, limit = 100): Promise<any[]> {
    try {
      logger.info(`Listing documents in Firestore collection: ${collection}`);

      const snapshot = await this.firestore
        .collection(collection)
        .limit(limit)
        .get();

      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      logger.info(`Found ${documents.length} documents`);
      return documents;
    } catch (error) {
      logger.error('Failed to list documents:', error);
      throw this.handleError(error);
    }
  }

  /**
   * REALTIME DATABASE OPERATIONS
   */

  /**
   * Get value from Realtime Database
   */
  async getValue(path: string): Promise<any> {
    try {
      logger.info(`Getting value from Realtime Database: ${path}`);

      const snapshot = await this.database.ref(path).once('value');

      return snapshot.val();
    } catch (error) {
      logger.error('Failed to get value:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Set value in Realtime Database
   */
  async setValue(path: string, value: any): Promise<void> {
    try {
      logger.info(`Setting value in Realtime Database: ${path}`);

      await this.database.ref(path).set(value);

      logger.info('Value set successfully');
    } catch (error) {
      logger.error('Failed to set value:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update value in Realtime Database
   */
  async updateValue(path: string, updates: any): Promise<void> {
    try {
      logger.info(`Updating value in Realtime Database: ${path}`);

      await this.database.ref(path).update(updates);

      logger.info('Value updated successfully');
    } catch (error) {
      logger.error('Failed to update value:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete value from Realtime Database
   */
  async deleteValue(path: string): Promise<void> {
    try {
      logger.info(`Deleting value from Realtime Database: ${path}`);

      await this.database.ref(path).remove();

      logger.info('Value deleted successfully');
    } catch (error) {
      logger.error('Failed to delete value:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Push value to Realtime Database (auto-generated key)
   */
  async push(path: string, value: any): Promise<string> {
    try {
      logger.info(`Pushing value to Realtime Database: ${path}`);

      const ref = await this.database.ref(path).push(value);

      logger.info(`Value pushed with key: ${ref.key}`);
      return ref.key || '';
    } catch (error) {
      logger.error('Failed to push value:', error);
      throw this.handleError(error);
    }
  }

  /**
   * AUTHENTICATION OPERATIONS
   */

  /**
   * Create user
   */
  async createUser(email: string, password: string, displayName?: string, phoneNumber?: string): Promise<any> {
    try {
      logger.info(`Creating Firebase user: ${email}`);

      const userRecord = await this.auth.createUser({
        email,
        password,
        displayName,
        phoneNumber,
      });

      logger.info(`User created: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get user by UID
   */
  async getUser(uid: string): Promise<any> {
    try {
      logger.info(`Getting Firebase user: ${uid}`);

      const userRecord = await this.auth.getUser(uid);

      return userRecord;
    } catch (error) {
      logger.error('Failed to get user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update user
   */
  async updateUser(uid: string, updates: any): Promise<any> {
    try {
      logger.info(`Updating Firebase user: ${uid}`);

      const userRecord = await this.auth.updateUser(uid, updates);

      logger.info('User updated successfully');
      return userRecord;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      logger.info(`Deleting Firebase user: ${uid}`);

      await this.auth.deleteUser(uid);

      logger.info('User deleted successfully');
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List users
   */
  async listUsers(maxResults = 100): Promise<any[]> {
    try {
      logger.info('Listing Firebase users');

      const listUsersResult = await this.auth.listUsers(maxResults);

      logger.info(`Found ${listUsersResult.users.length} users`);
      return listUsersResult.users;
    } catch (error) {
      logger.error('Failed to list users:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Set custom claims for user
   */
  async setCustomClaims(uid: string, claims: any): Promise<void> {
    try {
      logger.info(`Setting custom claims for user: ${uid}`);

      await this.auth.setCustomUserClaims(uid, claims);

      logger.info('Custom claims set successfully');
    } catch (error) {
      logger.error('Failed to set custom claims:', error);
      throw this.handleError(error);
    }
  }

  /**
   * STORAGE OPERATIONS
   */

  /**
   * Upload file to storage
   */
  async uploadFile(
    filePath: string,
    fileData: Buffer,
    options?: {
      contentType?: string;
      metadata?: any;
    }
  ): Promise<any> {
    try {
      logger.info(`Uploading file to Firebase Storage: ${filePath}`);

      const bucket = this.storage.bucket();
      const file = bucket.file(filePath);

      await file.save(fileData, {
        contentType: options?.contentType || 'application/octet-stream',
        metadata: options?.metadata,
      });

      logger.info('File uploaded successfully');

      // Get public URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return { filePath, url };
    } catch (error) {
      logger.error('Failed to upload file:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Download file from storage
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      logger.info(`Downloading file from Firebase Storage: ${filePath}`);

      const bucket = this.storage.bucket();
      const file = bucket.file(filePath);

      const [fileData] = await file.download();

      logger.info('File downloaded successfully');
      return fileData;
    } catch (error) {
      logger.error('Failed to download file:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      logger.info(`Deleting file from Firebase Storage: ${filePath}`);

      const bucket = this.storage.bucket();
      await bucket.file(filePath).delete();

      logger.info('File deleted successfully');
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List files in storage
   */
  async listFiles(prefix?: string): Promise<any[]> {
    try {
      logger.info(`Listing files in Firebase Storage${prefix ? `: ${prefix}` : ''}`);

      const bucket = this.storage.bucket();
      const [files] = await bucket.getFiles({ prefix });

      const fileList = files.map(file => ({
        name: file.name,
        bucket: file.bucket.name,
        size: file.metadata.size,
        contentType: file.metadata.contentType,
        updated: file.metadata.updated,
      }));

      logger.info(`Found ${fileList.length} files`);
      return fileList;
    } catch (error) {
      logger.error('Failed to list files:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<any> {
    try {
      logger.info(`Getting metadata for file: ${filePath}`);

      const bucket = this.storage.bucket();
      const file = bucket.file(filePath);
      const [metadata] = await file.getMetadata();

      return metadata;
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: any): Error {
    if (error instanceof Error) {
      return new Error(`Firebase Error: ${error.message}`);
    }
    return new Error('Unknown Firebase error');
  }

  /**
   * Cleanup - delete app instance
   */
  async cleanup(): Promise<void> {
    try {
      await this.app.delete();
      logger.info('Firebase app instance deleted');
    } catch (error) {
      logger.error('Failed to cleanup Firebase app:', error);
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'Firebase',
      projectId: this.app.options.projectId,
      initialized: true,
    };
  }
}

// Export factory function
export function createFirebaseService(credentials: FirebaseCredentials, appName?: string): FirebaseService {
  return new FirebaseService(credentials, appName);
}
