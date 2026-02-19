// ============================================================
// Settings Scene — Player settings and account management
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';
import { Button } from '../ui/Button';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { AchievementManager, ACHIEVEMENTS } from '../managers/AchievementManager';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(300, 26, 10, 46);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_DARK, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, 36, '⚙️ SETTINGS', {
      fontSize: '22px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    new Button(this, {
      x: 40, y: 36, width: 60, height: 30,
      text: '← Back', fontSize: 12,
      bgColor: COLORS.BG_PANEL,
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });

    const save = SaveManager.getInstance().getData();
    let yPos = 80;

    // ---- Player Name ----
    const namePanel = this.add.graphics();
    namePanel.fillStyle(COLORS.BG_PANEL, 0.9);
    namePanel.fillRoundedRect(20, yPos, GAME_WIDTH - 40, 60, 12);
    this.add.text(35, yPos + 15, '👤 Player Name', {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    });
    this.add.text(35, yPos + 35, save.playerName, {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE, fontStyle: 'bold',
    });
    new Button(this, {
      x: GAME_WIDTH - 60, y: yPos + 30, width: 70, height: 30,
      text: '✏️ Edit', fontSize: 12, bgColor: COLORS.ACCENT_CYAN, textColor: '#1a0a2e',
      onClick: () => {
        const newName = prompt('Enter new name (max 20 chars):', save.playerName);
        if (newName && newName.trim().length > 0 && newName.trim().length <= 20) {
          SaveManager.getInstance().updateData({ playerName: newName.trim() });
          this.scene.restart();
        }
      },
    });
    yPos += 75;

    // ---- Sound & Music ----
    const audioPanel = this.add.graphics();
    audioPanel.fillStyle(COLORS.BG_PANEL, 0.9);
    audioPanel.fillRoundedRect(20, yPos, GAME_WIDTH - 40, 60, 12);
    this.add.text(35, yPos + 12, '🔊 Sound Effects', {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
    });
    new Button(this, {
      x: GAME_WIDTH - 60, y: yPos + 15, width: 70, height: 26,
      text: save.soundEnabled ? 'ON' : 'OFF', fontSize: 12,
      bgColor: save.soundEnabled ? 0x27ae60 : 0x555555,
      onClick: () => {
        const newState = !SaveManager.getInstance().getData().soundEnabled;
        SaveManager.getInstance().updateData({ soundEnabled: newState });
        AudioManager.getInstance().setSoundEnabled(newState);
        this.scene.restart();
      },
    });
    this.add.text(35, yPos + 40, '🎵 Background Music', {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
    });
    new Button(this, {
      x: GAME_WIDTH - 60, y: yPos + 43, width: 70, height: 26,
      text: save.musicEnabled ? 'ON' : 'OFF', fontSize: 12,
      bgColor: save.musicEnabled ? 0x27ae60 : 0x555555,
      onClick: () => {
        const newState = !SaveManager.getInstance().getData().musicEnabled;
        SaveManager.getInstance().updateData({ musicEnabled: newState });
        AudioManager.getInstance().setMusicEnabled(newState);
        this.scene.restart();
      },
    });
    yPos += 75;

    // ---- Achievements ----
    const achProgress = AchievementManager.getInstance().getProgress();
    const achPanel = this.add.graphics();
    achPanel.fillStyle(COLORS.BG_PANEL, 0.9);
    achPanel.fillRoundedRect(20, yPos, GAME_WIDTH - 40, 200, 12);
    this.add.text(GAME_WIDTH / 2, yPos + 18, `🎖️ ACHIEVEMENTS (${achProgress.unlocked}/${achProgress.total})`, {
      fontSize: '14px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Progress bar
    const barW = GAME_WIDTH - 80;
    const barX = 40;
    const barY = yPos + 36;
    achPanel.fillStyle(0x333333, 0.8);
    achPanel.fillRoundedRect(barX, barY, barW, 8, 4);
    achPanel.fillStyle(COLORS.ACCENT_GOLD, 1);
    achPanel.fillRoundedRect(barX, barY, Math.max(8, barW * (achProgress.unlocked / achProgress.total)), 8, 4);

    // List achievements
    let achListY = yPos + 52;
    for (const ach of ACHIEVEMENTS.slice(0, 7)) {
      const unlocked = AchievementManager.getInstance().isUnlocked(ach.id);
      this.add.text(35, achListY, `${ach.icon} ${ach.name}`, {
        fontSize: '11px', fontFamily: 'Arial',
        color: unlocked ? '#2ecc71' : '#666666',
        fontStyle: unlocked ? 'bold' : 'normal',
      });
      this.add.text(GAME_WIDTH - 35, achListY, unlocked ? '✅' : '🔒', {
        fontSize: '11px',
      }).setOrigin(1, 0);
      achListY += 20;
    }
    if (ACHIEVEMENTS.length > 7) {
      this.add.text(GAME_WIDTH / 2, achListY + 4, `... and ${ACHIEVEMENTS.length - 7} more`, {
        fontSize: '10px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
      }).setOrigin(0.5);
    }
    yPos += 215;

    // ---- Account Info ----
    const infoPanel = this.add.graphics();
    infoPanel.fillStyle(COLORS.BG_PANEL, 0.9);
    infoPanel.fillRoundedRect(20, yPos, GAME_WIDTH - 40, 60, 12);
    this.add.text(35, yPos + 12, `Player ID: ${save.playerId.substring(0, 16)}...`, {
      fontSize: '10px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    });
    this.add.text(35, yPos + 28, `Member since: ${new Date(save.createdAt).toLocaleDateString()}`, {
      fontSize: '10px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    });
    this.add.text(35, yPos + 44, `Version: 1.2.0`, {
      fontSize: '10px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    });
    yPos += 75;

    // ---- Danger Zone ----
    new Button(this, {
      x: GAME_WIDTH / 2, y: yPos + 10, width: 180, height: 36,
      text: '🗑️ Reset All Data', fontSize: 13,
      bgColor: COLORS.ACCENT_RED,
      onClick: () => {
        if (confirm('Are you sure? This will delete ALL your progress, vaults, and purchases!')) {
          SaveManager.getInstance().resetAll();
          location.reload();
        }
      },
    });

    // ---- Privacy Policy ----
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'Privacy Policy | Terms of Service', {
      fontSize: '9px', fontFamily: 'Arial', color: '#444444',
    }).setOrigin(0.5);
  }
}
