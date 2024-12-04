import GameMenu from '@/components/game-menu';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center p-4">
      <GameMenu />
    </div>
  );
}