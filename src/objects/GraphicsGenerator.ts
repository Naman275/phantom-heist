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
    const w = PLAYER.WIDTH;
    const h = PLAYER.HEIGHT;

    // Stickman proportions
    const headR = 6;
    const cx = w / 2;       // center x
    const headY = headR + 1;
    const neckY = headY + headR;
    const shoulderY = neckY + 2;
    const hipY = h - 16;
    const upperArm = 8;
    const lowerArm = 7;
    const upperLeg = 9;
    const lowerLeg = 8;

    const bodyCol = 0x00d4ff;
    const skinCol = 0x00bbdd;
    const shoeCol = 0xffaa00;

    // Draws a 2-segment jointed limb (upper + lower)
    const drawLimb = (g: Phaser.GameObjects.Graphics,
      startX: number, startY: number,
      angle1: number, len1: number,
      angle2: number, len2: number,
      thickness: number, color: number,
      drawFoot = false) => {
      const midX = startX + Math.cos(angle1) * len1;
      const midY = startY + Math.sin(angle1) * len1;
      const endX = midX + Math.cos(angle2) * len2;
      const endY = midY + Math.sin(angle2) * len2;

      g.lineStyle(thickness, color, 1);
      g.lineBetween(startX, startY, midX, midY);
      g.lineStyle(thickness, color, 0.9);
      g.lineBetween(midX, midY, endX, endY);

      // Joint circle
      g.fillStyle(color, 0.6);
      g.fillCircle(midX, midY, 1.5);

      // Foot/hand
      if (drawFoot) {
        g.fillStyle(shoeCol, 1);
        g.fillCircle(endX, endY, 2.5);
      } else {
        g.fillStyle(skinCol, 1);
        g.fillCircle(endX, endY, 1.5);
      }
    };

    const drawHead = (g: Phaser.GameObjects.Graphics, ox: number = 0) => {
      // Head circle
      g.fillStyle(bodyCol, 1);
      g.fillCircle(cx + ox, headY, headR);
      // Mask/visor band
      g.fillStyle(0x1a1a2e, 1);
      g.fillRoundedRect(cx + ox - headR + 1, headY - 2, (headR - 1) * 2, 5, 2);
      // Eyes (glowing)
      g.fillStyle(0x00ffff, 1);
      g.fillCircle(cx + ox - 2.5, headY - 0.5, 1.5);
      g.fillCircle(cx + ox + 2.5, headY - 0.5, 1.5);
    };

    const drawBody = (g: Phaser.GameObjects.Graphics, tilt: number = 0) => {
      g.lineStyle(3, bodyCol, 1);
      g.lineBetween(cx + tilt * 0.8, neckY, cx + tilt * 0.2, hipY);
      // Belt
      g.fillStyle(COLORS.ACCENT_GOLD, 1);
      g.fillRect(cx + tilt * 0.2 - 4, hipY - 2, 8, 3);
    };

    // === IDLE ===
    let g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawHead(g);
    drawBody(g);
    // Arms hanging
    drawLimb(g, cx, shoulderY, Math.PI * 0.55, upperArm, Math.PI * 0.65, lowerArm, 2, skinCol);
    drawLimb(g, cx, shoulderY, Math.PI * 0.45, upperArm, Math.PI * 0.35, lowerArm, 2, skinCol);
    // Legs standing
    drawLimb(g, cx, hipY, Math.PI * 0.42, upperLeg, Math.PI * 0.48, lowerLeg, 2.5, skinCol, true);
    drawLimb(g, cx, hipY, Math.PI * 0.58, upperLeg, Math.PI * 0.52, lowerLeg, 2.5, skinCol, true);
    g.generateTexture('player', w, h);
    g.destroy();

    // === RUN FRAME 1 (right leg forward, left arm forward) ===
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawHead(g, 2);
    drawBody(g, 2);
    drawLimb(g, cx + 1, shoulderY, Math.PI * 0.15, upperArm, Math.PI * 0.6, lowerArm, 2, skinCol);  // left arm back
    drawLimb(g, cx + 1, shoulderY, Math.PI * 0.85, upperArm, Math.PI * 0.4, lowerArm, 2, skinCol);  // right arm forward
    drawLimb(g, cx + 1, hipY, Math.PI * 0.3, upperLeg, Math.PI * 0.55, lowerLeg, 2.5, skinCol, true);   // right leg forward
    drawLimb(g, cx + 1, hipY, Math.PI * 0.7, upperLeg, Math.PI * 0.35, lowerLeg, 2.5, skinCol, true);  // left leg back
    g.generateTexture('player_run1', w, h);
    g.destroy();

    // === RUN FRAME 2 (passing - legs together) ===
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawHead(g, 2);
    drawBody(g, 2);
    drawLimb(g, cx + 1, shoulderY, Math.PI * 0.45, upperArm, Math.PI * 0.55, lowerArm, 2, skinCol);
    drawLimb(g, cx + 1, shoulderY, Math.PI * 0.55, upperArm, Math.PI * 0.45, lowerArm, 2, skinCol);
    drawLimb(g, cx + 1, hipY, Math.PI * 0.47, upperLeg, Math.PI * 0.5, lowerLeg, 2.5, skinCol, true);
    drawLimb(g, cx + 1, hipY, Math.PI * 0.53, upperLeg, Math.PI * 0.5, lowerLeg, 2.5, skinCol, true);
    g.generateTexture('player_run2', w, h);
    g.destroy();

    // === RUN FRAME 3 (left leg forward, right arm forward - opposite of frame 1) ===
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawHead(g, 2);
    drawBody(g, 2);
    drawLimb(g, cx + 1, shoulderY, Math.PI * 0.85, upperArm, Math.PI * 0.4, lowerArm, 2, skinCol);   // left arm forward
    drawLimb(g, cx + 1, shoulderY, Math.PI * 0.15, upperArm, Math.PI * 0.6, lowerArm, 2, skinCol);   // right arm back
    drawLimb(g, cx + 1, hipY, Math.PI * 0.7, upperLeg, Math.PI * 0.35, lowerLeg, 2.5, skinCol, true);  // left leg forward
    drawLimb(g, cx + 1, hipY, Math.PI * 0.3, upperLeg, Math.PI * 0.55, lowerLeg, 2.5, skinCol, true);  // right leg back
    g.generateTexture('player_run3', w, h);
    g.destroy();

    // === RUN FRAME 4 (passing again - legs together, other phase) ===
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawHead(g, 2);
    drawBody(g, 2);
    drawLimb(g, cx + 1, shoulderY, Math.PI * 0.5, upperArm, Math.PI * 0.5, lowerArm, 2, skinCol);
    drawLimb(g, cx + 1, shoulderY, Math.PI * 0.5, upperArm, Math.PI * 0.5, lowerArm, 2, skinCol);
    drawLimb(g, cx + 1, hipY, Math.PI * 0.5, upperLeg, Math.PI * 0.48, lowerLeg, 2.5, skinCol, true);
    drawLimb(g, cx + 1, hipY, Math.PI * 0.5, upperLeg, Math.PI * 0.52, lowerLeg, 2.5, skinCol, true);
    g.generateTexture('player_run4', w, h);
    g.destroy();

    // === JUMP (tucked up, arms raised, knees bent) ===
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawHead(g);
    drawBody(g);
    // Arms up and out
    drawLimb(g, cx, shoulderY, -Math.PI * 0.25, upperArm, -Math.PI * 0.6, lowerArm, 2, skinCol);
    drawLimb(g, cx, shoulderY, Math.PI + Math.PI * 0.25, upperArm, -Math.PI * 0.4, lowerArm, 2, skinCol);
    // Legs bent/tucked
    drawLimb(g, cx - 2, hipY, Math.PI * 0.35, upperLeg, Math.PI * 0.8, lowerLeg, 2.5, skinCol, true);
    drawLimb(g, cx + 2, hipY, Math.PI * 0.65, upperLeg, Math.PI * 0.2, lowerLeg, 2.5, skinCol, true);
    g.generateTexture('player_jump', w, h);
    g.destroy();

    // === FALL (spread eagle, arms/legs wide) ===
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawHead(g);
    drawBody(g);
    // Arms wide up
    drawLimb(g, cx, shoulderY, -Math.PI * 0.4, upperArm, -Math.PI * 0.1, lowerArm, 2, skinCol);
    drawLimb(g, cx, shoulderY, Math.PI + Math.PI * 0.4, upperArm, Math.PI + Math.PI * 0.1, lowerArm, 2, skinCol);
    // Legs dangling wide
    drawLimb(g, cx, hipY, Math.PI * 0.35, upperLeg, Math.PI * 0.55, lowerLeg, 2.5, skinCol, true);
    drawLimb(g, cx, hipY, Math.PI * 0.65, upperLeg, Math.PI * 0.45, lowerLeg, 2.5, skinCol, true);
    g.generateTexture('player_fall', w, h);
    g.destroy();

    // === DEATH (flat on ground, X eyes) ===
    g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Head on left
    g.fillStyle(bodyCol, 0.5);
    g.fillCircle(8, h - 7, headR);
    g.lineStyle(2, 0xff0000, 1);
    g.lineBetween(5, h - 10, 11, h - 4);
    g.lineBetween(11, h - 10, 5, h - 4);
    // Body horizontal
    g.lineStyle(3, bodyCol, 0.4);
    g.lineBetween(14, h - 7, w - 6, h - 7);
    // Limbs splayed
    g.lineStyle(2, skinCol, 0.3);
    g.lineBetween(16, h - 7, 10, h - 17);
    g.lineBetween(20, h - 7, 26, h - 15);
    g.lineBetween(w - 10, h - 7, w - 6, h - 15);
    g.lineBetween(w - 8, h - 7, w - 2, h - 2);
    g.fillStyle(shoeCol, 0.4);
    g.fillCircle(10, h - 17, 2);
    g.fillCircle(w - 2, h - 2, 2);
    g.generateTexture('player_death', w, h);
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
