import { AppwriteConfig } from './types';

// Validate environment variables
const validateConfig = (): AppwriteConfig => {
  const config = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    collectionId: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID,
  };

  const missingVars = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env.local file.'
    );
  }

  return config as AppwriteConfig;
};

export const appwriteConfig = validateConfig();

export const GAME_SCHEMA = {
  BOARD: 'board',
  CURRENT_PLAYER: 'currentPlayer',
  WINNER: 'winner',
  SIZE: 'size',
  STATUS: 'status',
  LAST_MOVE: 'lastMove',
} as const;