import {AzureOpenAI} from 'openai';
import { GameState } from '@/lib/types';
import { NextResponse } from 'next/server';
import { azureConfig } from '@/lib/config';

// Initialize OpenAI with Azure configuration
const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_API_KEY,
  baseURL: process.env.NEXT_PUBLIC_AZURE_ENDPOINT,
  apiVersion: process.env.OPENAI_API_VERSION,
  deployment: process.env.AZURE_DEPLOYMENT_NAME,
});

async function getAIMove(gameState: GameState): Promise<number> {
  try {
    const prompt = createGamePrompt(gameState);
    console.log('=== AI Request Start ===');
    console.log('Game State:', JSON.stringify(gameState, null, 2));
    console.log('Prompt:', prompt);
    console.log('Azure Config:', {
      baseURL: process.env.NEXT_PUBLIC_AZURE_ENDPOINT,
      deploymentName: process.env.AZURE_DEPLOYMENT_NAME,
      apiKey: process.env.AZURE_API_KEY ? 'Present' : 'Missing',
    });
    
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a Tic Tac Toe AI. Respond with only a number 0-8 representing your move position. The board positions are numbered from left to right, top to bottom."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 10,
      model: "gpt-4",
    });

    console.log('OpenAI Response:', JSON.stringify(completion, null, 2));
    
    const moveText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('AI Move Text:', moveText);

    const move = parseInt(moveText);
    console.log('Parsed Move:', move);
    
    if (isValidMove(move, gameState)) {
      console.log('Move is valid, returning:', move);
      return move;
    }
    
    console.log('Move was invalid, using fallback');
    return calculateFallbackMove(gameState);
  } catch (error) {
    console.error('Azure AI error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return calculateFallbackMove(gameState);
  } finally {
    console.log('=== AI Request End ===');
  }
}

function createGamePrompt(gameState: GameState): string {
  const boardDisplay = formatBoardForPrompt(gameState.board, gameState.size);
  const availablePositions = gameState.board
    .map((cell, i) => (cell === '' ? i : null))
    .filter((i) => i !== null)
    .join(', ');

  return `
You are playing a Tic Tac Toe game. Your goal is to play as 'O' and make the best move to:
1. Prevent your opponent ('X') from winning by blocking any immediate threats.
2. Position yourself for a win in future moves if blocking is not required.

Current Tic Tac Toe board state:
${boardDisplay}

Board positions are numbered from 0 to 8, as follows and it is an index of the board array:
0 | 1 | 2
---------
3 | 4 | 5
---------
6 | 7 | 8

Rules:
1. You are 'O', and your opponent is 'X'.
2. The game ends when either player gets three in a row (horizontally, vertically, or diagonally) or when the board is full.
3. Always prioritize blocking 'X' from winning over other moves.

Available positions for your next move: ${availablePositions}

Important:
- Return only the number of your chosen position (e.g., 4). Do not include any additional text, explanations, or formatting in your response.
- Always block 'X' if they have two marks in a row, even if it means you miss a winning move.
`;
}


function formatBoardForPrompt(board: string[], size: number): string {
  let result = '';
  for (let i = 0; i < board.length; i += size) {
    result += board.slice(i, i + size).map(cell => cell || '_').join(' ') + '\n';
  }
  return result;
}

function isValidMove(move: number, gameState: GameState): boolean {
  return !isNaN(move) && 
    move >= 0 && 
    move < gameState.board.length && 
    gameState.board[move] === '';
}

function calculateFallbackMove(gameState: GameState): number {
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

function checkWinner(board: string[], size: number): string | null {
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
  const diagonal2 = Array.from({ length: size }, (_, i) => board[(i + 1) * (size - 1)]);

  if (diagonal1.every((cell) => cell === 'X')) return 'X';
  if (diagonal1.every((cell) => cell === 'O')) return 'O';
  if (diagonal2.every((cell) => cell === 'X')) return 'X';
  if (diagonal2.every((cell) => cell === 'O')) return 'O';

  return null;
}

export async function POST(request: Request) {
  try {
    console.log('=== API Route Start ===');
    const gameState = await request.json() as GameState;
    console.log('Received game state:', JSON.stringify(gameState, null, 2));

    if (!process.env.AZURE_API_KEY || !process.env.NEXT_PUBLIC_AZURE_ENDPOINT) {
      console.error('Missing Azure configuration');
      throw new Error('Azure configuration is incomplete');
    }

    const move = await getAIMove(gameState);
    console.log('Final selected move:', move);

    return NextResponse.json({ move });
  } catch (error) {
    console.error('API route error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { 
        error: 'Failed to calculate move', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  } finally {
    console.log('=== API Route End ===');
  }
} 