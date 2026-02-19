// ============================================================
// Energy Manager — Raid Energy with Timed Recharge
// ============================================================
import { SaveManager } from './SaveManager';
import { ENERGY } from '../config/constants';

export class EnergyManager {
  private static instance: EnergyManager;
  private save: SaveManager;

  private constructor() {
    this.save = SaveManager.getInstance();
    this.rechargeOfflineEnergy();
  }

  static getInstance(): EnergyManager {
    if (!EnergyManager.instance) {
      EnergyManager.instance = new EnergyManager();
    }
    return EnergyManager.instance;
  }

  /** Calculate how much energy recharged while the player was offline */
  private rechargeOfflineEnergy(): void {
    const data = this.save.getData();
    const now = Date.now();
    const elapsed = now - data.lastEnergyRecharge;
    const recharged = Math.floor(elapsed / ENERGY.RECHARGE_MS);

    if (recharged > 0 && data.energy < ENERGY.MAX) {
      data.energy = Math.min(ENERGY.MAX, data.energy + recharged);
      data.lastEnergyRecharge = now;
      this.save.save();
    }
  }

  getEnergy(): number {
    this.rechargeCheck();
    return this.save.getData().energy;
  }

  /** Check and apply any pending recharges */
  private rechargeCheck(): void {
    const data = this.save.getData();
    if (data.energy >= ENERGY.MAX) return;

    const now = Date.now();
    const elapsed = now - data.lastEnergyRecharge;
    const recharged = Math.floor(elapsed / ENERGY.RECHARGE_MS);

    if (recharged > 0) {
      data.energy = Math.min(ENERGY.MAX, data.energy + recharged);
      data.lastEnergyRecharge = now - (elapsed % ENERGY.RECHARGE_MS);
      this.save.save();
    }
  }

  /** Time remaining until next energy point (in milliseconds) */
  getTimeToNextRecharge(): number {
    const data = this.save.getData();
    if (data.energy >= ENERGY.MAX) return 0;
    const elapsed = Date.now() - data.lastEnergyRecharge;
    return Math.max(0, ENERGY.RECHARGE_MS - elapsed);
  }

  /** Formatted time string for display */
  getRechargeTimeString(): string {
    const ms = this.getTimeToNextRecharge();
    if (ms <= 0) return 'Full';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  useEnergy(): boolean {
    this.rechargeCheck();
    const data = this.save.getData();
    if (data.energy > 0) {
      data.energy--;
      if (data.energy < ENERGY.MAX) {
        data.lastEnergyRecharge = Date.now();
      }
      this.save.save();
      return true;
    }
    return false;
  }

  refillEnergy(): void {
    const data = this.save.getData();
    data.energy = ENERGY.MAX;
    data.lastEnergyRecharge = Date.now();
    this.save.save();
  }

  hasEnergy(): boolean {
    this.rechargeCheck();
    return this.save.getData().energy > 0;
  }
}
