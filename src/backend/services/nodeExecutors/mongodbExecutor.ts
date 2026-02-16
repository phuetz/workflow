/**
 * MongoDB Node Executor
 * Real integration with MongoDB via native driver
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import { logger } from '../../../services/SimpleLogger';

export const mongodbExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const credentials = context.credentials || {};

    const connectionString = credentials.connectionString || credentials.uri || config.connectionString;
    if (!connectionString) {
      throw new Error('MongoDB connection string is required (provide via credentials)');
    }

    const database = (config.database || credentials.database) as string;
    const collection = config.collection as string;
    const operation = (config.operation || 'find') as string;

    if (!database) throw new Error('Database name is required');
    if (!collection) throw new Error('Collection name is required');

    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(connectionString as string);

    logger.info('Executing MongoDB operation', { operation, database, collection });

    try {
      await client.connect();
      const db = client.db(database);
      const coll = db.collection(collection);

      let result: any;

      switch (operation) {
        case 'find': {
          const filter = (config.filter || {}) as Record<string, unknown>;
          const sort = config.sort as any;
          const limit = (config.limit || 100) as number;
          const skip = (config.skip || 0) as number;
          const projection = config.projection as Record<string, number> | undefined;

          const cursor = coll.find(filter, { projection });
          if (sort) cursor.sort(sort);
          const docs = await cursor.skip(skip).limit(limit).toArray();
          result = { documents: docs, count: docs.length };
          break;
        }

        case 'findOne': {
          const filter = (config.filter || {}) as Record<string, unknown>;
          const doc = await coll.findOne(filter);
          result = { document: doc };
          break;
        }

        case 'insertOne': {
          const document = (config.document || context.input) as Record<string, unknown>;
          if (!document) throw new Error('Document is required for insertOne');
          const res = await coll.insertOne(document);
          result = { insertedId: res.insertedId, acknowledged: res.acknowledged };
          break;
        }

        case 'insertMany': {
          const documents = (config.documents || context.input) as Record<string, unknown>[];
          if (!documents || !Array.isArray(documents)) throw new Error('Documents array is required for insertMany');
          const res = await coll.insertMany(documents);
          result = { insertedCount: res.insertedCount, insertedIds: res.insertedIds };
          break;
        }

        case 'updateOne': {
          const filter = (config.filter || {}) as Record<string, unknown>;
          const update = config.update as Record<string, unknown>;
          if (!update) throw new Error('Update document is required');
          const upsert = Boolean(config.upsert);
          const res = await coll.updateOne(filter, update, { upsert });
          result = {
            matchedCount: res.matchedCount,
            modifiedCount: res.modifiedCount,
            upsertedId: res.upsertedId,
          };
          break;
        }

        case 'updateMany': {
          const filter = (config.filter || {}) as Record<string, unknown>;
          const update = config.update as Record<string, unknown>;
          if (!update) throw new Error('Update document is required');
          const res = await coll.updateMany(filter, update);
          result = { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
          break;
        }

        case 'deleteOne': {
          const filter = (config.filter || {}) as Record<string, unknown>;
          const res = await coll.deleteOne(filter);
          result = { deletedCount: res.deletedCount };
          break;
        }

        case 'deleteMany': {
          const filter = (config.filter || {}) as Record<string, unknown>;
          const res = await coll.deleteMany(filter);
          result = { deletedCount: res.deletedCount };
          break;
        }

        case 'aggregate': {
          const pipeline = (config.pipeline || []) as Record<string, unknown>[];
          const docs = await coll.aggregate(pipeline).toArray();
          result = { documents: docs, count: docs.length };
          break;
        }

        default:
          throw new Error(`Unknown MongoDB operation: ${operation}`);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } finally {
      await client.close();
    }
  },
};
