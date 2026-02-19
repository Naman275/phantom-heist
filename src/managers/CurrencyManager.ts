// ============================================================
// Currency Manager — Coins & Gems
// ============================================================
import { SaveManager } from './SaveManager';

export class CurrencyManager {
  private static instance: CurrencyManager;
  private save: SaveManager;

  private constructor() {
    this.save = SaveManager.getInstance();
  }

  static getInstance(): CurrencyManager {
    if (!CurrencyManager.instance) {
      CurrencyManager.instance = new CurrencyManager();
    }
    return CurrencyManager.instance;
  }

  getCoins(): number {
    return this.save.getData().coins;
  }

  getGems(): number {
    return this.save.getData().gems;
  }

  addCoins(amount: number): void {
    const data = this.save.getData();
    data.coins = Math.max(0, data.coins + amount);
    this.save.save();
  }

  spendCoins(amount: number): boolean {
    const data = this.save.getData();
    if (data.coins >= amount) {
      data.coins -= amount;
      this.save.save();
      return true;
    }
    return false;
  }

  addGems(amount: number): void {
    const data = this.save.getData();
    data.gems = Math.max(0, data.gems + amount);
    this.save.save();
  }

  spendGems(amount: number): boolean {
    const data = this.save.getData();
    if (data.gems >= amount) {
      data.gems -= amount;
      this.save.save();
      return true;
    }
    return false;
  }

  canAffordCoins(amount: number): boolean {
    return this.save.getData().coins >= amount;
  }

  canAffordGems(amount: number): boolean {
    return this.save.getData().gems >= amount;
  }
}
