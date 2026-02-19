// ============================================================
// Vault Manager — Create, Save, Load Vaults
// ============================================================
import { SaveManager } from './SaveManager';
import {
  VaultData, VaultCell, CellType, TrapType,
  GRID_COLS, GRID_ROWS, createEmptyGrid, createTutorialVault,
} from '../config/constants';

export class VaultManager {
  private static instance: VaultManager;
  private save: SaveManager;
  private myVaults: VaultData[] = [];
  private communityVaults: VaultData[] = [];

  private constructor() {
    this.save = SaveManager.getInstance();
    this.loadAllVaults();
  }

  static getInstance(): VaultManager {
    if (!VaultManager.instance) {
      VaultManager.instance = new VaultManager();
    }
    return VaultManager.instance;
  }

  private loadAllVaults(): void {
    const saved = this.save.loadVaults();
    if (saved.length > 0) {
      this.myVaults = saved.filter((v: VaultData) => v.creatorId === this.save.getData().playerId);
    }
    // Add sample community vaults if none exist
    if (this.communityVaults.length === 0) {
      this.communityVaults = this.generateSampleVaults();
    }
  }

  getMyVaults(): VaultData[] {
    return this.myVaults;
  }

  getCommunityVaults(): VaultData[] {
    return [...this.communityVaults, ...this.myVaults.filter(v => v.published)];
  }

  getVaultById(id: string): VaultData | undefined {
    return this.myVaults.find(v => v.id === id)
      || this.communityVaults.find(v => v.id === id);
  }

  createNewVault(name: string): VaultData {
    const vault: VaultData = {
      id: 'vault_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name,
      creatorId: this.save.getData().playerId,
      creatorName: this.save.getData().playerName,
      grid: createEmptyGrid(),
      createdAt: Date.now(),
      stats: { attempts: 0, successes: 0, bestTime: 0, totalCoinsStolen: 0 },
      published: false,
      difficulty: 1,
    };
    this.myVaults.push(vault);
    this.saveMyVaults();
    return vault;
  }

  saveVault(vault: VaultData): void {
    const idx = this.myVaults.findIndex(v => v.id === vault.id);
    if (idx >= 0) {
      this.myVaults[idx] = vault;
    } else {
      this.myVaults.push(vault);
    }
    this.saveMyVaults();
  }

  deleteVault(id: string): void {
    this.myVaults = this.myVaults.filter(v => v.id !== id);
    this.saveMyVaults();
  }

  publishVault(id: string): boolean {
    const vault = this.myVaults.find(v => v.id === id);
    if (vault) {
      // Validate vault has entrance path and at least 1 trap
      if (this.validateVault(vault)) {
        vault.published = true;
        vault.difficulty = this.calculateDifficulty(vault);
        this.saveMyVaults();
        return true;
      }
    }
    return false;
  }

  validateVault(vault: VaultData): boolean {
    let hasTrap = false;
    let hasPlatform = false;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = vault.grid[r][c];
        if (cell.trapType) hasTrap = true;
        if (cell.cellType === CellType.PLATFORM) hasPlatform = true;
      }
    }
    return hasTrap && hasPlatform;
  }

  calculateDifficulty(vault: VaultData): number {
    let score = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = vault.grid[r][c];
        if (cell.trapType) {
          switch (cell.trapType) {
            case TrapType.SPIKES: score += 1; break;
            case TrapType.LASER: score += 2; break;
            case TrapType.SPRING: score += 1; break;
            case TrapType.FAKE_FLOOR: score += 2; break;
            case TrapType.TURRET: score += 3; break;
            case TrapType.SAW_BLADE: score += 4; break;
          }
        }
      }
    }
    if (score <= 3) return 1;
    if (score <= 8) return 2;
    if (score <= 15) return 3;
    if (score <= 25) return 4;
    return 5;
  }

  recordRaidAttempt(vaultId: string, success: boolean, time: number, coins: number): void {
    const vault = this.getVaultById(vaultId);
    if (vault) {
      vault.stats.attempts++;
      if (success) {
        vault.stats.successes++;
        vault.stats.totalCoinsStolen += coins;
        if (vault.stats.bestTime === 0 || time < vault.stats.bestTime) {
          vault.stats.bestTime = time;
        }
      }
      this.saveVault(vault);
    }
  }

  private saveMyVaults(): void {
    this.save.saveVaults(this.myVaults);
  }

  private generateSampleVaults(): VaultData[] {
    const vaults: VaultData[] = [createTutorialVault()];

    // Sample vault 2: The Gauntlet
    const grid2 = createEmptyGrid();
    // Create multi-level platform layout
    for (let c = 1; c < 9; c++) grid2[6][c] = { cellType: CellType.PLATFORM, trapType: null };
    for (let c = 2; c < 8; c++) grid2[4][c] = { cellType: CellType.PLATFORM, trapType: null };
    for (let c = 3; c < 9; c++) grid2[2][c] = { cellType: CellType.PLATFORM, trapType: null };
    // Traps
    grid2[7][2].trapType = TrapType.SPIKES;
    grid2[7][5].trapType = TrapType.SPIKES;
    grid2[7][7].trapType = TrapType.SPIKES;
    grid2[6][4] = { cellType: CellType.PLATFORM, trapType: TrapType.LASER };
    grid2[4][6] = { cellType: CellType.PLATFORM, trapType: TrapType.TURRET };
    grid2[2][5] = { cellType: CellType.PLATFORM, trapType: TrapType.SAW_BLADE };

    vaults.push({
      id: 'sample_gauntlet',
      name: 'The Gauntlet',
      creatorId: 'system',
      creatorName: 'Vault Master',
      grid: grid2,
      createdAt: Date.now() - 86400000,
      stats: { attempts: 47, successes: 12, bestTime: 18500, totalCoinsStolen: 340 },
      published: true,
      difficulty: 3,
    });

    // Sample vault 3: Deception
    const grid3 = createEmptyGrid();
    for (let c = 0; c < 10; c++) grid3[5][c] = { cellType: CellType.PLATFORM, trapType: null };
    grid3[5][3] = { cellType: CellType.PLATFORM, trapType: TrapType.FAKE_FLOOR };
    grid3[5][6] = { cellType: CellType.PLATFORM, trapType: TrapType.FAKE_FLOOR };
    grid3[3][4] = { cellType: CellType.PLATFORM, trapType: null };
    grid3[3][5] = { cellType: CellType.PLATFORM, trapType: null };
    grid3[7][2].trapType = TrapType.SPIKES;
    grid3[7][3].trapType = TrapType.SPIKES;
    grid3[7][5].trapType = TrapType.SPIKES;
    grid3[7][6].trapType = TrapType.SPIKES;

    vaults.push({
      id: 'sample_deception',
      name: 'Deception',
      creatorId: 'system',
      creatorName: 'Trickster',
      grid: grid3,
      createdAt: Date.now() - 172800000,
      stats: { attempts: 89, successes: 23, bestTime: 12300, totalCoinsStolen: 580 },
      published: true,
      difficulty: 4,
    });

    return vaults;
  }
}
