import { databases } from '@/lib/appwrite';
import { GameState } from '@/lib/game';
import GameClient from './game-client';

export default async function GamePage({ params, searchParams }: { 
  params: { id: string }, 
  searchParams: { mode?: string } 
}) {
  const { id } = params;
  const mode: 'multiplayer' | 'ai' = (searchParams.mode === 'ai' ? 'ai' : 'multiplayer');

  let initialGameState: GameState | null = null;

  try {
    const response = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID!,
      id
    );
    initialGameState = response as unknown as GameState;
  } catch (error) {
    console.error('Error fetching initial game state:', error);
  }

  return <GameClient id={id} mode={mode} initialGameState={initialGameState} />;
}

