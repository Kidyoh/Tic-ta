export interface GameState {
    id: string;
    board: string[];
    currentPlayer: Player;
    winner: Player | 'draw' | null;
    size: number;
    status: GameStatus;
    lastMove: number;
    history: Move[];
  }
  
  export type Player = 'X' | 'O';
  export type GameStatus = 'waiting' | 'playing' | 'finished';
  
  export interface Move {
    player: Player;
    position: number;
  }
  
  export interface AppwriteConfig {
    endpoint: string;
    projectId: string;
    databaseId: string;
    collectionId: string;
  }
  
  