import { Client, Databases, ID, Permission, Role } from 'appwrite';
import { appwriteConfig, GAME_SCHEMA } from './config';

class AppwriteService {
  private client: Client;
  private databases: Databases;
  private initialized: boolean = false;

  constructor() {
    this.client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);
    
    this.databases = new Databases(this.client);
  }

  async initializeDatabase() {
    if (this.initialized) return;

    try {
      // Ensure database exists
      try {
        await this.databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.collectionId);
        console.log('Database and collection exist');
      } catch (error) {
        console.log('Creating collection...');
        await this.databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collectionId,
          ID.unique(),
          {
            board: [],
            currentPlayer: 'X',
            winner: null,
            size: 3,
            status: 'waiting',
            lastMove: -1
          },
          [
            Permission.read(Role.any()),
            Permission.write(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any())
          ]
        );

        // Create indexes for better performance
        // Note: Replace the following lines with the correct method to create indexes if available in the Appwrite SDK
        console.log('Indexes creation is not supported in the current Appwrite SDK version');
      }

      this.initialized = true;
      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  getDatabases() {
    return this.databases;
  }

  getClient() {
    return this.client;
  }

  isInitialized() {
    return this.initialized;
  }
}

const appwriteService = new AppwriteService();
export default appwriteService;