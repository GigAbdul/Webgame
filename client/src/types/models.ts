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
  | 'GROUND_BLOCK_TOP'
  | 'GROUND_BLOCK_TOP_BOTTOM'
  | 'GROUND_BLOCK_TOP_LEFT'
  | 'GROUND_BLOCK_TOP_RIGHT'
  | 'GROUND_BLOCK_PASS'
  | 'HALF_GROUND_BLOCK'
  | 'PLATFORM_BLOCK'
  | 'PLATFORM_BLOCK_TOP'
  | 'PLATFORM_BLOCK_TOP_BOTTOM'
  | 'PLATFORM_BLOCK_TOP_LEFT'
  | 'PLATFORM_BLOCK_TOP_RIGHT'
  | 'PLATFORM_BLOCK_PASS'
  | 'HALF_PLATFORM_BLOCK'
  | 'ARROW_RAMP_ASC'
  | 'ARROW_RAMP_DESC'
  | 'DASH_BLOCK'
  | 'SPIKE'
  | 'SPIKE_FLAT'
  | 'SPIKE_SMALL'
  | 'SPIKE_TINY'
  | 'SAW_BLADE'
  | 'SAW_BLADE_MEDIUM'
  | 'SAW_BLADE_LARGE'
  | 'SAW_STAR'
  | 'SAW_STAR_MEDIUM'
  | 'SAW_STAR_LARGE'
  | 'SAW_GEAR'
  | 'SAW_GEAR_MEDIUM'
  | 'SAW_GEAR_LARGE'
  | 'SAW_GLOW'
  | 'SAW_GLOW_MEDIUM'
  | 'SAW_GLOW_LARGE'
  | 'JUMP_PAD'
  | 'JUMP_ORB'
  | 'BLUE_ORB'
  | 'GRAVITY_ORB'
  | 'GRAVITY_PORTAL'
  | 'SPEED_PORTAL'
  | 'SHIP_PORTAL'
  | 'BALL_PORTAL'
  | 'CUBE_PORTAL'
  | 'ARROW_PORTAL'
  | 'FINISH_PORTAL'
  | 'MOVE_TRIGGER'
  | 'ALPHA_TRIGGER'
  | 'TOGGLE_TRIGGER'
  | 'PULSE_TRIGGER'
  | 'POST_FX_TRIGGER'
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
  editorLayer: number;
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
    groundColor?: string;
    music: string;
    musicLabel?: string;
    musicOffsetMs?: number;
    version: number;
    colorGroups?: LevelColorGroup[];
  };
  player: {
    startX: number;
    startY: number;
    mode: 'cube' | 'ball' | 'ship' | 'arrow';
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
  officialLevelsAuthored: number;
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

