// ============================================================
// PHANTOM HEIST — Game Constants & Configuration
// ============================================================

// ---- Display ----
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

// ---- Vault Grid ----
export const GRID_COLS = 10;
export const GRID_ROWS = 8;
export const CELL_SIZE = 48;
export const GRID_OFFSET_X = 0;
export const GRID_OFFSET_Y = 60;
export const GRID_WIDTH = GRID_COLS * CELL_SIZE;  // 480
export const GRID_HEIGHT = GRID_ROWS * CELL_SIZE; // 384

// ---- Colors ----
export const COLORS = {
  BG_DARK: 0x1a0a2e,
  BG_PANEL: 0x2d1b4e,
  BG_CELL: 0x3d2b5e,
  BG_CELL_HOVER: 0x5d4b7e,
  ACCENT_GOLD: 0xffd700,
  ACCENT_PURPLE: 0x9b59b6,
  ACCENT_CYAN: 0x00d4ff,
  ACCENT_GREEN: 0x2ecc71,
  ACCENT_RED: 0xe74c3c,
  ACCENT_ORANGE: 0xf39c12,
  TEXT_WHITE: '#ffffff',
  TEXT_GOLD: '#ffd700',
  TEXT_GRAY: '#aaaaaa',
  TEXT_CYAN: '#00d4ff',
  PLATFORM: 0x8b7355,
  PLATFORM_EDGE: 0x6b5335,
  ENTRANCE_GREEN: 0x27ae60,
  EXIT_GOLD: 0xf1c40f,
};

// ---- Trap Types ----
export enum TrapType {
  SPIKES = 'spikes',
  LASER = 'laser',
  SPRING = 'spring',
  FAKE_FLOOR = 'fake_floor',
  TURRET = 'turret',
  SAW_BLADE = 'saw_blade',
}

export interface TrapInfo {
  name: string;
  description: string;
  coinCost: number;
  color: number;
  unlockLevel: number;
  damage: number;
  symbol: string;
}

export const TRAP_DATA: Record<TrapType, TrapInfo> = {
  [TrapType.SPIKES]: {
    name: 'Spikes',
    description: 'Sharp spikes deal damage on contact',
    coinCost: 0,
    color: 0xcc3333,
    unlockLevel: 1,
    damage: 1,
    symbol: '▲',
  },
  [TrapType.LASER]: {
    name: 'Laser Grid',
    description: 'Periodic laser beams sweep the cell',
    coinCost: 50,
    color: 0xff0044,
    unlockLevel: 2,
    damage: 1,
    symbol: '═',
  },
  [TrapType.SPRING]: {
    name: 'Spring Trap',
    description: 'Launches intruders skyward',
    coinCost: 100,
    color: 0x33cc33,
    unlockLevel: 3,
    damage: 0,
    symbol: '⌇',
  },
  [TrapType.FAKE_FLOOR]: {
    name: 'Fake Floor',
    description: 'Looks solid but crumbles when touched',
    coinCost: 150,
    color: 0xcccc33,
    unlockLevel: 4,
    damage: 0,
    symbol: '▒',
  },
  [TrapType.TURRET]: {
    name: 'Auto Turret',
    description: 'Fires projectiles at intruders',
    coinCost: 200,
    color: 0x777777,
    unlockLevel: 5,
    damage: 1,
    symbol: '◉',
  },
  [TrapType.SAW_BLADE]: {
    name: 'Saw Blade',
    description: 'Spinning blade moves back and forth',
    coinCost: 300,
    color: 0xff6600,
    unlockLevel: 7,
    damage: 2,
    symbol: '⚙',
  },
};

// ---- Cell Types ----
export enum CellType {
  EMPTY = 'empty',
  PLATFORM = 'platform',
}

// ---- Vault Data Structures ----
export interface VaultCell {
  cellType: CellType;
  trapType: TrapType | null;
}

export interface VaultData {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  grid: VaultCell[][];
  createdAt: number;
  stats: {
    attempts: number;
    successes: number;
    bestTime: number;
    totalCoinsStolen: number;
  };
  published: boolean;
  difficulty: number;
}

// ---- Player Physics ----
export const PLAYER = {
  SPEED: 180,
  JUMP_VELOCITY: -380,
  GRAVITY: 900,
  MAX_HP: 3,
  WIDTH: 28,
  HEIGHT: 36,
  COLOR: 0x00d4ff,
  INVINCIBLE_MS: 1500,
};

// ---- Gadget Types ----
export enum GadgetType {
  SHIELD = 'shield',
  SLOWMO = 'slowmo',
  SCANNER = 'scanner',
}

export interface GadgetInfo {
  name: string;
  description: string;
  gemCost: number;
  duration: number; // milliseconds
  color: number;
  symbol: string;
  unlockLevel: number;
}

export const GADGET_DATA: Record<GadgetType, GadgetInfo> = {
  [GadgetType.SHIELD]: {
    name: 'Energy Shield',
    description: 'Absorbs one hit of damage',
    gemCost: 5,
    duration: 30000,
    color: 0x3498db,
    symbol: '🛡',
    unlockLevel: 2,
  },
  [GadgetType.SLOWMO]: {
    name: 'Time Warp',
    description: 'Slows all traps for 5 seconds',
    gemCost: 8,
    duration: 5000,
    color: 0x9b59b6,
    symbol: '⏳',
    unlockLevel: 4,
  },
  [GadgetType.SCANNER]: {
    name: 'X-Ray Scanner',
    description: 'Reveals hidden traps for 10 seconds',
    gemCost: 10,
    duration: 10000,
    color: 0x2ecc71,
    symbol: '🔍',
    unlockLevel: 6,
  },
};

