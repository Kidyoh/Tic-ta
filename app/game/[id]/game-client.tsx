'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { makeMove, calculateAIMove, requestRematch, acceptRematch, declineRematch } from '@/lib/game';
import GameBoard from '@/components/game-board';
import ReactConfetti from 'react-confetti';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Share2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { appwriteConfig } from '@/lib/config';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GameState, Player } from '@/lib/types';

interface GameClientProps {
  id: string;
  mode: string;
  initialGameState: GameState | null;
  player?: 'X' | 'O';
}

export default function GameClient({
  id,
  mode,
  initialGameState,
  player: initialPlayer,
}: GameClientProps) {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState);
  const [player, setPlayer] = useState<'X' | 'O'>(initialPlayer || 'X');
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStartPrompt, setShowStartPrompt] = useState(true);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showLoseEffect, setShowLoseEffect] = useState(false);
  const [showRematchDialog, setShowRematchDialog] = useState(false);
  const [isRematchRequested, setIsRematchRequested] = useState(false);
  const [rematchDeclined, setRematchDeclined] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (gameState?.winner && gameState.winner !== 'draw') {
      if (gameState.winner === player) {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
      } else {
        setShowLoseEffect(true);
        const timer = setTimeout(() => setShowLoseEffect(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState?.winner, player]);

  useEffect(() => {
    if (!id) return;

    if (mode === 'ai') {
      setPlayer('X');
    } else if (mode === 'multiplayer') {
      if (initialPlayer) {
        setPlayer(initialPlayer);
      } else if (initialGameState?.status === 'waiting') {
        setPlayer('X');
      } else {
        setPlayer('O');
      }
    }

    const unsubscribe = databases.client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.collectionId}.documents.${id}`,
      async (response) => {
        const newGameState = response.payload as GameState;
        setGameState(newGameState);

        // Handle only rematch-related updates
        if (newGameState.rematchRequested && newGameState.rematchRequested !== player) {
          setShowRematchDialog(true);
          setRematchDeclined(false);
        }

        if (newGameState.status === 'declined') {
          setIsRematchRequested(false);
          setRematchDeclined(true);
          toast({
            title: "Rematch Declined",
            description: "Your opponent has declined the rematch.",
            variant: "destructive",
          });
          
          setTimeout(() => {
            router.push('/');
          }, 3000);
        }

        if (newGameState.rematchAccepted) {
          setShowRematchDialog(false);
          setIsRematchRequested(false);
          setRematchDeclined(false);
          toast({
            title: "Game Restarted!",
            description: "Both players ready. Game on!",
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [id, mode, initialGameState, initialPlayer, toast, router, player]);

  useEffect(() => {
    if (gameState?.status === 'waiting' && mode === 'multiplayer' && player === 'X') {
      setShowStartPrompt(true);
      toast({
        title: "Start the game",
        description: "Make your first move and share the game link with your friend!",
        duration: 5000,
      });
    }
  }, [gameState?.status, mode, player]);

  const handleMove = async (position: number) => {
    if (!gameState || !id || isProcessing || gameState.winner) return;

    setShowStartPrompt(false);
    setIsProcessing(true);

    try {
      // Handle player move
      const moveSuccessful = await makeMove(id, position, player, gameState);
      if (moveSuccessful && mode === 'ai') {
        // Immediately calculate and make AI move
        console.log('Calculating AI move immediately');
        const newBoard = [...gameState.board];
        newBoard[position] = 'X';
        
        const aiGameState: GameState = {
          ...gameState,
          board: newBoard,
          currentPlayer: 'O' as const,
          lastMove: position,
          id: gameState.id,
          winner: gameState.winner,
          size: gameState.size,
          status: gameState.status,
          rematchRequested: gameState.rematchRequested,
          rematchAccepted: gameState.rematchAccepted
        };

        const aiMove = await calculateAIMove(aiGameState);
        console.log('AI selected move:', aiMove);
        
        if (aiMove !== -1) {
          await makeMove(id, aiMove, 'O', aiGameState);
          console.log('AI move completed');
        }
      }
    } catch (error) {
      console.error('Error making move:', error);
      toast({
        title: 'Failed to make move',
        description: 'An error occurred while making the move. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }

    // Handle multiplayer share prompt
    if (mode === 'multiplayer' && player === 'X' && gameState.board.every(cell => cell === '')) {
      setShowSharePrompt(true);
      toast({
        title: "Share the game",
        description: "Great! Now share the game link with your friend to start playing!",
        action: <ToastAction altText="Share" onClick={handleShare}>Share</ToastAction>,
        duration: 10000,
      });
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    const gameUrl = `${window.location.origin}/tic-tac/game/${id}?mode=multiplayer&player=O`;

    try {
      await navigator.clipboard.writeText(gameUrl);
      toast({
        title: 'Game link copied!',
        description:
          'Share this link with your friend. They will join as Player O, and you will play as Player X.',
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: "Please copy the URL from your browser's address bar.",
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleNewGame = () => {
    router.push('/');
  };

  const handleRematchRequest = async () => {
    if (!gameState || !id) return;
    
    setIsRematchRequested(true);
    try {
      await requestRematch(id, player, gameState);
      toast({
        title: "Rematch Requested",
        description: "Waiting for opponent to accept...",
      });
    } catch (error) {
      setIsRematchRequested(false);
      toast({
        title: "Failed to request rematch",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRematchAccept = async () => {
    if (!gameState || !id) return;
    
    try {
      await acceptRematch(id, gameState.size);
      setShowRematchDialog(false);
    } catch (error) {
      toast({
        title: "Failed to accept rematch",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRematchDecline = async () => {
    if (!gameState || !id) return;
    
    try {
      await declineRematch(id);
      setShowRematchDialog(false);
      setRematchDeclined(true);
      toast({
        title: "Rematch Declined",
        description: "Starting a new game...",
      });
      
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to decline rematch",
        variant: "destructive",
      });
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getGameStatus = () => {
    if (gameState.winner) {
      if (gameState.winner === 'draw') return "It's a draw! 🤝";
      return gameState.winner === player 
        ? "Victory! 🎉" 
        : "Better luck next time! 😔";
    }

    if (mode === 'ai') {
      return gameState.currentPlayer === 'X' 
        ? "Your turn to move" 
        : "AI is thinking... 🤖";
    }

    return gameState.currentPlayer === player
      ? "Your turn to move"
      : `Waiting for opponent's move (You are ${player})`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center p-4 relative overflow-hidden">
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={true}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      {showLoseEffect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [1.5, 1, 0.8],
              transition: { duration: 3, ease: "easeOut" }
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-red-500 text-9xl opacity-20">×</div>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={gameState.winner ? 'winner' : 'playing'}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-[350px] shadow-lg">
            <CardHeader>
              <motion.div
                animate={gameState.winner ? {
                  scale: [1, 1.2, 1],
                  transition: { repeat: Infinity, duration: 1.5 }
                } : {}}
              >
                <CardTitle className="text-2xl text-center">
                  {gameState.winner ? (
                    <motion.span
                      className={cn(
                        "text-primary",
                        gameState.winner === player 
                          ? "text-green-500" 
                          : gameState.winner === 'draw' 
                            ? "text-yellow-500" 
                            : "text-red-500"
                      )}
                      animate={
                        gameState.winner === player
                          ? {
                              scale: [1, 1.2, 1],
                              transition: { repeat: Infinity, duration: 1.5 }
                            }
                          : gameState.winner === 'draw'
                          ? {
                              rotate: [0, 5, -5, 0],
                              transition: { repeat: Infinity, duration: 2 }
                            }
                          : {
                              y: [0, -5, 0],
                              transition: { repeat: Infinity, duration: 1 }
                            }
                      }
                    >
                      {gameState.winner === 'draw' 
                        ? "Draw Game!" 
                        : gameState.winner === player 
                          ? "You Won!" 
                          : "Game Over"}
                    </motion.span>
                  ) : (
                    "Tic Tac Toe"
                  )}
                </CardTitle>
              </motion.div>
              <CardDescription className="text-center text-lg">
                {getGameStatus()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showStartPrompt && mode === 'multiplayer' && player === 'X' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-primary/10 rounded-lg text-center"
                >
                  <p className="text-sm font-medium">
                    Click any square to make your first move, then share the game link with your friend!
                  </p>
                </motion.div>
              )}

              {showSharePrompt && mode === 'multiplayer' && player === 'X' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-primary/10 rounded-lg text-center"
                >
                  <p className="text-sm font-medium">
                    Great first move! Now share the game with your friend to start playing.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-2"
                    onClick={handleShare}
                    disabled={isSharing}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Game
                  </Button>
                </motion.div>
              )}

              <GameBoard
                board={gameState.board}
                size={gameState.size}
                onMove={handleMove}
                lastMove={gameState.lastMove}
                winner={gameState.winner}
                disabled={isProcessing || (mode === 'ai' && gameState.currentPlayer === 'O')}
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

                {mode === 'multiplayer' && player === 'X' && (
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


              <div className="text-center text-sm text-muted-foreground">
                <p>Game ID: {id}</p>
                <Button
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(id);
                    toast({
                      title: 'Game ID copied!',
                      description: 'Share this ID with your friend to let them join.',
                    });
                  }}
                >
                  Copy ID
                </Button>
              </div>

              {mode === 'multiplayer' && gameState.winner && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleRematchRequest}
                    disabled={isRematchRequested || rematchDeclined}
                  >
                    {isRematchRequested 
                      ? "Waiting for opponent..." 
                      : rematchDeclined 
                        ? "Rematch declined - Returning to menu..." 
                        : "Request Rematch"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={showRematchDialog} onOpenChange={setShowRematchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rematch Request</AlertDialogTitle>
            <AlertDialogDescription>
              Your opponent wants to play again. Would you like to accept?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRematchDecline}>
              Decline
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRematchAccept}>
              Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {rematchDeclined && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.05) 0%, transparent 70%)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-card p-4 rounded-lg shadow-lg text-center">
              <p className="text-red-500 font-medium">Rematch Declined</p>
              <p className="text-sm text-muted-foreground">Returning to menu...</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}