// ============================================================
// Main Menu Scene — Hub for all game modes
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';
import { Button } from '../ui/Button';
import { HUD } from '../ui/HUD';
import { AudioManager } from '../managers/AudioManager';
import { ProgressionManager } from '../managers/ProgressionManager';
import { SaveManager } from '../managers/SaveManager';

export class MainMenuScene extends Phaser.Scene {
  private hud!: HUD;
  private particles: { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[] = [];
  private particleGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SCENES.MAIN_MENU });
  }

  create(): void {
    // Fade in
    this.cameras.main.fadeIn(400, 26, 10, 46);

    const audio = AudioManager.getInstance();
    try { audio.playMenuMusic(); } catch (_) {}

    // ---- Animated background particles ----
    this.particleGraphics = this.add.graphics();
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.8 - 0.2,
        alpha: Math.random() * 0.3 + 0.1,
        size: Math.random() * 3 + 1,
      });
    }

    // ---- Title ----
    this.add.text(GAME_WIDTH / 2, 100, '👻', { fontSize: '56px' }).setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, 160, 'PHANTOM\nHEIST', {
      fontSize: '42px',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.TEXT_GOLD,
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    // Pulsing title animation
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ---- Player Info ----
    const prog = ProgressionManager.getInstance();
    const save = SaveManager.getInstance().getData();

    this.add.text(GAME_WIDTH / 2, 230, `${save.playerName}`, {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 252, `Level ${prog.getLevel()} — ${prog.getTitle()}`, {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN,
    }).setOrigin(0.5);

    // XP bar
    const xpBarW = 200;
    const xpBarX = GAME_WIDTH / 2 - xpBarW / 2;
    const xpBarY = 268;
    const xpProgress = prog.getXPProgress();
    const xpBg = this.add.graphics();
    xpBg.fillStyle(0x333333, 0.8);
    xpBg.fillRoundedRect(xpBarX, xpBarY, xpBarW, 8, 4);
    xpBg.fillStyle(COLORS.ACCENT_CYAN, 1);
    xpBg.fillRoundedRect(xpBarX, xpBarY, Math.max(8, xpBarW * xpProgress), 8, 4);

    // ---- Main Buttons ----
    const btnY = 330;
    const btnGap = 62;

    new Button(this, {
      x: GAME_WIDTH / 2, y: btnY,
      width: 280, height: 52,
      text: '🏗️  BUILD VAULT',
      fontSize: 20,
      bgColor: 0x2980b9,
      hoverColor: 0x3498db,
      onClick: () => {
        audio.stopMusic();
        this.scene.start(SCENES.VAULT_BUILDER);
      },
    });

    new Button(this, {
      x: GAME_WIDTH / 2, y: btnY + btnGap,
      width: 280, height: 52,
      text: '🎯  RAID VAULTS',
      fontSize: 20,
      bgColor: COLORS.ACCENT_RED,
      hoverColor: 0xff6666,
      onClick: () => {
        audio.stopMusic();
        this.scene.start(SCENES.VAULT_SELECT);
      },
    });

    new Button(this, {
      x: GAME_WIDTH / 2, y: btnY + btnGap * 2,
      width: 280, height: 52,
      text: '🏪  SHOP',
      fontSize: 20,
      bgColor: 0xf39c12,
      hoverColor: 0xf1c40f,
      onClick: () => {
        audio.stopMusic();
        this.scene.start(SCENES.SHOP);
      },
    });

    new Button(this, {
      x: GAME_WIDTH / 2, y: btnY + btnGap * 3,
      width: 280, height: 52,
      text: '👤  PROFILE',
      fontSize: 20,
      bgColor: 0x27ae60,
      hoverColor: 0x2ecc71,
      onClick: () => {
        audio.stopMusic();
        this.scene.start(SCENES.PROFILE);
      },
    });

    new Button(this, {
      x: GAME_WIDTH / 2, y: btnY + btnGap * 4,
      width: 280, height: 52,
      text: '📖  HOW TO PLAY',
      fontSize: 20,
      bgColor: 0x8e44ad,
      hoverColor: 0x9b59b6,
      onClick: () => {
        audio.stopMusic();
        this.scene.start('HowToPlayScene');
      },
    });

    new Button(this, {
      x: GAME_WIDTH / 2, y: btnY + btnGap * 5,
      width: 280, height: 52,
      text: '🏆  LEADERBOARD',
      fontSize: 20,
      bgColor: 0xc0392b,
      hoverColor: 0xe74c3c,
      onClick: () => {
        audio.stopMusic();
        this.scene.start('LeaderboardScene');
      },
    });

    // ---- Bottom buttons ----
    new Button(this, {
      x: GAME_WIDTH / 2, y: btnY + btnGap * 6 + 20,
      width: 200, height: 42,
      text: '⚙️  SETTINGS',
      fontSize: 16,
      bgColor: 0x555555,
      onClick: () => {
        audio.stopMusic();
        this.scene.start('SettingsScene');
      },
    });

    // ---- HUD ----
    this.hud = new HUD(this);

    // ---- Version ----
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'v1.2.0 — Phantom Heist', {
      fontSize: '10px', fontFamily: 'Arial', color: '#555555',
    }).setOrigin(0.5);
  }

  update(): void {
    // Animate background particles
    this.particleGraphics.clear();
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = GAME_HEIGHT + 10; p.x = Math.random() * GAME_WIDTH; }
      if (p.x < -10) p.x = GAME_WIDTH + 10;
      if (p.x > GAME_WIDTH + 10) p.x = -10;
      this.particleGraphics.fillStyle(COLORS.ACCENT_GOLD, p.alpha);
      this.particleGraphics.fillCircle(p.x, p.y, p.size);
    }
  }
}
