"use client";

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GameBoardProps {
  board: string[];
  size: number;
  onMove: (position: number) => void;
  lastMove: number;
  winner: string | null;
}

export default function GameBoard({ board, size, onMove, lastMove, winner }: GameBoardProps) {
  const getCellSize = () => {
    switch (size) {
      case 3: return 'h-24 w-24';
      case 4: return 'h-20 w-20';
      case 5: return 'h-16 w-16';
      default: return 'h-24 w-24';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 3: return 'text-4xl';
      case 4: return 'text-3xl';
      case 5: return 'text-2xl';
      default: return 'text-4xl';
    }
  };

  return (
    <div
      className="grid gap-2 mx-auto"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
      }}
    >
      {board.map((cell, index) => (
        <motion.button
          key={index}
          className={cn(
            getCellSize(),
            "bg-card border-2 rounded-lg flex items-center justify-center",
            "hover:bg-accent/50 transition-colors duration-200",
            "disabled:opacity-100 disabled:cursor-not-allowed",
            cell && "cursor-not-allowed",
            lastMove === index && "border-primary"
          )}
          disabled={!!cell || !!winner}
          onClick={() => onMove(index)}
          whileHover={{ scale: cell ? 1 : 1.05 }}
          whileTap={{ scale: cell ? 1 : 0.95 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {cell && (
            <motion.span
              className={cn(
                getFontSize(),
                "font-bold",
                cell === 'X' ? 'text-blue-500' : 'text-red-500'
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
            >
              {cell}
            </motion.span>
          )}
        </motion.button>
      ))}
    </div>
  );
}