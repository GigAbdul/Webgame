export type Role = 'USER' | 'ADMIN';
export type LevelStatus = 'DRAFT' | 'SUBMITTED' | 'OFFICIAL' | 'ARCHIVED';
export type Difficulty =
  | 'EASY'
  | 'NORMAL'
  | 'HARD'
  | 'HARDER'
  | 'INSANE'
  | 'DEMON'
  | 'EASY_DEMON'
  | 'MEDIUM_DEMON'
  | 'HARD_DEMON'
  | 'INSANE_DEMON'
  | 'EXTREME_DEMON';
export type LevelObjectType =
  | 'GROUND_BLOCK'
  | 'HALF_GROUND_BLOCK'
  | 'PLATFORM_BLOCK'
  | 'HALF_PLATFORM_BLOCK'
  | 'SPIKE'
  | 'SAW_BLADE'
  | 'JUMP_PAD'
  | 'JUMP_ORB'
  | 'GRAVITY_PORTAL'
  | 'SPEED_PORTAL'
  | 'SHIP_PORTAL'
  | 'CUBE_PORTAL'
  | 'FINISH_PORTAL'
  | 'MOVE_TRIGGER'
  | 'ALPHA_TRIGGER'
  | 'TOGGLE_TRIGGER'
  | 'PULSE_TRIGGER'
  | 'DECORATION_BLOCK'
  | 'START_MARKER'
  | 'START_POS';

export type LevelObject = {
  id: string;
  type: LevelObjectType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  layer: 'gameplay' | 'decoration';
  props: Record<string, unknown>;
};

export type LevelColorGroup = {
  id: number;
  fillColor: string;
  strokeColor: string;
};

export type LevelData = {
  meta: {
    gridSize: number;
    lengthUnits: number;
    theme: string;
    background: string;
    music: string;
    musicLabel?: string;
    musicOffsetMs?: number;
    version: number;
    colorGroups?: LevelColorGroup[];
  };
  player: {
    startX: number;
    startY: number;
    mode: 'cube' | 'ship';
    baseSpeed: number;
    gravity: number;
  };
  objects: LevelObject[];
  finish: {
    x: number;
    y: number;
  };
};

export type User = {
  id: string;
  username: string;
  email: string;
  role: Role;
  totalStars: number;
  completedOfficialLevels: number;
  createdAt?: string;
};

export type Level = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: LevelStatus;
  difficulty: Difficulty | null;
  starsReward: number;
  isOfficial: boolean;
  theme: string;
  featured: boolean;
  isVisible: boolean;
  dataJson: LevelData;
  versionNumber: number;
  publishedAt?: string | null;
  updatedAt: string;
  createdAt: string;
  author?: {
    id: string;
    username: string;
  };
  publishedBy?: {
    id: string;
    username: string;
  } | null;
};

export type LeaderboardEntry = {
  rank: number;
  id: string;
  username: string;
  totalStars: number;
  completedOfficialLevels: number;
  createdAt?: string;
};

export type ProfileResponse = {
  user: User;
  levels: Array<{
    id: string;
    title: string;
    status: LevelStatus;
    isOfficial: boolean;
    starsReward: number;
    updatedAt: string;
  }>;
  recentRewards: Array<{
    starsAwarded: number;
    awardedAt: string;
    level: {
      id: string;
      title: string;
      slug: string;
    };
  }>;
};

