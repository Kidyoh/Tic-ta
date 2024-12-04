'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { GameState, makeMove, calculateAIMove } from '@/lib/game';
import GameBoard from '@/components/game-board';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Share2, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

interface GameClientProps {
  id: string;
  mode: string;
  initialGameState: GameState | null;
}

export default function GameClient({ id, mode, initialGameState }: GameClientProps) {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState);
  const [player, setPlayer] = useState<'X' | 'O'>('X');
  const router = useRouter();
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = databases.client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID}.documents.${id}`,
      (response) => {
        setGameState(response.payload as GameState);

        // Handle AI move if it's AI mode and AI's turn
        const payload = response.payload as GameState;
        if (mode === 'ai' && payload.currentPlayer === 'O' && !payload.winner) {
          const aiMove = calculateAIMove(payload);
          if (aiMove !== -1) {
            setTimeout(() => {
              makeMove(id, aiMove, 'O', payload);
            }, 500);
          }
        }
      }
    );

    if (initialGameState?.status === 'waiting') {
      setPlayer('O');
    }

    return () => {
      unsubscribe();
    };
  }, [id, mode, initialGameState]);

  const handleMove = async (position: number) => {
    if (!gameState || !id) return;
    
    if (mode === 'ai' && player === 'O') return;
    if (gameState.currentPlayer !== player) {
      toast({
        title: "Not your turn",
        description: "Please wait for your opponent to make a move.",
        variant: "destructive",
      });
      return;
    }

    try {
      await makeMove(id, position, player, gameState);
    } catch (error) {
      console.error('Error making move:', error);
      toast({
        title: "Failed to make move",
        description: "An error occurred while making the move. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    const gameUrl = `${window.location.origin}/game/${id}?mode=multiplayer`;
    
    try {
      await navigator.clipboard.writeText(gameUrl);
      toast({
        title: "Link copied!",
        description: "Share this link with your friend to play together.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL from your browser's address bar.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleNewGame = () => {
    router.push('/');
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-[350px] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Tic Tac Toe</CardTitle>
            <CardDescription className="text-center">
              {gameState.winner
                ? gameState.winner === 'draw'
                  ? "It's a draw!"
                  : `Player ${gameState.winner} wins!`
                : `Player ${gameState.currentPlayer}'s turn`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GameBoard
              board={gameState.board}
              size={gameState.size}
              onMove={handleMove}
              lastMove={gameState.lastMove}
              winner={gameState.winner}
            />
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleNewGame}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                New Game
              </Button>
              
              {mode === 'multiplayer' && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

