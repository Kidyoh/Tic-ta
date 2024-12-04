import appwriteService from './database';

let initialized = false;

export const initializeAppwrite = async () => {
  if (initialized) return;

  try {
    await appwriteService.initializeDatabase();
    initialized = true;
    console.log('Appwrite initialization completed');
  } catch (error) {
    console.error('Appwrite initialization failed:', error);
    throw error;
  }
};

// Initialize Appwrite
initializeAppwrite().catch((error) => {
  console.error('Failed to initialize Appwrite:', error);
});

export const databases = appwriteService.getDatabases();
export const client = appwriteService.getClient();