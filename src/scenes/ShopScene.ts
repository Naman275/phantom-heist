// ============================================================
// Shop Scene — Purchase gems, skins, gadgets
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS, SHOP_ITEMS, ShopItem } from '../config/constants';
import { Button } from '../ui/Button';
import { HUD } from '../ui/HUD';
import { CurrencyManager } from '../managers/CurrencyManager';
import { EnergyManager } from '../managers/EnergyManager';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';

export class ShopScene extends Phaser.Scene {
  private hud!: HUD;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENES.SHOP });
  }

  create(): void {
    this.hud = new HUD(this);

    this.add.text(GAME_WIDTH / 2, 70, '🏪 SHOP', {
      fontSize: '24px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back button
    new Button(this, {
      x: 40, y: 68, width: 60, height: 30,
      text: '← Back', fontSize: 12,
      bgColor: COLORS.BG_PANEL,
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });

    // Status text
    this.statusText = this.add.text(GAME_WIDTH / 2, 95, '', {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN,
    }).setOrigin(0.5);

    // ---- Gem Purchase Section ----
    this.add.text(GAME_WIDTH / 2, 125, '💎 BUY GEMS', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN, fontStyle: 'bold',
    }).setOrigin(0.5);

    const gemPacks = [
      { gems: 50, price: '$0.99', id: 'gem_50' },
      { gems: 150, price: '$2.99', id: 'gem_150' },
      { gems: 500, price: '$7.99', id: 'gem_500' },
      { gems: 1200, price: '$14.99', id: 'gem_1200' },
    ];

    gemPacks.forEach((pack, i) => {
      const x = 60 + (i % 2) * (GAME_WIDTH / 2);
      const y = 165 + Math.floor(i / 2) * 55;
      this.createGemPackCard(x, y, pack);
    });

    // ---- Items Section ----
    this.add.text(GAME_WIDTH / 2, 290, '🎒 ITEMS', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN, fontStyle: 'bold',
    }).setOrigin(0.5);

    let itemY = 320;
    SHOP_ITEMS.forEach((item) => {
      this.createItemCard(item, GAME_WIDTH / 2, itemY);
      itemY += 60;
    });
  }

  private createGemPackCard(x: number, y: number, pack: { gems: number; price: string; id: string }): void {
    const cardW = GAME_WIDTH / 2 - 30;

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_PANEL, 0.9);
    bg.fillRoundedRect(x - 10, y - 18, cardW, 42, 10);

    this.add.text(x + 5, y, `💎 ${pack.gems}`, {
      fontSize: '14px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN, fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    new Button(this, {
      x: x + cardW - 50, y: y,
      width: 65, height: 30,
      text: pack.price, fontSize: 12,
      bgColor: COLORS.ACCENT_GREEN,
      onClick: () => {
        // In a real app, this would trigger Google Play Billing
        this.statusText.setText(`Purchase ${pack.gems} gems — coming soon!`);
        this.statusText.setColor('#f39c12');
        this.time.delayedCall(2000, () => this.statusText.setText(''));
      },
    });
  }

  private createItemCard(item: ShopItem, x: number, y: number): void {
    const cardW = GAME_WIDTH - 40;
    const cardH = 50;

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_PANEL, 0.8);
    bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);

    // Item name
    this.add.text(x - cardW / 2 + 15, y - 8, item.name, {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE, fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Description
    this.add.text(x - cardW / 2 + 15, y + 10, item.description, {
      fontSize: '10px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0, 0.5);

    // Buy button
    const owned = this.isOwned(item);
    new Button(this, {
      x: x + cardW / 2 - 55, y: y,
      width: 80, height: 32,
      text: owned ? 'Owned' : `💎 ${item.gemCost}`,
      fontSize: 12,
      bgColor: owned ? 0x555555 : COLORS.ACCENT_PURPLE,
      disabled: owned,
      onClick: () => this.purchaseItem(item),
    });
  }

  private isOwned(item: ShopItem): boolean {
    const data = SaveManager.getInstance().getData();
    if (item.type === 'skin') return data.unlockedSkins.includes(item.id);
    if (item.type === 'vault_theme') return data.unlockedVaultThemes.includes(item.id);
    return false;
  }

  private purchaseItem(item: ShopItem): void {
    const currency = CurrencyManager.getInstance();

    if (!currency.canAffordGems(item.gemCost)) {
      this.statusText.setText('Not enough gems! 💎');
      this.statusText.setColor('#ff4444');
      this.time.delayedCall(2000, () => this.statusText.setText(''));
      return;
    }

    currency.spendGems(item.gemCost);

    switch (item.type) {
      case 'coins':
        currency.addCoins(item.value || 0);
        break;
      case 'energy':
        EnergyManager.getInstance().refillEnergy();
        break;
      case 'skin': {
        const data = SaveManager.getInstance().getData();
        if (!data.unlockedSkins.includes(item.id)) {
          data.unlockedSkins.push(item.id);
          data.activeSkin = item.id;
          SaveManager.getInstance().save();
        }
        break;
      }
      case 'vault_theme': {
        const data = SaveManager.getInstance().getData();
        if (!data.unlockedVaultThemes.includes(item.id)) {
          data.unlockedVaultThemes.push(item.id);
          data.activeVaultTheme = item.id;
          SaveManager.getInstance().save();
        }
        break;
      }
      case 'gadget_pack': {
        const data = SaveManager.getInstance().getData();
        const val = item.value || 1;
        data.gadgetInventory.shield = (data.gadgetInventory.shield || 0) + val;
        data.gadgetInventory.slowmo = (data.gadgetInventory.slowmo || 0) + val;
        data.gadgetInventory.scanner = (data.gadgetInventory.scanner || 0) + val;
        SaveManager.getInstance().save();
        break;
      }
    }

    AudioManager.getInstance().playSuccess();
    this.statusText.setText(`✅ Purchased ${item.name}!`);
    this.statusText.setColor('#2ecc71');
    this.hud.refresh();

    // Rebuild scene to update owned status
    this.time.delayedCall(1000, () => this.scene.restart());
  }
}
