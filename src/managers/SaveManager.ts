// ============================================================
// Save Manager — Local persistence via localStorage
// ============================================================

export interface PlayerSaveData {
  playerId: string;
  playerName: string;
  coins: number;
  gems: number;
  xp: number;
  level: number;
  energy: number;
  lastEnergyRecharge: number;
  loginStreak: number;
  lastLoginDate: string;
  lastDailyRewardDate: string;
  totalRaids: number;
  totalSuccessfulRaids: number;
  totalDefenses: number;
  totalSuccessfulDefenses: number;
  unlockedSkins: string[];
  activeSkin: string;
  unlockedVaultThemes: string[];
  activeVaultTheme: string;
  gadgetInventory: Record<string, number>;
  tutorialCompleted: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  createdAt: number;
}

const SAVE_KEY = 'phantom_heist_save';
const VAULTS_KEY = 'phantom_heist_vaults';
const REPLAYS_KEY = 'phantom_heist_replays';

export class SaveManager {
  private static instance: SaveManager;
  private data: PlayerSaveData;

  private constructor() {
    this.data = this.load();
  }

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  private generateId(): string {
    return 'player_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  private getDefaultData(): PlayerSaveData {
    return {
      playerId: this.generateId(),
      playerName: 'Phantom_' + Math.floor(Math.random() * 9999),
      coins: 29834,
      gems: 20,
      xp: 0,
      level: 1,
      energy: 5,
      lastEnergyRecharge: Date.now(),
      loginStreak: 0,
      lastLoginDate: '',
      lastDailyRewardDate: '',
      totalRaids: 0,
      totalSuccessfulRaids: 0,
      totalDefenses: 0,
      totalSuccessfulDefenses: 0,
      unlockedSkins: ['default'],
      activeSkin: 'default',
      unlockedVaultThemes: ['default'],
      activeVaultTheme: 'default',
      gadgetInventory: { shield: 3, slowmo: 1, scanner: 1 },
      tutorialCompleted: false,
      soundEnabled: true,
      musicEnabled: true,
      createdAt: Date.now(),
    };
  }

  private load(): PlayerSaveData {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new fields
        return { ...this.getDefaultData(), ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load save data:', e);
    }
    return this.getDefaultData();
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save data:', e);
    }
  }

  getData(): PlayerSaveData {
    return this.data;
  }

  updateData(partial: Partial<PlayerSaveData>): void {
    Object.assign(this.data, partial);
    this.save();
  }

  // ---- Vault Storage ----
  saveVaults(vaults: any[]): void {
    try {
      localStorage.setItem(VAULTS_KEY, JSON.stringify(vaults));
    } catch (e) {
      console.warn('Failed to save vaults:', e);
    }
  }

  loadVaults(): any[] {
    try {
      const saved = localStorage.getItem(VAULTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load vaults:', e);
    }
    return [];
  }

  // ---- Replay Storage ----
  saveReplays(replays: any[]): void {
    try {
      // Keep only last 20 replays
      const trimmed = replays.slice(-20);
      localStorage.setItem(REPLAYS_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save replays:', e);
    }
  }

  loadReplays(): any[] {
    try {
      const saved = localStorage.getItem(REPLAYS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load replays:', e);
    }
    return [];
  }

  resetAll(): void {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(VAULTS_KEY);
    localStorage.removeItem(REPLAYS_KEY);
    this.data = this.getDefaultData();
  }
}
