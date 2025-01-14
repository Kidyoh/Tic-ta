'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function JoinGameForm() {
  const [gameId, setGameId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!gameId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a game ID',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      router.push(`/game/${gameId}?mode=multiplayer&player=O`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join game. Please check the game ID.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Join Game</CardTitle>
        <CardDescription>Enter a game ID to join an existing game</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Enter Game ID"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Joining...' : 'Join Game'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}