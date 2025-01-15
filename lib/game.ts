import { ID, Permission, Role } from 'appwrite';
import { databases } from './appwrite';
import { appwriteConfig } from './config';
import { Player, GameState } from './types';

function getFallbackMove(gameState: GameState): number {
  const board = gameState.board;
  
  // First move - take center
  if (board.every(cell => cell === '')) {
    return Math.floor(board.length / 2);
  }

  // Try to find a winning move
  for (let i = 0; i < board.length; i++) {
    if (board[i] === '') {
      const testBoard = [...board];
      testBoard[i] = 'O';
      if (checkWinner(testBoard, gameState.size) === 'O') {
        return i;
      }
    }
  }

  // Try to block opponent's winning move
  for (let i = 0; i < board.length; i++) {
    if (board[i] === '') {
      const testBoard = [...board];
      testBoard[i] = 'X';
      if (checkWinner(testBoard, gameState.size) === 'X') {
        return i;
      }
    }
  }

  // Take any available corner
  const corners = [0, gameState.size - 1, gameState.size * (gameState.size - 1), gameState.size * gameState.size - 1];
  const availableCorners = corners.filter(c => board[c] === '');
  if (availableCorners.length > 0) {
    return availableCorners[Math.floor(Math.random() * availableCorners.length)];
  }

  // Take any available space
  const availableMoves = board
    .map((cell, index) => cell === '' ? index : -1)
    .filter(index => index !== -1);
  
  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

export const createGame = async (size: number = 3): Promise<string> => {
  try {
    const board = Array(size * size).fill('');

    const game = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      ID.unique(),
      {
        board,
        currentPlayer: 'X',
        winner: null,
        size,
        status: 'waiting',
        lastMove: -1,
        rematchRequested: null,
        rematchAccepted: false,
      },
      [
        Permission.read(Role.any()),
        Permission.write(Role.any()),
        Permission.update(Role.any())
      ]
    );

    return game.$id;
  } catch (error) {
    console.error('Failed to create game:', error);
    throw error;
  }
};

export const makeMove = async (
  gameId: string,
  position: number,
  player: 'X' | 'O',
  gameState: GameState
): Promise<boolean> => {
  if (!gameId || position < 0 || position >= gameState.board.length) {
    return false;
  }

  if (
    gameState.board[position] ||
    gameState.winner ||
    gameState.currentPlayer !== player
  ) {
    return false;
  }

  try {
    const newBoard = [...gameState.board];
    newBoard[position] = player;

    const winner = checkWinner(newBoard, gameState.size);
    const isDraw = !winner && newBoard.every((cell) => cell !== '');
    const newStatus = winner || isDraw ? 'finished' : 'playing';

    const result = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      gameId,
      {
        board: newBoard,
        currentPlayer: player === 'X' ? 'O' : 'X',
        winner: winner || (isDraw ? 'draw' : null),
        status: newStatus,
        lastMove: position,
      }
    );

    return !!result;
  } catch (error) {
    console.error('Failed to make move:', error);
    throw error;
  }
};

const checkWinner = (board: string[], size: number): string | null => {
  // Check rows
  for (let i = 0; i < board.length; i += size) {
    const row = board.slice(i, i + size);
    if (row.every((cell) => cell === 'X')) return 'X';
    if (row.every((cell) => cell === 'O')) return 'O';
  }

  // Check columns
  for (let i = 0; i < size; i++) {
    const column = Array.from({ length: size }, (_, j) => board[i + j * size]);
    if (column.every((cell) => cell === 'X')) return 'X';
    if (column.every((cell) => cell === 'O')) return 'O';
  }

  // Check diagonals
  const diagonal1 = Array.from({ length: size }, (_, i) => board[i * (size + 1)]);
  const diagonal2 = Array.from(
    { length: size },
    (_, i) => board[(i + 1) * (size - 1)]
  );

  if (diagonal1.every((cell) => cell === 'X')) return 'X';
  if (diagonal1.every((cell) => cell === 'O')) return 'O';
  if (diagonal2.every((cell) => cell === 'X')) return 'X';
  if (diagonal2.every((cell) => cell === 'O')) return 'O';

  return null;
};

