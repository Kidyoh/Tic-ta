import { Client, Databases, Permission, Role } from 'appwrite';
import { appwriteConfig, GAME_SCHEMA } from './config';

class AppwriteService {
  private client: Client;
  private databases: Databases;

  constructor() {
    this.client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);
    
    this.databases = new Databases(this.client);
  }

  async initializeDatabase() {
    try {
      // Ensure collection exists
      try {
        await this.databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.collectionId);
        console.log('Collection exists');
      } catch (error) {
        console.log('Creating collection...');
        await this.databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collectionId,
          'documentId',
          { name: 'tic-tac' }
        );

        // Create attributes
        const attributes = [
          { key: GAME_SCHEMA.CURRENT_PLAYER, type: 'string', size: 255, required: true },
          { key: GAME_SCHEMA.WINNER, type: 'string', size: 255, required: false },
          { key: GAME_SCHEMA.SIZE, type: 'integer', required: true },
          { key: GAME_SCHEMA.STATUS, type: 'string', size: 255, required: true },
          { key: GAME_SCHEMA.LAST_MOVE, type: 'integer', required: true },
          { key: GAME_SCHEMA.BOARD, type: 'array', required: true },
        ];

        for (const attr of attributes) {
          try {
            if (attr.type === 'string') {
              await this.databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.collectionId,
                attr.key,
                { size: attr.size, required: attr.required }
              );
            } else if (attr.type === 'integer') {
              await this.databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.collectionId,
                attr.key,
                { required: attr.required }
              );
            } else if (attr.type === 'array') {
              await this.databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.collectionId,
                attr.key,
                { required: attr.required }
              );
            }
          } catch (error) {
            console.log(`Attribute ${attr.key} might already exist, continuing...`);
          }
        }
      }

      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new Error('Failed to initialize database. Please check your Appwrite configuration.');
    }
  }

  getDatabases() {
    return this.databases;
  }

  getClient() {
    return this.client;
  }
}

const appwriteService = new AppwriteService();
export default appwriteService;