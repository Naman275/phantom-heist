// ============================================================
// Profile Scene — Player stats, level, achievements
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';
import { Button } from '../ui/Button';
import { SaveManager } from '../managers/SaveManager';
import { ProgressionManager } from '../managers/ProgressionManager';
import { CurrencyManager } from '../managers/CurrencyManager';

export class ProfileScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.PROFILE });
  }

  create(): void {
    const save = SaveManager.getInstance().getData();
    const prog = ProgressionManager.getInstance();
    const stats = prog.getStats();

    // Back button
    new Button(this, {
      x: 40, y: 40, width: 60, height: 30,
      text: '← Back', fontSize: 12,
      bgColor: COLORS.BG_PANEL,
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });

    // ---- Profile Header ----
    // Avatar circle
    const avatarG = this.add.graphics();
    avatarG.fillStyle(COLORS.ACCENT_CYAN, 1);
    avatarG.fillCircle(GAME_WIDTH / 2, 100, 40);
    avatarG.fillStyle(COLORS.BG_DARK, 1);
    avatarG.fillCircle(GAME_WIDTH / 2, 100, 36);
    avatarG.fillStyle(COLORS.ACCENT_CYAN, 1);
    avatarG.fillCircle(GAME_WIDTH / 2, 100, 32);

    this.add.text(GAME_WIDTH / 2, 100, '👻', { fontSize: '32px' }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 152, save.playerName, {
      fontSize: '22px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 176, `Level ${prog.getLevel()} — ${prog.getTitle()}`, {
      fontSize: '14px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN,
    }).setOrigin(0.5);

    // XP Progress Bar
    const xpBarW = 250;
    const xpBarX = GAME_WIDTH / 2 - xpBarW / 2;
    const xpBarY = 196;
    const xpProgress = prog.getXPProgress();

    const xpBg = this.add.graphics();
    xpBg.fillStyle(0x333333, 0.8);
    xpBg.fillRoundedRect(xpBarX, xpBarY, xpBarW, 12, 6);
    xpBg.fillStyle(COLORS.ACCENT_CYAN, 1);
    xpBg.fillRoundedRect(xpBarX, xpBarY, Math.max(12, xpBarW * xpProgress), 12, 6);

    this.add.text(GAME_WIDTH / 2, xpBarY + 24, `${prog.getXP()} / ${prog.getXPForCurrentLevel()} XP`, {
      fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5);

    // ---- Stats Panel ----
    const panelY = 260;
    const panelW = GAME_WIDTH - 40;
    const panelH = 280;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.BG_PANEL, 0.9);
    panelBg.fillRoundedRect(20, panelY, panelW, panelH, 16);

    this.add.text(GAME_WIDTH / 2, panelY + 25, '📊 CAREER STATS', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    const statItems = [
      { label: 'Total Raids', value: stats.totalRaids.toString(), icon: '⚔️' },
      { label: 'Successful Raids', value: stats.totalSuccessfulRaids.toString(), icon: '✅' },
      { label: 'Raid Success Rate', value: `${stats.raidSuccessRate}%`, icon: '📈' },
      { label: 'Vaults Defended', value: stats.totalDefenses.toString(), icon: '🛡️' },
      { label: 'Defense Success', value: `${stats.defenseSuccessRate}%`, icon: '💪' },
      { label: 'Total Coins Earned', value: this.formatNumber(save.coins), icon: '🪙' },
      { label: 'Login Streak', value: `${save.loginStreak} days`, icon: '🔥' },
      { label: 'Member Since', value: new Date(save.createdAt).toLocaleDateString(), icon: '📅' },
    ];

    statItems.forEach((stat, i) => {
      const y = panelY + 55 + i * 28;
      this.add.text(35, y, `${stat.icon} ${stat.label}`, {
        fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
      }).setOrigin(0, 0.5);
      this.add.text(GAME_WIDTH - 35, y, stat.value, {
        fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
      }).setOrigin(1, 0.5);
    });

    // ---- Inventory Section ----
    const invY = panelY + panelH + 20;
    const invBg = this.add.graphics();
    invBg.fillStyle(COLORS.BG_PANEL, 0.9);
    invBg.fillRoundedRect(20, invY, panelW, 120, 16);

    this.add.text(GAME_WIDTH / 2, invY + 22, '🎒 GADGET INVENTORY', {
      fontSize: '14px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    const gadgets = [
      { name: 'Shield', icon: '🛡️', count: save.gadgetInventory.shield || 0 },
      { name: 'Time Warp', icon: '⏳', count: save.gadgetInventory.slowmo || 0 },
      { name: 'Scanner', icon: '🔍', count: save.gadgetInventory.scanner || 0 },
    ];

    gadgets.forEach((gadget, i) => {
      const x = 80 + i * 130;
      this.add.text(x, invY + 55, gadget.icon, { fontSize: '24px' }).setOrigin(0.5);
      this.add.text(x, invY + 78, gadget.name, {
        fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
      }).setOrigin(0.5);
      this.add.text(x, invY + 95, `×${gadget.count}`, {
        fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN, fontStyle: 'bold',
      }).setOrigin(0.5);
    });

    // ---- Skins Section ----
    const skinsY = invY + 140;
    const skinsBg = this.add.graphics();
    skinsBg.fillStyle(COLORS.BG_PANEL, 0.9);
    skinsBg.fillRoundedRect(20, skinsY, panelW, 70, 16);

    this.add.text(GAME_WIDTH / 2, skinsY + 22, '🎭 UNLOCKED SKINS', {
      fontSize: '14px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, skinsY + 48, save.unlockedSkins.join(' • '), {
      fontSize: '12px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
    }).setOrigin(0.5);
  }

  private formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }
}
