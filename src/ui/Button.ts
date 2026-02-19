// ============================================================
// UI Button — Reusable interactive button component
// ============================================================
import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { AudioManager } from '../managers/AudioManager';

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize?: number;
  bgColor?: number;
  hoverColor?: number;
  textColor?: string;
  cornerRadius?: number;
  onClick: () => void;
  icon?: string;
  disabled?: boolean;
}

export class Button {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private iconText: Phaser.GameObjects.Text | null = null;
  private hitZone: Phaser.GameObjects.Zone;
  private config: ButtonConfig;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    this.scene = scene;
    this.config = {
      fontSize: 18,
      bgColor: COLORS.ACCENT_PURPLE,
      hoverColor: 0xb36dd9,
      textColor: COLORS.TEXT_WHITE,
      cornerRadius: 12,
      disabled: false,
      ...config,
    };

    this.container = scene.add.container(config.x, config.y);

    // Background
    this.bg = scene.add.graphics();
    this.drawBg(this.config.bgColor!);
    this.container.add(this.bg);

    // Icon (if any)
    const textX = this.config.icon ? 12 : 0;
    if (this.config.icon) {
      this.iconText = scene.add.text(-this.config.width / 2 + 14, 0, this.config.icon, {
        fontSize: `${this.config.fontSize! + 2}px`,
      }).setOrigin(0, 0.5);
      this.container.add(this.iconText);
    }

    // Label
    this.label = scene.add.text(textX, 0, this.config.text, {
      fontSize: `${this.config.fontSize}px`,
      fontFamily: 'Arial, sans-serif',
      color: this.config.textColor,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.container.add(this.label);

    // Interactive hit zone — a transparent rectangle that reliably captures touch
    this.hitZone = scene.add.zone(0, 0, config.width, config.height).setInteractive();
    this.container.add(this.hitZone);

    // Events — use pointerdown only for instant response on mobile
    this.hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.config.disabled) return;
      this.container.setScale(0.95);
      this.drawBg(this.config.hoverColor!);

      // Restore visual after brief press
      scene.time.delayedCall(120, () => {
        if (this.container && this.container.active) {
          this.container.setScale(1);
          this.drawBg(this.config.bgColor!);
        }
      });

      try { AudioManager.getInstance().playClick(); } catch (_) {}
      this.config.onClick();
    });

    if (this.config.disabled) {
      this.container.setAlpha(0.5);
    }
  }

  private drawBg(color: number): void {
    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(
      -this.config.width / 2, -this.config.height / 2,
      this.config.width, this.config.height,
      this.config.cornerRadius!,
    );
    // Subtle border
    this.bg.lineStyle(2, 0xffffff, 0.15);
    this.bg.strokeRoundedRect(
      -this.config.width / 2, -this.config.height / 2,
      this.config.width, this.config.height,
      this.config.cornerRadius!,
    );
  }

  setDisabled(disabled: boolean): void {
    this.config.disabled = disabled;
    this.container.setAlpha(disabled ? 0.5 : 1);
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setBgColor(color: number): void {
    this.config.bgColor = color;
    this.drawBg(color);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
