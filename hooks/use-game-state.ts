'use client';

import { useState, useEffect } from 'react';
import { GameState } from '@/lib/types';

export function useGameState(initialState: GameState | null, mode: string) {
  const [gameState, setGameState] = useState<GameState | null>(initialState);
  const [player, setPlayer] = useState<'X' | 'O'>('X');

  useEffect(() => {
    if (gameState) {
      console.log('Current Game State:', {
        currentPlayer: gameState.currentPlayer,
        localPlayer: player,
        mode,
        board: gameState.board,
        winner: gameState.winner,
      });
    }
  }, [gameState, player, mode]);

  const updateGameState = (newState: GameState) => {
    setGameState(newState);
  };

  const updatePlayer = (newPlayer: 'X' | 'O') => {
    setPlayer(newPlayer);
  };

  return {
    gameState,
    player,
    updateGameState,
    updatePlayer,
  };
}