export const calculateAIMove = async (gameState: GameState): Promise<number> => {
  try {
    console.log('Sending game state to AI:', gameState);

    const response = await fetch('/tic-tac/api/ai-move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gameState),
    });

    console.log('AI API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to get AI move: ${errorData.details || response.status}`);
    }

    const data = await response.json();
    console.log('AI API response data:', data);

    if (typeof data.move !== 'number') {
      throw new Error('Invalid move received from AI');
    }

    return data.move;
  } catch (error) {
    console.error('AI calculation error:', error);
    return getFallbackMove(gameState);
  }
};

function findWinningMove(board: string[], player: string, size: number): number {
  // Get all possible winning combinations
  const lines = getAllLines(size);

  for (const line of lines) {
    const cells = line.map(index => board[index]);
    const playerCells = cells.filter(cell => cell === player).length;
    const emptyCells = cells.filter(cell => cell === '').length;

    if (playerCells === size - 1 && emptyCells === 1) {
      const emptyIndex = line[cells.findIndex(cell => cell === '')];
      return emptyIndex;
    }
  }

  return -1;
}

function getAllLines(size: number): number[][] {
  const lines: number[][] = [];

  // Rows
  for (let i = 0; i < size; i++) {
    const row = Array.from({ length: size }, (_, j) => i * size + j);
    lines.push(row);
  }

  // Columns
  for (let i = 0; i < size; i++) {
    const column = Array.from({ length: size }, (_, j) => i + j * size);
    lines.push(column);
  }

  // Diagonals
  const diagonal1 = Array.from({ length: size }, (_, i) => i * (size + 1));
  const diagonal2 = Array.from({ length: size }, (_, i) => (i + 1) * (size - 1));
  lines.push(diagonal1, diagonal2);

  return lines;
}

function getCorners(size: number): number[] {
  return [
    0,                    // top-left
    size - 1,            // top-right
    size * (size - 1),   // bottom-left
    size * size - 1      // bottom-right
  ];
}

function getSides(size: number): number[] {
  const sides: number[] = [];
  
  // Top and bottom edges (excluding corners)
  for (let i = 1; i < size - 1; i++) {
    sides.push(i);                    // top edge
    sides.push(size * (size - 1) + i); // bottom edge
  }
  
  // Left and right edges (excluding corners)
  for (let i = 1; i < size - 1; i++) {
    sides.push(i * size);          // left edge
    sides.push(i * size + size - 1); // right edge
  }
  
  return sides;
}

function getStrategicMoves(board: string[], size: number): number[] {
  const moves: number[] = [];
  const center = Math.floor(size * size / 2);
  const corners = getCorners(size);
  
  // Priority 1: Take center if available
  if (board[center] === '') {
    moves.push(center);
  }

  // Priority 2: Take opposite corner if opponent has a corner
  for (const corner of corners) {
    if (board[corner] === 'X') {
      const oppositeCorner = size * size - 1 - corner;
      if (board[oppositeCorner] === '') {
        moves.push(oppositeCorner);
      }
    }
  }

  // Priority 3: Take any available corner
  const availableCorners = corners.filter(corner => board[corner] === '');
  moves.push(...availableCorners);

  // Priority 4: Take any available side
  const sides = getSides(size);
  const availableSides = sides.filter(side => board[side] === '');
  moves.push(...availableSides);

  return moves;
}

export const requestRematch = async (
  gameId: string,
  player: Player,
  gameState: GameState
): Promise<boolean> => {
  try {
    const result = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      gameId,
      {
        rematchRequested: player,
        rematchAccepted: false,
      }
    );
    return !!result;
  } catch (error) {
    console.error('Failed to request rematch:', error);
    throw error;
  }
};

export const acceptRematch = async (
  gameId: string,
  size: number
): Promise<boolean> => {
  try {
    const result = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      gameId,
      {
        board: Array(size * size).fill(''),
        currentPlayer: 'X',
        winner: null,
        status: 'playing',
        lastMove: -1,
        rematchRequested: null,
        rematchAccepted: true,
      }
    );
    return !!result;
  } catch (error) {
    console.error('Failed to accept rematch:', error);
    throw error;
  }
};

export const declineRematch = async (
  gameId: string,
): Promise<boolean> => {
  try {
    const result = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      gameId,
      {
        rematchRequested: null,
        rematchAccepted: false,
        status: 'declined'
      }
    );
    return !!result;
  } catch (error) {
    console.error('Failed to decline rematch:', error);
    throw error;
  }
};