// ---- Energy System ----
export const ENERGY = {
  MAX: 5,
  RECHARGE_MINUTES: 30,
  RECHARGE_MS: 30 * 60 * 1000,
  GEM_REFILL_COST: 10,
};

// ---- Currency ----
export const CURRENCY = {
  STARTING_COINS: 200,
  STARTING_GEMS: 20,
  RAID_SUCCESS_COINS: 50,
  RAID_SUCCESS_XP: 30,
  RAID_FAIL_COINS: 5,
  RAID_FAIL_XP: 5,
  DEFEND_SUCCESS_COINS: 20,
  DEFEND_SUCCESS_XP: 15,
  LOOT_COIN_VALUE: 10,
  DAILY_CHALLENGE_COINS: 100,
  DAILY_CHALLENGE_GEMS: 5,
};

// ---- Progression ----
export const PROGRESSION = {
  XP_PER_LEVEL: [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000,
                  7000, 9500, 12500, 16000, 20000, 25000, 31000, 38000, 46000, 55000],
  MAX_LEVEL: 20,
  TITLE_BY_LEVEL: [
    'Rookie Thief', 'Apprentice', 'Prowler', 'Shadow', 'Cat Burglar',
    'Infiltrator', 'Phantom', 'Ghost', 'Master Thief', 'Legend',
    'Vault Breaker', 'Shadow Lord', 'Phantom King', 'Grand Master', 'Overlord',
    'Phantom Elite', 'Heist Lord', 'Shadow Emperor', 'Phantom God', 'The Architect',
  ],
};

// ---- Daily Rewards ----
export const DAILY_REWARDS = {
  STREAK_COINS: [25, 50, 75, 100, 125, 150, 250],
  STREAK_GEMS:  [0,  0,  2,  0,   0,   5,  10],
  STREAK_DAYS: 7,
};

// ---- Scene Keys ----
export const SCENES = {
  BOOT: 'BootScene',
  MAIN_MENU: 'MainMenuScene',
  VAULT_BUILDER: 'VaultBuilderScene',
  RAID: 'RaidScene',
  REPLAY: 'ReplayScene',
  SHOP: 'ShopScene',
  PROFILE: 'ProfileScene',
  DAILY_REWARD: 'DailyRewardScene',
  VAULT_SELECT: 'VaultSelectScene',
};

// ---- Shop Items ----
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  gemCost: number;
  type: 'skin' | 'vault_theme' | 'gadget_pack' | 'energy' | 'coins';
  value?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'coins_500', name: '500 Coins', description: 'A pouch of coins', gemCost: 10, type: 'coins', value: 500 },
  { id: 'coins_2000', name: '2000 Coins', description: 'A chest of coins', gemCost: 35, type: 'coins', value: 2000 },
  { id: 'coins_5000', name: '5000 Coins', description: 'A vault of coins!', gemCost: 75, type: 'coins', value: 5000 },
  { id: 'energy_refill', name: 'Energy Refill', description: 'Full energy recharge', gemCost: 10, type: 'energy', value: 5 },
  { id: 'skin_ninja', name: 'Ninja Outfit', description: 'Silent but deadly', gemCost: 50, type: 'skin' },
  { id: 'skin_robot', name: 'Mech Suit', description: 'Chrome and cool', gemCost: 75, type: 'skin' },
  { id: 'skin_ghost', name: 'Ghost Cloak', description: 'Spectral elegance', gemCost: 100, type: 'skin' },
  { id: 'theme_neon', name: 'Neon Vault', description: 'Cyberpunk vault theme', gemCost: 60, type: 'vault_theme' },
  { id: 'theme_haunted', name: 'Haunted Vault', description: 'Spooky vault theme', gemCost: 60, type: 'vault_theme' },
  { id: 'theme_candy', name: 'Candy Vault', description: 'Sweet vault theme', gemCost: 60, type: 'vault_theme' },
  { id: 'gadget_starter', name: 'Gadget Pack', description: '3 of each gadget', gemCost: 20, type: 'gadget_pack', value: 3 },
];

// ---- Sample Vaults (built-in levels for new players) ----
export function createEmptyGrid(): VaultCell[][] {
  const grid: VaultCell[][] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      // Bottom row is always platform
      grid[row][col] = {
        cellType: row === GRID_ROWS - 1 ? CellType.PLATFORM : CellType.EMPTY,
        trapType: null,
      };
    }
  }
  return grid;
}

export function createTutorialVault(): VaultData {
  const grid = createEmptyGrid();
  // Add some platforms to create a path
  grid[5][2] = { cellType: CellType.PLATFORM, trapType: null };
  grid[5][3] = { cellType: CellType.PLATFORM, trapType: null };
  grid[5][4] = { cellType: CellType.PLATFORM, trapType: null };
  grid[3][5] = { cellType: CellType.PLATFORM, trapType: null };
  grid[3][6] = { cellType: CellType.PLATFORM, trapType: null };
  grid[3][7] = { cellType: CellType.PLATFORM, trapType: null };
  grid[5][8] = { cellType: CellType.PLATFORM, trapType: null };
  // Add spikes
  grid[7][3].trapType = TrapType.SPIKES;
  grid[7][6].trapType = TrapType.SPIKES;

  return {
    id: 'tutorial_1',
    name: 'Training Ground',
    creatorId: 'system',
    creatorName: 'Phantom Guild',
    grid,
    createdAt: Date.now(),
    stats: { attempts: 0, successes: 0, bestTime: 0, totalCoinsStolen: 0 },
    published: true,
    difficulty: 1,
  };
}
