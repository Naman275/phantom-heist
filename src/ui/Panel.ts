// ============================================================
// UI Panel — Reusable panel/card component
// ============================================================
import Phaser from 'phaser';
import { COLORS } from '../config/constants';

export interface PanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  bgColor?: number;
  bgAlpha?: number;
  cornerRadius?: number;
  borderColor?: number;
  borderWidth?: number;
}

export class Panel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private config: PanelConfig;

  constructor(scene: Phaser.Scene, config: PanelConfig) {
    this.scene = scene;
    this.config = {
      bgColor: COLORS.BG_PANEL,
      bgAlpha: 0.95,
      cornerRadius: 16,
      borderColor: 0xffffff,
      borderWidth: 1,
      ...config,
    };

    this.container = scene.add.container(config.x, config.y);
    this.bg = scene.add.graphics();
    this.draw();
    this.container.add(this.bg);
  }

  private draw(): void {
    this.bg.clear();
    this.bg.fillStyle(this.config.bgColor!, this.config.bgAlpha!);
    this.bg.fillRoundedRect(
      -this.config.width / 2, -this.config.height / 2,
      this.config.width, this.config.height,
      this.config.cornerRadius!,
    );
    if (this.config.borderWidth! > 0) {
      this.bg.lineStyle(this.config.borderWidth!, this.config.borderColor!, 0.2);
      this.bg.strokeRoundedRect(
        -this.config.width / 2, -this.config.height / 2,
        this.config.width, this.config.height,
        this.config.cornerRadius!,
      );
    }
  }

  addChild(child: Phaser.GameObjects.GameObject): void {
    this.container.add(child);
  }

  addText(x: number, y: number, text: string, style?: Partial<Phaser.Types.GameObjects.Text.TextStyle>): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.TEXT_WHITE,
      ...style,
    }).setOrigin(0.5, 0.5);
    this.container.add(t);
    return t;
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
