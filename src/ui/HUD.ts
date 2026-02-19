// ============================================================
// HUD — In-game heads-up display (coins, gems, energy, HP)
// ============================================================
import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, ENERGY } from '../config/constants';
import { CurrencyManager } from '../managers/CurrencyManager';
import { EnergyManager } from '../managers/EnergyManager';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private coinText: Phaser.GameObjects.Text;
  private gemText: Phaser.GameObjects.Text;
  private energyText: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(100);

    // HUD background bar
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x000000, 0.6);
    this.bg.fillRect(0, 0, GAME_WIDTH, 48);
    this.container.add(this.bg);

    // Coin icon + text
    const coinIcon = scene.add.text(12, 24, '🪙', { fontSize: '18px' }).setOrigin(0, 0.5);
    this.coinText = scene.add.text(34, 24, '0', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.container.add([coinIcon, this.coinText]);

    // Gem icon + text
    const gemIcon = scene.add.text(130, 24, '💎', { fontSize: '18px' }).setOrigin(0, 0.5);
    this.gemText = scene.add.text(152, 24, '0', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.container.add([gemIcon, this.gemText]);

    // Energy icon + text
    const energyIcon = scene.add.text(250, 24, '⚡', { fontSize: '18px' }).setOrigin(0, 0.5);
    this.energyText = scene.add.text(272, 24, '5/5', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.container.add([energyIcon, this.energyText]);

    this.refresh();
  }

  refresh(): void {
    const currency = CurrencyManager.getInstance();
    const energy = EnergyManager.getInstance();
    this.coinText.setText(this.formatNumber(currency.getCoins()));
    this.gemText.setText(this.formatNumber(currency.getGems()));

    const e = energy.getEnergy();
    const rechargeStr = e < ENERGY.MAX ? ` (${energy.getRechargeTimeString()})` : '';
    this.energyText.setText(`${e}/${ENERGY.MAX}${rechargeStr}`);
  }

  private formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
