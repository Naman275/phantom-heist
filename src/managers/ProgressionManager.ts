// ============================================================
// Progression Manager — XP, Levels, Titles
// ============================================================
import { SaveManager } from './SaveManager';
import { PROGRESSION } from '../config/constants';

export class ProgressionManager {
  private static instance: ProgressionManager;
  private save: SaveManager;

  private constructor() {
    this.save = SaveManager.getInstance();
  }

  static getInstance(): ProgressionManager {
    if (!ProgressionManager.instance) {
      ProgressionManager.instance = new ProgressionManager();
    }
    return ProgressionManager.instance;
  }

  getLevel(): number {
    return this.save.getData().level;
  }

  getXP(): number {
    return this.save.getData().xp;
  }

  getTitle(): string {
    const level = this.getLevel();
    return PROGRESSION.TITLE_BY_LEVEL[Math.min(level - 1, PROGRESSION.TITLE_BY_LEVEL.length - 1)];
  }

  getXPForCurrentLevel(): number {
    const level = this.getLevel();
    if (level >= PROGRESSION.MAX_LEVEL) return 0;
    return PROGRESSION.XP_PER_LEVEL[level] || 99999;
  }

  getXPProgress(): number {
    const level = this.getLevel();
    if (level >= PROGRESSION.MAX_LEVEL) return 1;
    const currentLevelXP = PROGRESSION.XP_PER_LEVEL[level - 1] || 0;
    const nextLevelXP = PROGRESSION.XP_PER_LEVEL[level] || 99999;
    const xp = this.getXP();
    return Math.min(1, (xp - currentLevelXP) / (nextLevelXP - currentLevelXP));
  }

  addXP(amount: number): { leveledUp: boolean; newLevel: number } {
    const data = this.save.getData();
    data.xp += amount;

    let leveledUp = false;
    while (
      data.level < PROGRESSION.MAX_LEVEL &&
      data.xp >= (PROGRESSION.XP_PER_LEVEL[data.level] || 99999)
    ) {
      data.level++;
      leveledUp = true;
    }

    this.save.save();
    return { leveledUp, newLevel: data.level };
  }

  getStats() {
    const data = this.save.getData();
    return {
      totalRaids: data.totalRaids,
      totalSuccessfulRaids: data.totalSuccessfulRaids,
      totalDefenses: data.totalDefenses,
      totalSuccessfulDefenses: data.totalSuccessfulDefenses,
      raidSuccessRate: data.totalRaids > 0
        ? Math.round((data.totalSuccessfulRaids / data.totalRaids) * 100) : 0,
      defenseSuccessRate: data.totalDefenses > 0
        ? Math.round((data.totalSuccessfulDefenses / data.totalDefenses) * 100) : 0,
    };
  }

  recordRaid(success: boolean): void {
    const data = this.save.getData();
    data.totalRaids++;
    if (success) data.totalSuccessfulRaids++;
    this.save.save();
  }

  recordDefense(success: boolean): void {
    const data = this.save.getData();
    data.totalDefenses++;
    if (success) data.totalSuccessfulDefenses++;
    this.save.save();
  }
}
