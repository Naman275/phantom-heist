// ============================================================
// Graphics Generator — Creates all game visuals procedurally
// ============================================================
import Phaser from 'phaser';
import { CELL_SIZE, COLORS, TrapType, TRAP_DATA, PLAYER } from '../config/constants';

export class GraphicsGenerator {

  static generateAll(scene: Phaser.Scene): void {
    this.generatePlayer(scene);
    this.generatePlatform(scene);
    this.generateTraps(scene);
    this.generateItems(scene);
    this.generateProjectile(scene);
    this.generateParticle(scene);
  }

  static generatePlayer(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const w = PLAYER.WIDTH;
    const h = PLAYER.HEIGHT;

    // Body
    g.fillStyle(COLORS.ACCENT_CYAN, 1);
    g.fillRoundedRect(0, 4, w, h - 4, 6);

    // Mask/Visor
    g.fillStyle(0x1a1a2e, 1);
    g.fillRoundedRect(4, 8, w - 8, 12, 4);

    // Eyes
    g.fillStyle(0x00ffff, 1);
    g.fillCircle(10, 14, 3);
    g.fillCircle(w - 10, 14, 3);

    // Belt
    g.fillStyle(COLORS.ACCENT_GOLD, 1);
    g.fillRect(2, h - 14, w - 4, 4);

    g.generateTexture('player', w, h);
    g.destroy();
  }

  static generatePlatform(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);

    // Main platform
    g.fillStyle(COLORS.PLATFORM, 1);
    g.fillRect(0, 0, CELL_SIZE, CELL_SIZE);

    // Top edge highlight
    g.fillStyle(COLORS.PLATFORM_EDGE, 1);
    g.fillRect(0, 0, CELL_SIZE, 4);

    // Brick pattern
    g.lineStyle(1, 0x000000, 0.15);
    g.strokeRect(0, 4, CELL_SIZE / 2, (CELL_SIZE - 4) / 2);
    g.strokeRect(CELL_SIZE / 2, 4, CELL_SIZE / 2, (CELL_SIZE - 4) / 2);
    g.strokeRect(CELL_SIZE / 4, 4 + (CELL_SIZE - 4) / 2, CELL_SIZE / 2, (CELL_SIZE - 4) / 2);

