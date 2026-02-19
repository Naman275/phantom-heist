// ============================================================
// Boot Scene — Loading screen & asset generation
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';
import { GraphicsGenerator } from '../objects/GraphicsGenerator';
import { SaveManager } from '../managers/SaveManager';
import { initFirebase } from '../firebase/firebaseConfig';
import { AuthService } from '../firebase/authService';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.BOOT });
  }

  preload(): void {
    // Loading bar
    const barW = 300;
    const barH = 20;
    const barX = (GAME_WIDTH - barW) / 2;
    const barY = GAME_HEIGHT / 2 + 40;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRoundedRect(barX, barY, barW, barH, 10);

    // Title text
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '👻', {
      fontSize: '64px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'PHANTOM HEIST', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.TEXT_GOLD,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const loadingText = this.add.text(GAME_WIDTH / 2, barY + 40, 'Loading...', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5);

    // Simulate loading progress for asset generation
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(COLORS.ACCENT_GOLD, 1);
      progressBar.fillRoundedRect(barX + 2, barY + 2, (barW - 4) * value, barH - 4, 8);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load a tiny dummy file to trigger progress events
    // (all real assets are generated procedurally)
    this.load.image('__dummy', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
  }

  create(): void {
    // Generate all game textures procedurally
    GraphicsGenerator.generateAll(this);

    // Initialize save system
    SaveManager.getInstance();

    // Initialize Firebase & sign in anonymously
    try {
      initFirebase();
      AuthService.getInstance().signInAnon().catch(e => console.log('Auth skip:', e));
    } catch (e) {
      console.log('Firebase init skipped:', e);
    }

    // === TEST: Add 29834 coins ===
    const data = SaveManager.getInstance().getData();
    if (data.coins < 29834) {
      SaveManager.getInstance().updateData({ coins: 29834 });
    }

    // Check daily login
    const save = SaveManager.getInstance();
    const today = new Date().toDateString();
    const lastLogin = save.getData().lastLoginDate;

    // Transition to menu (or daily reward if new day)
    this.time.delayedCall(800, () => {
      try {
        // First-time players go straight to menu
        if (!save.getData().tutorialCompleted && !lastLogin) {
          save.updateData({ lastLoginDate: today, tutorialCompleted: true });
          this.scene.start(SCENES.MAIN_MENU);
        } else if (lastLogin !== today) {
          save.updateData({ lastLoginDate: today });
          this.scene.start(SCENES.DAILY_REWARD);
        } else {
          this.scene.start(SCENES.MAIN_MENU);
        }
      } catch (e) {
        console.error('Scene transition error:', e);
        this.scene.start(SCENES.MAIN_MENU);
      }
    });
  }
}
