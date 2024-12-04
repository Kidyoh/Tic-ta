import { ID } from 'appwrite';
import { databases} from './appwrite';

const DATABASE_ID = "tic-tac"
const COLLECTION_ID = "tic-tac"

export interface GameState {
  id: string;
  board: string[];
  currentPlayer: 'X' | 'O';
  winner: string | null;
  size: number;
  status: 'waiting' | 'playing' | 'finished';
  lastMove: number;
}

export const createGame = async (size: number = 3): Promise<string> => {
  if (!DATABASE_ID || !COLLECTION_ID) {
    throw new Error('Missing Appwrite configuration. Please check your environment variables.');
  }

  try {
    const board = Array(size * size).fill('');
    
    const game = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        board,
        currentPlayer: 'X',
        winner: null,
        size,
        status: 'waiting',
        lastMove: -1,
      }
    );

    return game.$id;
  } catch (error) {
    console.error('Failed to create game:', error);
    throw new Error('Failed to create game. Please check your Appwrite configuration and try again.');
  }
};

export const makeMove = async (gameId: string, position: number, player: 'X' | 'O', gameState: GameState) => {
  if (!DATABASE_ID || !COLLECTION_ID) {
    throw new Error('Missing Appwrite configuration. Please check your environment variables.');
  }

  if (gameState.board[position] || gameState.winner || gameState.currentPlayer !== player) {
    return false;
  }

  try {
    const newBoard = [...gameState.board];
    newBoard[position] = player;

    const winner = checkWinner(newBoard, gameState.size);
    const isDraw = !winner && newBoard.every(cell => cell !== '');
    
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      gameId,
      {
        board: newBoard,
        currentPlayer: player === 'X' ? 'O' : 'X',
        winner: winner || (isDraw ? 'draw' : null),
        status: (winner || isDraw) ? 'finished' : 'playing',
        lastMove: position,
      }
    );

    return true;
  } catch (error) {
    console.error('Failed to make move:', error);
    throw new Error('Failed to update game. Please try again.');
  }
};

const checkWinner = (board: string[], size: number): string | null => {
  // Check rows
  for (let i = 0; i < board.length; i += size) {
    const row = board.slice(i, i + size);
    if (row.every(cell => cell === 'X')) return 'X';
    if (row.every(cell => cell === 'O')) return 'O';
  }

  // Check columns
  for (let i = 0; i < size; i++) {
    const column = Array.from({ length: size }, (_, j) => board[i + j * size]);
    if (column.every(cell => cell === 'X')) return 'X';
    if (column.every(cell => cell === 'O')) return 'O';
  }

  // Check diagonals
  const diagonal1 = Array.from({ length: size }, (_, i) => board[i * (size + 1)]);
  const diagonal2 = Array.from({ length: size }, (_, i) => board[(i + 1) * (size - 1)]);

  if (diagonal1.every(cell => cell === 'X')) return 'X';
  if (diagonal1.every(cell => cell === 'O')) return 'O';
  if (diagonal2.every(cell => cell === 'X')) return 'X';
  if (diagonal2.every(cell => cell === 'O')) return 'O';

  return null;
};

export const calculateAIMove = (gameState: GameState): number => {
  const emptyPositions = gameState.board
    .map((cell, index) => cell === '' ? index : -1)
    .filter(pos => pos !== -1);

  if (emptyPositions.length === 0) return -1;

  // Simple AI: Try to win, block opponent, or make a random move
  for (const player of ['O', 'X']) {
    for (const pos of emptyPositions) {
      const boardCopy = [...gameState.board];
      boardCopy[pos] = player;
      if (checkWinner(boardCopy, gameState.size) === player) {
        return pos;
      }
    }
  }

  // If no winning move, try to take center or corners
  const center = Math.floor(gameState.board.length / 2);
  if (emptyPositions.includes(center)) return center;

  const corners = [0, gameState.size - 1, gameState.board.length - gameState.size, gameState.board.length - 1];
  const availableCorners = corners.filter(corner => emptyPositions.includes(corner));
  if (availableCorners.length > 0) {
    return availableCorners[Math.floor(Math.random() * availableCorners.length)];
  }

  // Random move
  return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
};