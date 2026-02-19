// ============================================================
// Vault Select Scene — Choose a vault to raid
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS, VaultData } from '../config/constants';
import { Button } from '../ui/Button';
import { HUD } from '../ui/HUD';
import { VaultManager } from '../managers/VaultManager';
import { EnergyManager } from '../managers/EnergyManager';
import { VaultService } from '../firebase/vaultService';
import { SaveManager } from '../managers/SaveManager';

export class VaultSelectScene extends Phaser.Scene {
  private hud!: HUD;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENES.VAULT_SELECT });
  }

  create(): void {
    this.hud = new HUD(this);

    this.add.text(GAME_WIDTH / 2, 70, '🎯 SELECT A VAULT TO RAID', {
      fontSize: '18px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back button
    new Button(this, {
      x: 40, y: 68, width: 60, height: 30,
      text: '← Back', fontSize: 12,
      bgColor: COLORS.BG_PANEL,
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });

    // Energy display
    const energy = EnergyManager.getInstance();
    this.add.text(GAME_WIDTH / 2, 95, `Energy: ⚡ ${energy.getEnergy()}/5`, {
      fontSize: '14px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN,
    }).setOrigin(0.5);

    // Show loading while fetching cloud vaults
    this.loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '🔄 Loading vaults...', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5);

    // Fetch cloud vaults, then fall back to local
    this.loadVaults();
  }

  private async loadVaults(): Promise<void> {
    const energy = EnergyManager.getInstance();
    let vaults: VaultData[] = [];

    // Try cloud first
    try {
      const cloudVaults = await VaultService.getInstance().getCommunityVaults(20);
      if (cloudVaults.length > 0) {
        vaults = cloudVaults;
      }
    } catch (e) {
      console.log('Cloud fetch skipped:', e);
    }

    // Merge with local vaults (avoid duplicates)
    const localVaults = VaultManager.getInstance().getCommunityVaults();
    const existingIds = new Set(vaults.map(v => v.id));
    for (const lv of localVaults) {
      if (!existingIds.has(lv.id)) {
        vaults.push(lv);
      }
    }

    // Remove loading text
    if (this.loadingText) this.loadingText.destroy();

    if (vaults.length === 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'No vaults available.\nBuild and publish one first!', {
        fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY, align: 'center',
      }).setOrigin(0.5);
      return;
    }

    // Render vault cards
    const startY = 130;
    const cardH = 90;
    const gap = 10;
    vaults.forEach((vault, i) => {
      const y = startY + i * (cardH + gap) + cardH / 2;
      this.createVaultCard(vault, GAME_WIDTH / 2, y, energy.hasEnergy());
    });
  }

  private createVaultCard(vault: VaultData, x: number, y: number, hasEnergy: boolean): void {
    const cardW = GAME_WIDTH - 40;
    const cardH = 85;
    const completedVaults = SaveManager.getInstance().getData().completedRaidVaults || [];
    const alreadyCompleted = completedVaults.includes(vault.id);

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(alreadyCompleted ? 0x1a3d1a : COLORS.BG_PANEL, 0.9);
    bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 12);
    bg.lineStyle(1, alreadyCompleted ? COLORS.ACCENT_GREEN : COLORS.ACCENT_PURPLE, 0.3);
    bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 12);

    // Vault name
    this.add.text(x - cardW / 2 + 15, y - 25, vault.name, {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE, fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Completed badge
    if (alreadyCompleted) {
      this.add.text(x - cardW / 2 + 15, y - 8, '✅ COMPLETED', {
        fontSize: '11px', fontFamily: 'Arial', color: '#2ecc71', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
    }

    // Creator
    this.add.text(x - cardW / 2 + 15, y + (alreadyCompleted ? 8 : -5), `by ${vault.creatorName}`, {
      fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0, 0.5);

    // Stats
    const successRate = vault.stats.attempts > 0
      ? Math.round((vault.stats.successes / vault.stats.attempts) * 100) : 0;

    this.add.text(x - cardW / 2 + 15, y + 18, `Attempts: ${vault.stats.attempts}  |  Success: ${successRate}%`, {
      fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0, 0.5);

    // Difficulty stars
    const diffStars = '⭐'.repeat(vault.difficulty) + '☆'.repeat(5 - vault.difficulty);
    this.add.text(x - cardW / 2 + 15, y + 32, diffStars, {
      fontSize: '11px',
    }).setOrigin(0, 0.5);

    // Raid button — disabled if already completed or no energy
    if (alreadyCompleted) {
      new Button(this, {
        x: x + cardW / 2 - 55, y: y,
        width: 80, height: 36,
        text: '✅ Done', fontSize: 13,
        bgColor: 0x555555,
        disabled: true,
        onClick: () => {},
      });
    } else {
      new Button(this, {
        x: x + cardW / 2 - 55, y: y,
        width: 80, height: 36,
        text: '⚔️ Raid', fontSize: 13,
        bgColor: hasEnergy ? COLORS.ACCENT_RED : 0x555555,
        disabled: !hasEnergy,
        onClick: () => {
          if (EnergyManager.getInstance().useEnergy()) {
            this.scene.start(SCENES.RAID, { vault, isTest: false });
          }
        },
      });
    }
  }
}
