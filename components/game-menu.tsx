"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createGame } from '@/lib/game';
import { useRouter } from 'next/navigation';
import { Gamepad2, Users2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function GameMenu() {
  const [size, setSize] = useState('3');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateGame = async (mode: 'multiplayer' | 'ai') => {
    setIsLoading(true);
    try {
      const gameId = await createGame(parseInt(size));
      router.push(`/game/${gameId}?mode=${mode}`);
      toast({
        title: "Game created",
        description: "Share the link with your friend to start playing.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Failed to create game",
        description: "Please check your Appwrite configuration and try again.",
        variant: "destructive",
      });
      console.error('Error creating game:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-[350px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Tic Tac Toe</CardTitle>
          <CardDescription className="text-center">Choose your game mode and board size</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Board Size</label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue placeholder="Select board size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3x3 Classic</SelectItem>
                <SelectItem value="4">4x4 Extended</SelectItem>
                <SelectItem value="5">5x5 Challenge</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <Button
              variant="default"
              onClick={() => handleCreateGame('multiplayer')}
              disabled={isLoading}
              className="w-full"
            >
              <Users2 className="mr-2 h-4 w-4" />
              Play with Friend
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => handleCreateGame('ai')}
              disabled={isLoading}
              className="w-full"
            >
              <Gamepad2 className="mr-2 h-4 w-4" />
              Play with AI
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}