    g.generateTexture('platform', CELL_SIZE, CELL_SIZE);
    g.destroy();
  }

  static generateTraps(scene: Phaser.Scene): void {
    // Spikes
    let g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(TRAP_DATA[TrapType.SPIKES].color, 1);
    for (let i = 0; i < 4; i++) {
      const x = i * 12 + 6;
      g.fillTriangle(x, CELL_SIZE, x - 6, CELL_SIZE, x - 3, CELL_SIZE - 18);
    }
    g.generateTexture('trap_spikes', CELL_SIZE, CELL_SIZE);
    g.destroy();

    // Laser emitter
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(TRAP_DATA[TrapType.LASER].color, 1);
    g.fillRect(0, CELL_SIZE / 2 - 4, 8, 8);
    g.fillRect(CELL_SIZE - 8, CELL_SIZE / 2 - 4, 8, 8);
    g.lineStyle(2, 0xff0044, 0.8);
    g.strokeRect(0, CELL_SIZE / 2 - 4, 8, 8);
    g.strokeRect(CELL_SIZE - 8, CELL_SIZE / 2 - 4, 8, 8);
    g.generateTexture('trap_laser', CELL_SIZE, CELL_SIZE);
    g.destroy();

    // Laser beam
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff0044, 0.6);
    g.fillRect(0, 0, CELL_SIZE, 4);
    g.fillStyle(0xff4488, 0.4);
    g.fillRect(0, -2, CELL_SIZE, 8);
    g.generateTexture('laser_beam', CELL_SIZE, 4);
    g.destroy();

    // Spring
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(TRAP_DATA[TrapType.SPRING].color, 1);
    g.fillRect(CELL_SIZE / 2 - 12, CELL_SIZE - 8, 24, 8);
    g.lineStyle(3, 0x33cc33, 1);
    for (let i = 0; i < 4; i++) {
      const y = CELL_SIZE - 10 - i * 6;
      g.lineBetween(CELL_SIZE / 2 - 10 + (i % 2) * 20, y, CELL_SIZE / 2 + 10 - (i % 2) * 20, y - 6);
    }
    g.generateTexture('trap_spring', CELL_SIZE, CELL_SIZE);
    g.destroy();

    // Fake floor
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.PLATFORM, 1);
    g.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    g.fillStyle(COLORS.PLATFORM_EDGE, 1);
    g.fillRect(0, 0, CELL_SIZE, 4);
    // Subtle crack pattern to hint it's fake
    g.lineStyle(1, 0x000000, 0.2);
    g.lineBetween(12, 4, 20, CELL_SIZE - 4);
    g.lineBetween(30, 8, 36, CELL_SIZE);
    g.generateTexture('trap_fake_floor', CELL_SIZE, CELL_SIZE);
    g.destroy();

    // Turret
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(TRAP_DATA[TrapType.TURRET].color, 1);
    g.fillRect(CELL_SIZE / 2 - 10, CELL_SIZE - 20, 20, 20);
    g.fillStyle(0x555555, 1);
    g.fillRect(CELL_SIZE / 2 + 5, CELL_SIZE - 16, 16, 6);
    // Red dot
    g.fillStyle(0xff0000, 1);
    g.fillCircle(CELL_SIZE / 2 + 20, CELL_SIZE - 13, 2);
    g.generateTexture('trap_turret', CELL_SIZE, CELL_SIZE);
    g.destroy();

    // Saw blade
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(TRAP_DATA[TrapType.SAW_BLADE].color, 1);
    g.fillCircle(CELL_SIZE / 2, CELL_SIZE / 2, 14);
    g.fillStyle(0xcc5500, 1);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const x = CELL_SIZE / 2 + Math.cos(angle) * 14;
      const y = CELL_SIZE / 2 + Math.sin(angle) * 14;
      g.fillTriangle(
        x, y,
        x + Math.cos(angle + 0.4) * 6, y + Math.sin(angle + 0.4) * 6,
        x + Math.cos(angle - 0.4) * 6, y + Math.sin(angle - 0.4) * 6,
      );
    }
    g.fillStyle(0x333333, 1);
    g.fillCircle(CELL_SIZE / 2, CELL_SIZE / 2, 4);
    g.generateTexture('trap_saw_blade', CELL_SIZE, CELL_SIZE);
    g.destroy();
  }

  static generateItems(scene: Phaser.Scene): void {
    // Coin
    let g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.ACCENT_GOLD, 1);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0xeebb00, 1);
    g.fillCircle(10, 10, 7);
    g.fillStyle(COLORS.ACCENT_GOLD, 1);
    g.fillCircle(10, 10, 4);
    g.generateTexture('coin', 20, 20);
    g.destroy();

    // Heart
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.ACCENT_RED, 1);
    g.fillCircle(8, 6, 6);
    g.fillCircle(16, 6, 6);
    g.fillTriangle(2, 8, 22, 8, 12, 20);
    g.generateTexture('heart', 24, 22);
    g.destroy();

    // Heart empty
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x444444, 1);
    g.fillCircle(8, 6, 6);
    g.fillCircle(16, 6, 6);
    g.fillTriangle(2, 8, 22, 8, 12, 20);
    g.generateTexture('heart_empty', 24, 22);
    g.destroy();

    // Entrance marker
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.ENTRANCE_GREEN, 0.5);
    g.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    g.lineStyle(3, COLORS.ENTRANCE_GREEN, 0.9);
    g.strokeRect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4);
    g.generateTexture('entrance', CELL_SIZE, CELL_SIZE);
    g.destroy();

    // Exit marker
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.EXIT_GOLD, 0.5);
    g.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    g.lineStyle(3, COLORS.EXIT_GOLD, 0.9);
    g.strokeRect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4);
    g.generateTexture('exit', CELL_SIZE, CELL_SIZE);
    g.destroy();

    // Shield gadget effect
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(3, 0x3498db, 0.7);
    g.strokeCircle(20, 22, 18);
    g.generateTexture('shield_effect', 40, 44);
    g.destroy();
  }

  static generateProjectile(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff4444, 1);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xff8888, 1);
    g.fillCircle(3, 3, 2);
    g.generateTexture('projectile', 8, 8);
    g.destroy();
  }

  static generateParticle(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('particle', 4, 4);
    g.destroy();
  }
}
