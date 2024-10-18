import { MongoClient, ServerApiVersion } from 'mongodb';
import { env } from 'config';
import { logger } from 'logger';

export const MongoInstance = new MongoClient(env.MONGO_URI, {
  directConnection: true,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const connectMongoDb = async () => {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await MongoInstance.connect();
    // Send a ping to confirm a successful connection
    await MongoInstance.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } catch (e) {
    logger.error('Failed to connect to the database:', e);
    throw 'Failed to connect to the database';
  }
};
