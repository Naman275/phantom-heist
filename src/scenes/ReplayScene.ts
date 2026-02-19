// ============================================================
// Replay Scene — Watch recorded raid replays
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS, GRID_COLS, GRID_ROWS, CELL_SIZE } from '../config/constants';
import { Button } from '../ui/Button';
import { SaveManager } from '../managers/SaveManager';
import { ReplayData, ReplayFrame } from '../managers/ReplayManager';

export class ReplayScene extends Phaser.Scene {
  private replay!: ReplayData;
  private ghostSprite!: Phaser.GameObjects.Sprite;
  private frameIndex = 0;
  private playing = true;
  private speed = 1;
  private frameTimer = 0;

  constructor() {
    super({ key: SCENES.REPLAY });
  }

  init(data: { replay: ReplayData }): void {
    this.replay = data.replay;
  }

  create(): void {
    if (!this.replay || !this.replay.frames || this.replay.frames.length === 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'No replay data available', {
        fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
      }).setOrigin(0.5);

      new Button(this, {
        x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 + 60,
        width: 150, height: 40,
        text: '← Back', fontSize: 14,
        bgColor: COLORS.BG_PANEL,
        onClick: () => this.scene.start(SCENES.MAIN_MENU),
      });
      return;
    }

    // Reset
    this.frameIndex = 0;
    this.playing = true;
    this.speed = 1;
    this.frameTimer = 0;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_DARK, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Grid background
    const gridG = this.add.graphics();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        gridG.fillStyle(COLORS.BG_CELL, 0.2);
        gridG.fillRect(c * CELL_SIZE, 50 + r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        gridG.lineStyle(1, 0xffffff, 0.05);
        gridG.strokeRect(c * CELL_SIZE, 50 + r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    // Ghost sprite (replay character)
    this.ghostSprite = this.add.sprite(
      this.replay.frames[0].x,
      this.replay.frames[0].y,
      'player',
    ).setAlpha(0.7).setTint(0x88ff88);

    // ---- Header ----
    const header = this.add.graphics();
    header.fillStyle(0x000000, 0.7);
    header.fillRect(0, 0, GAME_WIDTH, 48);

    this.add.text(GAME_WIDTH / 2, 24, `📹 Replay: ${this.replay.raiderName} vs ${this.replay.vaultName}`, {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
    }).setOrigin(0.5);

    const resultText = this.replay.success ? '✅ SUCCESS' : '❌ FAILED';
    const resultColor = this.replay.success ? '#2ecc71' : '#e74c3c';
    this.add.text(GAME_WIDTH - 10, 24, resultText, {
      fontSize: '12px', fontFamily: 'Arial', color: resultColor, fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // ---- Controls ----
    const ctrlY = GAME_HEIGHT - 60;

    new Button(this, {
      x: GAME_WIDTH / 2 - 120, y: ctrlY,
      width: 80, height: 36,
      text: '⏪ Slow', fontSize: 12,
      bgColor: COLORS.BG_PANEL,
      onClick: () => { this.speed = Math.max(0.25, this.speed - 0.25); },
    });

    new Button(this, {
      x: GAME_WIDTH / 2 - 35, y: ctrlY,
      width: 60, height: 36,
      text: '⏯', fontSize: 14,
      bgColor: COLORS.ACCENT_PURPLE,
      onClick: () => { this.playing = !this.playing; },
    });

    new Button(this, {
      x: GAME_WIDTH / 2 + 40, y: ctrlY,
      width: 80, height: 36,
      text: '⏩ Fast', fontSize: 12,
      bgColor: COLORS.BG_PANEL,
      onClick: () => { this.speed = Math.min(4, this.speed + 0.5); },
    });

    new Button(this, {
      x: GAME_WIDTH / 2 + 130, y: ctrlY,
      width: 70, height: 36,
      text: '← Exit', fontSize: 12,
      bgColor: COLORS.ACCENT_RED,
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });
  }

  update(_time: number, delta: number): void {
    if (!this.playing || !this.replay?.frames) return;

    this.frameTimer += delta * this.speed;

    // Advance frames based on timer (each recorded frame = ~50ms)
    while (this.frameTimer > 50 && this.frameIndex < this.replay.frames.length - 1) {
      this.frameTimer -= 50;
      this.frameIndex++;
    }

    if (this.frameIndex >= this.replay.frames.length - 1) {
      this.playing = false;
      return;
    }

    const frame = this.replay.frames[this.frameIndex];
    this.ghostSprite.setPosition(frame.x, frame.y);

    // Flip based on velocity
    if (frame.velocityX < 0) this.ghostSprite.setFlipX(true);
    else if (frame.velocityX > 0) this.ghostSprite.setFlipX(false);

    // Visual feedback for actions
    if (frame.action === 'hit') {
      this.ghostSprite.setTint(0xff0000);
      this.time.delayedCall(200, () => this.ghostSprite.setTint(0x88ff88));
    } else if (frame.action === 'death') {
      this.ghostSprite.setTint(0xff0000);
      this.ghostSprite.setAlpha(0.3);
    }
  }
}
