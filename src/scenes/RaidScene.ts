// ============================================================
// Raid Scene — Core platformer gameplay (raiding a vault)
// ============================================================
import Phaser from 'phaser';
import {
  SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS,
  GRID_COLS, GRID_ROWS, CELL_SIZE,
  TrapType, TRAP_DATA, CellType, PLAYER, VaultData,
  CURRENCY,
} from '../config/constants';
import { Button } from '../ui/Button';
import { AudioManager } from '../managers/AudioManager';
import { ReplayManager } from '../managers/ReplayManager';
import { CurrencyManager } from '../managers/CurrencyManager';
import { ProgressionManager } from '../managers/ProgressionManager';
import { VaultManager } from '../managers/VaultManager';
import { SaveManager } from '../managers/SaveManager';
import { VaultService } from '../firebase/vaultService';
import { AchievementManager } from '../managers/AchievementManager';

interface ActiveTrap {
  col: number;
  row: number;
  type: TrapType;
  sprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  graphics?: Phaser.GameObjects.Graphics;
  timer: number;
  active: boolean;
}

export class RaidScene extends Phaser.Scene {
  private vault!: VaultData;
  private isTest = false;
  private player!: Phaser.GameObjects.Sprite;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private hp = PLAYER.MAX_HP;
  private invincibleUntil = 0;
  private isAlive = true;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private hazardZones!: Phaser.Physics.Arcade.StaticGroup;
  private movingHazards!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private activeTraps: ActiveTrap[] = [];
  private fakeFloorKeys: string[] = [];
  private fakeFloorMap: Map<string, { sprite: Phaser.GameObjects.Sprite; triggered: boolean }> = new Map();
  private heartSprites: Phaser.GameObjects.Sprite[] = [];
  private exitDoor: Phaser.GameObjects.Container | null = null;
  private exitZone: Phaser.GameObjects.Rectangle | null = null;
  private timerText!: Phaser.GameObjects.Text;
  private coinCountText!: Phaser.GameObjects.Text;
  private coinsCollected = 0;
  private moveLeft = false;
  private moveRight = false;
  private jumpPressed = false;
  private startTime = 0;
  private elapsedMs = 0;
  private gameOver = false;
  private runAnimTimer = 0;
  private lastOnGround = 0;    // timestamp when last on ground (for coyote time)
  private jumpBuffered = 0;    // timestamp when jump was pressed (for jump buffering)
  private isJumping = false;   // true while ascending from a jump
  private readonly gridOffsetY = 50;

  constructor() {
    super({ key: SCENES.RAID });
  }

  init(data: { vault: VaultData; isTest: boolean }): void {
    this.vault = data.vault;
    this.isTest = data.isTest || false;
  }

  create(): void {
    this.hp = PLAYER.MAX_HP;
    this.isAlive = true;
    this.gameOver = false;
    this.coinsCollected = 0;
    this.invincibleUntil = 0;
    this.activeTraps = [];
    this.fakeFloorKeys = [];
    this.fakeFloorMap = new Map();
    this.heartSprites = [];
    this.exitDoor = null;
    this.exitZone = null;
    this.moveLeft = false;
    this.moveRight = false;
    this.jumpPressed = false;
    this.runAnimTimer = 0;

    if (!this.vault || !this.vault.grid) {
      this.scene.start(SCENES.MAIN_MENU);
      return;
    }

    this.physics.world.gravity.y = PLAYER.GRAVITY;
    const worldW = GRID_COLS * CELL_SIZE;
    const worldH = GRID_ROWS * CELL_SIZE + this.gridOffsetY + CELL_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Camera follows player in the expanded world
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setDeadzone(80, 100);

    this.platforms = this.physics.add.staticGroup();
    this.coins = this.physics.add.staticGroup();
    this.hazardZones = this.physics.add.staticGroup();
    this.movingHazards = this.physics.add.group({ allowGravity: false });
    this.projectiles = this.physics.add.group({ allowGravity: false });

    this.buildLevel();

    // Find entrance position (placed by builder, or default bottom-left)
    const entrance = this.findEntrance();
    const spawnX = entrance.col * CELL_SIZE + CELL_SIZE / 2;
    const spawnY = this.gridOffsetY + entrance.row * CELL_SIZE - PLAYER.HEIGHT / 2;

    this.player = this.add.sprite(spawnX, spawnY, 'player');
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setSize(PLAYER.WIDTH - 4, PLAYER.HEIGHT - 2);
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setMaxVelocity(PLAYER.SPEED, 600);

    // Camera follows the player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.coins, this.onCoinCollect, undefined, this);
    this.physics.add.overlap(this.player, this.hazardZones, this.onHazardHit, undefined, this);
    this.physics.add.overlap(this.player, this.movingHazards, this.onHazardHit, undefined, this);
    this.physics.add.overlap(this.player, this.projectiles, this.onProjectileHit, undefined, this);

    ReplayManager.getInstance().startRecording();
    this.startTime = Date.now();

    this.createUI();
    this.createTouchControls();

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => { this.moveLeft = true; });
      this.input.keyboard.on('keyup-LEFT', () => { this.moveLeft = false; });
      this.input.keyboard.on('keydown-RIGHT', () => { this.moveRight = true; });
      this.input.keyboard.on('keyup-RIGHT', () => { this.moveRight = false; });
      this.input.keyboard.on('keydown-UP', () => { this.jumpPressed = true; });
      this.input.keyboard.on('keyup-UP', () => { this.jumpPressed = false; });
      this.input.keyboard.on('keydown-SPACE', () => { this.jumpPressed = true; });
      this.input.keyboard.on('keyup-SPACE', () => { this.jumpPressed = false; });
      this.input.keyboard.on('keydown-A', () => { this.moveLeft = true; });
      this.input.keyboard.on('keyup-A', () => { this.moveLeft = false; });
      this.input.keyboard.on('keydown-D', () => { this.moveRight = true; });
      this.input.keyboard.on('keyup-D', () => { this.moveRight = false; });
      this.input.keyboard.on('keydown-W', () => { this.jumpPressed = true; });
      this.input.keyboard.on('keyup-W', () => { this.jumpPressed = false; });
    }

    const exitBtn = new Button(this, {
      x: GAME_WIDTH - 40, y: 24,
      width: 60, height: 28,
      text: '✕ Exit', fontSize: 11,
      bgColor: 0x444444,
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });
    exitBtn.getContainer().setDepth(55).setScrollFactor(0);
  }

  private findEntrance(): { col: number; row: number } {
    // Look for placed entrance
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.vault.grid[r]?.[c]?.hasEntrance) return { col: c, row: r };
      }
    }
    // Default: bottom-left
    return { col: 0, row: this.findSpawnRow(0) };
  }

  private findSpawnRow(col: number): number {
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (this.vault.grid[row]?.[col]?.cellType === CellType.PLATFORM) return row;
    }
    return GRID_ROWS - 1;
  }

  private buildLevel(): void {
    const worldW = GRID_COLS * CELL_SIZE;
    const worldH = GRID_ROWS * CELL_SIZE + this.gridOffsetY + CELL_SIZE;

    // ---- Parallax Background ----
    // Layer 1: Deep space (scrolls slowest)
    const bgDeep = this.add.graphics();
    bgDeep.fillStyle(0x0a0518, 1);
    bgDeep.fillRect(-200, -200, worldW + 400, worldH + 400);
    // Stars
    for (let i = 0; i < 80; i++) {
      const sx = Math.random() * (worldW + 200) - 100;
      const sy = Math.random() * (worldH + 200) - 100;
      const size = Math.random() * 1.5 + 0.5;
      const alpha = Math.random() * 0.5 + 0.2;
      bgDeep.fillStyle(0xffffff, alpha);
      bgDeep.fillCircle(sx, sy, size);
    }
    bgDeep.setScrollFactor(0.3);

    // Layer 2: Grid pattern (scrolls medium)
    const bgMid = this.add.graphics();
    bgMid.lineStyle(1, 0x1a0a3e, 0.15);
    for (let x = 0; x < worldW; x += 80) {
      bgMid.lineBetween(x, 0, x, worldH);
    }
    for (let y = 0; y < worldH; y += 80) {
      bgMid.lineBetween(0, y, worldW, y);
    }
    bgMid.setScrollFactor(0.6);

    // Layer 3: Main background (scrolls with world)
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_DARK, 1);
    bg.fillRect(0, 0, worldW, worldH);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = this.vault.grid[row]?.[col];
        if (!cell) continue;
        const x = col * CELL_SIZE;
        const y = this.gridOffsetY + row * CELL_SIZE;

        const cellBg = this.add.graphics();
        cellBg.fillStyle(COLORS.BG_CELL, 0.2);
        cellBg.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        cellBg.lineStyle(1, 0xffffff, 0.05);
        cellBg.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        if (cell.cellType === CellType.PLATFORM) {
          if (cell.trapType === TrapType.FAKE_FLOOR) {
            const ff = this.add.sprite(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 'platform');
            ff.setDisplaySize(CELL_SIZE, CELL_SIZE);
            this.physics.add.existing(ff, true);
            this.fakeFloorMap.set(`${col}_${row}`, { sprite: ff, triggered: false });
            this.fakeFloorKeys.push(`${col}_${row}`);
            this.platforms.add(ff);
          } else {
            const plat = this.add.sprite(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 'platform');
            plat.setDisplaySize(CELL_SIZE, CELL_SIZE);
            this.physics.add.existing(plat, true);
            this.platforms.add(plat);
          }
        }

        if (cell.trapType && cell.trapType !== TrapType.FAKE_FLOOR) {
          this.placeTrap(col, row, cell.trapType);
        }

        // Place coins: use builder-placed coins, or random if none were placed
        const hasPlacedCoins = this.vaultHasPlacedCoins();
        if (cell.hasCoin || (!hasPlacedCoins && !cell.trapType && cell.cellType === CellType.EMPTY && Math.random() < 0.12)) {
          const coin = this.add.sprite(x + CELL_SIZE / 2, y + CELL_SIZE / 2 - 8, 'coin');
          coin.setDisplaySize(16, 16);
          this.physics.add.existing(coin, true);
          this.coins.add(coin);
          this.tweens.add({ targets: coin, y: coin.y - 5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }

        // Entrance marker — placed by vault builder
        if (cell.hasEntrance) {
          const ent = this.add.graphics();
          ent.fillStyle(COLORS.ENTRANCE_GREEN, 0.4);
          ent.fillRoundedRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8, 6);
          ent.lineStyle(2, COLORS.ENTRANCE_GREEN, 0.8);
          ent.strokeRoundedRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8, 6);
          // Spawn arrow
          ent.fillStyle(0xffffff, 0.7);
          ent.fillTriangle(x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 8, x + CELL_SIZE / 2 - 8, y + CELL_SIZE / 2 - 4, x + CELL_SIZE / 2 + 8, y + CELL_SIZE / 2 - 4);
          // Label
          this.add.text(x + CELL_SIZE / 2, y - 6, 'START', {
            fontSize: '8px', fontFamily: 'Arial', color: '#2ecc71', fontStyle: 'bold',
          }).setOrigin(0.5);
        }

        // Exit door — placed by vault builder
        if (cell.hasExit) {
          this.createExitDoor(x, y);
        }
      }
    }

    // If no exit was placed by builder, create default at bottom-right
    if (!this.exitDoor) {
      const defX = (GRID_COLS - 1) * CELL_SIZE;
      const defY = this.gridOffsetY + (GRID_ROWS - 1) * CELL_SIZE;
      this.createExitDoor(defX, defY);
    }

    const floor = this.add.rectangle(GAME_WIDTH / 2, this.gridOffsetY + GRID_ROWS * CELL_SIZE + 20, GAME_WIDTH, 40, 0x000000, 0);
    this.physics.add.existing(floor, true);
    this.platforms.add(floor);
  }

  private placeTrap(col: number, row: number, type: TrapType): void {
    const x = col * CELL_SIZE + CELL_SIZE / 2;
    const y = this.gridOffsetY + row * CELL_SIZE;
    const trap: ActiveTrap = { col, row, type, active: true, timer: 0 };

    switch (type) {
      case TrapType.SPIKES: {
        // Draw spikes poking up from the platform surface
        const g = this.add.graphics();
        g.fillStyle(TRAP_DATA[TrapType.SPIKES].color, 1);
        for (let i = 0; i < 3; i++) {
          const sx = col * CELL_SIZE + 8 + i * 14;
          // Spikes point upward from the top of the cell
          g.fillTriangle(sx, y + 4, sx + 12, y + 4, sx + 6, y - 14);
        }
        // Hazard zone positioned ABOVE the platform where the player actually walks
        const zone = this.add.rectangle(x, y - 6, CELL_SIZE - 4, 18, 0xff0000, 0);
        this.physics.add.existing(zone, true);
        this.hazardZones.add(zone);
        (zone as any).trapDamage = 1;
        trap.graphics = g;
        break;
      }
      case TrapType.LASER: {
        // Emitters on each side at the top of the cell
        const g = this.add.graphics();
        g.fillStyle(TRAP_DATA[TrapType.LASER].color, 1);
        g.fillRect(col * CELL_SIZE + 2, y - 6, 6, 6);
        g.fillRect(col * CELL_SIZE + CELL_SIZE - 8, y - 6, 6, 6);
        trap.graphics = g;
        // Beam crosses at the top of the platform where the player walks
        const beam = this.add.rectangle(x, y - 3, CELL_SIZE - 16, 6, 0xff0044, 0.7);
        this.physics.add.existing(beam, true);
        this.hazardZones.add(beam);
        (beam as any).trapDamage = 1;
        trap.sprite = beam;
        break;
      }
      case TrapType.SPRING: {
        // Draw spring sitting on top of the platform
        const g = this.add.graphics();
        g.fillStyle(TRAP_DATA[TrapType.SPRING].color, 1);
        g.fillRect(x - 10, y - 2, 20, 6);
        g.lineStyle(2, 0x33cc33, 0.9);
        g.lineBetween(x - 6, y - 4, x + 6, y - 12);
        g.lineBetween(x + 6, y - 12, x - 6, y - 20);
        trap.graphics = g;
        // Spring zone at the top of the platform where the player walks
        const zone = this.add.rectangle(x, y - 6, 28, 18, 0x00ff00, 0);
        this.physics.add.existing(zone, true);
        (zone as any).isSpring = true;
        (zone as any).trapDamage = 0;
        this.hazardZones.add(zone);
        break;
      }
      case TrapType.TURRET: {
        // Draw turret sitting on top of the platform
        const g = this.add.graphics();
        g.fillStyle(TRAP_DATA[TrapType.TURRET].color, 1);
        g.fillRect(x - 8, y - 20, 16, 20);
        g.fillStyle(0x555555, 1);
        g.fillRect(x + 4, y - 16, 14, 5);
        g.fillStyle(0xff0000, 1);
        g.fillCircle(x + 17, y - 13, 2);
        trap.graphics = g;
        break;
      }
      case TrapType.SAW_BLADE: {
        const sawG = this.add.graphics();
        sawG.fillStyle(TRAP_DATA[TrapType.SAW_BLADE].color, 1);
        sawG.fillCircle(0, 0, 14);
        sawG.fillStyle(0xcc5500, 1);
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const px = Math.cos(angle) * 14;
          const py = Math.sin(angle) * 14;
          sawG.fillTriangle(px, py, px + Math.cos(angle + 0.5) * 5, py + Math.sin(angle + 0.5) * 5, px + Math.cos(angle - 0.5) * 5, py + Math.sin(angle - 0.5) * 5);
        }
        sawG.fillStyle(0x333333, 1);
        sawG.fillCircle(0, 0, 4);
        sawG.setPosition(x, y - CELL_SIZE / 2);

        const sawHitbox = this.add.rectangle(x, y - CELL_SIZE / 2, 28, 28, 0xff0000, 0);
        this.physics.add.existing(sawHitbox, false);
        const sawBody = sawHitbox.body as Phaser.Physics.Arcade.Body;
        sawBody.setAllowGravity(false);
        sawBody.setImmovable(true);
        this.movingHazards.add(sawHitbox);
        (sawHitbox as any).trapDamage = 2;

        this.tweens.add({ targets: sawG, angle: 360, duration: 1000, repeat: -1, ease: 'Linear' });
        this.tweens.add({ targets: [sawG, sawHitbox], y: y - CELL_SIZE, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        break;
      }

      case TrapType.BOMB: {
        // Bomb sits ON TOP of the platform (above the cell, like spikes)
        const bombCenterX = x;
        const bombCenterY = y - 16; // Well above the platform top edge

        // Bomb container for easy manipulation
        const bombContainer = this.add.container(bombCenterX, bombCenterY);

        // Bomb body (dark sphere)
        const bombBody = this.add.graphics();
        bombBody.fillStyle(0x222222, 1);
        bombBody.fillCircle(0, 0, 14);
        bombBody.fillStyle(0x444444, 1);
        bombBody.fillCircle(-3, -3, 5);
        bombContainer.add(bombBody);

        // Fuse
        const fuse = this.add.graphics();
        fuse.lineStyle(2, 0xaa6600, 1);
        fuse.lineBetween(6, -12, 12, -22);
        bombContainer.add(fuse);

        // Spark at fuse tip (animated)
        const spark = this.add.graphics();
        spark.fillStyle(0xff6600, 1);
        spark.fillCircle(12, -22, 3);
        bombContainer.add(spark);
        this.tweens.add({
          targets: spark, alpha: 0.3, duration: 400,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        // "BOMB" label above
        const bombLabel = this.add.text(0, -30, '💣', { fontSize: '12px' }).setOrigin(0.5);
        bombContainer.add(bombLabel);

        // Countdown text (hidden until activated)
        const countdownText = this.add.text(0, 18, '', {
          fontSize: '16px', fontFamily: 'Arial', color: '#ff4444', fontStyle: 'bold',
        }).setOrigin(0.5);
        bombContainer.add(countdownText);

        // Glow ring (hidden until activated)
        const glowRing = this.add.graphics();
        glowRing.lineStyle(3, 0xff0000, 0);
        glowRing.strokeCircle(0, 0, 22);
        bombContainer.add(glowRing);

        trap.graphics = bombBody; // Keep reference for cleanup
        (trap as any).bombState = 'dormant';
        (trap as any).bombFuseTime = 0;
        (trap as any).bombX = bombCenterX;
        (trap as any).bombY = bombCenterY;
        (trap as any).bombContainer = bombContainer;
        (trap as any).bombCountdownText = countdownText;
        (trap as any).bombGlowRing = glowRing;
        (trap as any).bombFuseGfx = fuse;
        (trap as any).bombSparkGfx = spark;

        // Trigger zone — positioned above platform where player walks
        const triggerZone = this.add.rectangle(bombCenterX, bombCenterY, 36, 36, 0xff0000, 0);
        this.physics.add.existing(triggerZone, true);
        this.hazardZones.add(triggerZone);
        (triggerZone as any).isBombTrigger = true;
        (triggerZone as any).trapRef = trap;
        (triggerZone as any).trapDamage = 0;
        break;
      }
    }
    this.activeTraps.push(trap);
  }

  private updateBombs(delta: number): void {
    for (const trap of this.activeTraps) {
      if (trap.type !== TrapType.BOMB) continue;
      const state = (trap as any).bombState;
      if (state !== 'ticking') continue;

      (trap as any).bombFuseTime += delta;
      const fuseTime = (trap as any).bombFuseTime;
      const bombX = (trap as any).bombX;
      const bombY = (trap as any).bombY;
      const container = (trap as any).bombContainer as Phaser.GameObjects.Container | null;
      const countdownText = (trap as any).bombCountdownText as Phaser.GameObjects.Text | null;
      const glowRing = (trap as any).bombGlowRing as Phaser.GameObjects.Graphics | null;

      // Countdown number (3... 2... 1...)
      const secondsLeft = Math.ceil((3000 - fuseTime) / 1000);
      if (countdownText) {
        countdownText.setText(secondsLeft > 0 ? secondsLeft.toString() : '💥');
        countdownText.setColor(secondsLeft <= 1 ? '#ff0000' : '#ff6644');
      }

      // Flashing bomb body — red/black alternating, faster over time
      if (trap.graphics) {
        const flashRate = Math.max(80, 400 - fuseTime * 0.12);
        const isRed = Math.floor(fuseTime / flashRate) % 2 === 0;
        trap.graphics.clear();
        trap.graphics.fillStyle(isRed ? 0xff0000 : 0x222222, 1);
        trap.graphics.fillCircle(0, 0, 14);
        trap.graphics.fillStyle(isRed ? 0xff6644 : 0x444444, 1);
        trap.graphics.fillCircle(-3, -3, 5);
      }

      // Pulsing red glow ring
      if (glowRing) {
        const glowAlpha = (Math.sin(fuseTime * 0.01) + 1) * 0.4;
        glowRing.clear();
        glowRing.lineStyle(3, 0xff0000, glowAlpha);
        glowRing.strokeCircle(0, 0, 22 + Math.sin(fuseTime * 0.008) * 4);
      }

      // Shake the bomb container
      if (container) {
        const shakeIntensity = Math.min(3, fuseTime * 0.001);
        container.setPosition(
          bombX + (Math.random() - 0.5) * shakeIntensity * 2,
          bombY + (Math.random() - 0.5) * shakeIntensity * 2,
        );
      }

      // Screen shake in final second
      if (fuseTime > 2200) {
        this.cameras.main.shake(50, 0.004);
      }

      // EXPLODE after 3 seconds
      if (fuseTime >= 3000) {
        (trap as any).bombState = 'exploded';
        this.detonateBomb(bombX, bombY, trap);
      }
    }
  }

  private detonateBomb(bx: number, by: number, trap: ActiveTrap): void {
    // Remove bomb container and all its children
    const container = (trap as any).bombContainer as Phaser.GameObjects.Container | null;
    if (container) {
      container.destroy(true);
      (trap as any).bombContainer = null;
    }
    if (trap.graphics) {
      trap.graphics = undefined;
    }
    trap.active = false;

    // Explosion visual — expanding rings
    const blastRadius = CELL_SIZE * 3; // 3 cells radius

    // Flash
    const flash = this.add.graphics().setDepth(80);
    flash.fillStyle(0xff4400, 0.6);
    flash.fillCircle(bx, by, 20);
    this.tweens.add({
      targets: flash, alpha: 0, scaleX: 8, scaleY: 8,
      duration: 500, ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Shockwave ring
    const ring = this.add.graphics().setDepth(79);
    ring.lineStyle(4, 0xff8800, 0.8);
    ring.strokeCircle(bx, by, 10);
    this.tweens.add({
      targets: ring, alpha: 0, scaleX: 12, scaleY: 12,
      duration: 600, ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    // Explosion particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      const particle = this.add.rectangle(bx, by, 6, 6,
        Math.random() > 0.5 ? 0xff4400 : 0xffaa00, 1);
      this.tweens.add({
        targets: particle,
        x: bx + Math.cos(angle) * speed,
        y: by + Math.sin(angle) * speed,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 400 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Smoke cloud
    for (let i = 0; i < 6; i++) {
      const smoke = this.add.graphics().setDepth(78);
      smoke.fillStyle(0x333333, 0.4);
      smoke.fillCircle(bx + (Math.random() - 0.5) * 40, by + (Math.random() - 0.5) * 40, 15 + Math.random() * 20);
      this.tweens.add({
        targets: smoke, alpha: 0, scaleX: 2, scaleY: 2,
        duration: 800 + Math.random() * 400, ease: 'Power1',
        onComplete: () => smoke.destroy(),
      });
    }

    // Camera shake
    this.cameras.main.shake(400, 0.02);

    // Sound
    try { AudioManager.getInstance().playHit(); } catch (_) {}

    // Damage based on distance from player
    if (!this.isAlive || this.gameOver) return;
    const dx = this.player.x - bx;
    const dy = this.player.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < CELL_SIZE * 1) {
      // Within 1 cell = instant death (3 damage)
      this.takeDamage(3);
    } else if (dist < CELL_SIZE * 2) {
      // Within 2 cells = heavy damage
      this.takeDamage(2);
    } else if (dist < blastRadius) {
      // Within 3 cells = light damage
      this.takeDamage(1);
    }

    // Knockback if within blast radius
    if (dist < blastRadius && this.isAlive) {
      const knockAngle = Math.atan2(dy, dx);
      const knockForce = 300 * (1 - dist / blastRadius);
      this.playerBody.setVelocity(
        Math.cos(knockAngle) * knockForce,
        Math.min(-200, Math.sin(knockAngle) * knockForce),
      );
    }
  }

  private createUI(): void {
    const topBar = this.add.graphics().setDepth(50).setScrollFactor(0);
    topBar.fillStyle(0x000000, 0.7);
    topBar.fillRect(0, 0, GAME_WIDTH, 48);

    this.heartSprites = [];
    for (let i = 0; i < PLAYER.MAX_HP; i++) {
      const heart = this.add.sprite(20 + i * 28, 24, 'heart').setDisplaySize(22, 20).setDepth(51).setScrollFactor(0);
      this.heartSprites.push(heart);
    }

    this.timerText = this.add.text(GAME_WIDTH / 2, 24, `${Math.floor(PLAYER.RAID_TIME_LIMIT / 60)}:${(PLAYER.RAID_TIME_LIMIT % 60).toString().padStart(2, '0')}`, {
      fontSize: '18px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0);

    this.add.text(GAME_WIDTH - 110, 16, '🪙', { fontSize: '16px' }).setDepth(51).setScrollFactor(0);
    this.coinCountText = this.add.text(GAME_WIDTH - 90, 24, '0', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(51).setScrollFactor(0);

    this.add.text(GAME_WIDTH / 2, 42, this.vault.name, {
      fontSize: '10px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0);

    // ---- Minimap ----
    this.createMinimap();
  }

  private minimapDot!: Phaser.GameObjects.Graphics;

  private createMinimap(): void {
    const mmW = 100;
    const mmH = 40;
    const mmX = GAME_WIDTH - mmW - 10;
    const mmY = 52;
    const scaleX = mmW / (GRID_COLS * CELL_SIZE);
    const scaleY = mmH / (GRID_ROWS * CELL_SIZE);

    const mmBg = this.add.graphics().setDepth(55).setScrollFactor(0);
    mmBg.fillStyle(0x000000, 0.5);
    mmBg.fillRoundedRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 4);
    mmBg.lineStyle(1, 0xffffff, 0.2);
    mmBg.strokeRoundedRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 4);

    const mmLayout = this.add.graphics().setDepth(56).setScrollFactor(0);
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = this.vault.grid[r]?.[c];
        if (!cell) continue;
        const px = mmX + c * CELL_SIZE * scaleX;
        const py = mmY + r * CELL_SIZE * scaleY;
        const pw = CELL_SIZE * scaleX;
        const ph = CELL_SIZE * scaleY;
        if (cell.cellType === CellType.PLATFORM) { mmLayout.fillStyle(0x8b7355, 0.6); mmLayout.fillRect(px, py, pw, ph); }
        if (cell.trapType) { mmLayout.fillStyle(0xff4444, 0.5); mmLayout.fillRect(px, py, pw, ph); }
        if (cell.hasExit) { mmLayout.fillStyle(COLORS.EXIT_GOLD, 0.9); mmLayout.fillRect(px, py, pw, ph); }
        if (cell.hasEntrance) { mmLayout.fillStyle(COLORS.ENTRANCE_GREEN, 0.9); mmLayout.fillRect(px, py, pw, ph); }
      }
    }
    this.minimapDot = this.add.graphics().setDepth(57).setScrollFactor(0);
  }

  private updateMinimap(): void {
    if (!this.minimapDot) return;
    const mmW = 100; const mmH = 40;
    const mmX = GAME_WIDTH - mmW - 10; const mmY = 52;
    const scaleX = mmW / (GRID_COLS * CELL_SIZE);
    const scaleY = mmH / ((GRID_ROWS * CELL_SIZE) + this.gridOffsetY);
    this.minimapDot.clear();
    const dotX = mmX + this.player.x * scaleX;
    const dotY = mmY + this.player.y * scaleY;
    this.minimapDot.fillStyle(0x00ffff, 0.8);
    this.minimapDot.fillCircle(dotX, dotY, 3);
    this.minimapDot.fillStyle(0x00ffff, 0.3);
    this.minimapDot.fillCircle(dotX, dotY, 5);
  }

  private createTouchControls(): void {
    const controlsY = GAME_HEIGHT - 90;

    // Semi-transparent control area
    const ctrlBg = this.add.graphics().setDepth(50).setScrollFactor(0);
    ctrlBg.fillStyle(0x000000, 0.3);
    ctrlBg.fillRect(0, GAME_HEIGHT - 150, GAME_WIDTH, 150);

    // ---- VIRTUAL JOYSTICK (left side) ----
    const joyBaseX = 90;
    const joyBaseY = controlsY;
    const joyRadius = 50;
    const thumbRadius = 22;

    // Base circle
    const joyBase = this.add.graphics().setDepth(51).setScrollFactor(0);
    joyBase.fillStyle(0xffffff, 0.1);
    joyBase.fillCircle(joyBaseX, joyBaseY, joyRadius);
    joyBase.lineStyle(2, 0xffffff, 0.2);
    joyBase.strokeCircle(joyBaseX, joyBaseY, joyRadius);

    // Thumb (movable inner circle)
    const joyThumb = this.add.graphics().setDepth(52).setScrollFactor(0);
    joyThumb.fillStyle(0xffffff, 0.35);
    joyThumb.fillCircle(joyBaseX, joyBaseY, thumbRadius);

    // Joystick interaction zone
    const joyZone = this.add.zone(joyBaseX, joyBaseY, joyRadius * 2.5, joyRadius * 2.5)
      .setDepth(53).setInteractive().setScrollFactor(0);

    let joystickActive = false;

    joyZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      joystickActive = true;
      this.updateJoystick(pointer, joyBaseX, joyBaseY, joyRadius, joyThumb, thumbRadius);
    });

    joyZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (joystickActive && pointer.isDown) {
        this.updateJoystick(pointer, joyBaseX, joyBaseY, joyRadius, joyThumb, thumbRadius);
      }
    });

    joyZone.on('pointerup', () => {
      joystickActive = false;
      this.moveLeft = false;
      this.moveRight = false;
      // Reset thumb to center
      joyThumb.clear();
      joyThumb.fillStyle(0xffffff, 0.35);
      joyThumb.fillCircle(joyBaseX, joyBaseY, thumbRadius);
    });

    joyZone.on('pointerout', () => {
      joystickActive = false;
      this.moveLeft = false;
      this.moveRight = false;
      joyThumb.clear();
      joyThumb.fillStyle(0xffffff, 0.35);
      joyThumb.fillCircle(joyBaseX, joyBaseY, thumbRadius);
    });

    // Joystick label
    this.add.text(joyBaseX, joyBaseY + joyRadius + 16, 'MOVE', {
      fontSize: '11px', fontFamily: 'Arial', color: '#888888',
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0);

    // ---- JUMP BUTTON (right side) ----
    const jumpBtnSize = 72;
    const jumpX = GAME_WIDTH - 80;
    const jumpY = controlsY;

    const jumpGfx = this.add.graphics().setDepth(51).setScrollFactor(0);
    jumpGfx.fillStyle(COLORS.ACCENT_CYAN, 0.2);
    jumpGfx.fillCircle(jumpX, jumpY, jumpBtnSize / 2);
    jumpGfx.lineStyle(2, COLORS.ACCENT_CYAN, 0.4);
    jumpGfx.strokeCircle(jumpX, jumpY, jumpBtnSize / 2);
    // Up arrow
    jumpGfx.fillStyle(COLORS.ACCENT_CYAN, 0.5);
    jumpGfx.fillTriangle(jumpX, jumpY - 20, jumpX - 16, jumpY + 6, jumpX + 16, jumpY + 6);

    const jumpZone = this.add.zone(jumpX, jumpY, jumpBtnSize + 20, jumpBtnSize + 20)
      .setDepth(52).setInteractive().setScrollFactor(0);
    jumpZone.on('pointerdown', () => { this.jumpPressed = true; });
    jumpZone.on('pointerup', () => { this.jumpPressed = false; });
    jumpZone.on('pointerout', () => { this.jumpPressed = false; });

    this.add.text(jumpX, jumpY + jumpBtnSize / 2 + 14, 'JUMP', {
      fontSize: '11px', fontFamily: 'Arial', color: '#88ddff',
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0);
  }

  private updateJoystick(
    pointer: Phaser.Input.Pointer,
    baseX: number, baseY: number,
    maxRadius: number,
    thumbGfx: Phaser.GameObjects.Graphics,
    thumbRadius: number,
  ): void {
    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp thumb to base radius
    let thumbX = baseX + dx;
    let thumbY = baseY + dy;
    if (dist > maxRadius) {
      thumbX = baseX + (dx / dist) * maxRadius;
      thumbY = baseY + (dy / dist) * maxRadius;
    }

    // Redraw thumb at new position
    thumbGfx.clear();
    thumbGfx.fillStyle(0xffffff, 0.5);
    thumbGfx.fillCircle(thumbX, thumbY, thumbRadius);

    // Determine direction from joystick position
    const normalizedX = dx / maxRadius;
    const deadzone = 0.2;

    if (normalizedX < -deadzone) {
      this.moveLeft = true;
      this.moveRight = false;
    } else if (normalizedX > deadzone) {
      this.moveLeft = false;
      this.moveRight = true;
    } else {
      this.moveLeft = false;
      this.moveRight = false;
    }
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || !this.isAlive) return;

    const now = Date.now();
    const onGround = this.playerBody.blocked.down;

    // Track ground contact for coyote time
    if (onGround) {
      this.lastOnGround = now;
      this.isJumping = false;
    }

    // ---- Horizontal Movement with Acceleration ----
    const currentVx = this.playerBody.velocity.x;
    const accel = PLAYER.ACCELERATION * (delta / 1000);
    const decel = PLAYER.DECELERATION * (delta / 1000);

    if (this.moveLeft) {
      // Accelerate left
      const targetVx = -PLAYER.SPEED;
      if (currentVx > targetVx) {
        this.playerBody.setVelocityX(Math.max(targetVx, currentVx - accel));
      }
      this.player.setFlipX(true);
    } else if (this.moveRight) {
      // Accelerate right
      const targetVx = PLAYER.SPEED;
      if (currentVx < targetVx) {
        this.playerBody.setVelocityX(Math.min(targetVx, currentVx + accel));
      }
      this.player.setFlipX(false);
    } else {
      // Decelerate to stop
      if (Math.abs(currentVx) < decel) {
        this.playerBody.setVelocityX(0);
      } else if (currentVx > 0) {
        this.playerBody.setVelocityX(currentVx - decel);
      } else if (currentVx < 0) {
        this.playerBody.setVelocityX(currentVx + decel);
      }
    }

    // ---- Jump with Coyote Time + Jump Buffering + Variable Height ----
    // Buffer jump input
    if (this.jumpPressed) {
      this.jumpBuffered = now;
    }

    // Can jump if: on ground OR within coyote time window
    const canJump = onGround || (now - this.lastOnGround < PLAYER.COYOTE_TIME_MS);
    const jumpWasBuffered = (now - this.jumpBuffered < PLAYER.JUMP_BUFFER_MS);

    if (canJump && jumpWasBuffered && !this.isJumping) {
      this.playerBody.setVelocityY(PLAYER.JUMP_VELOCITY);
      this.isJumping = true;
      this.jumpBuffered = 0; // consume the buffer
      this.lastOnGround = 0; // consume coyote time
      try { AudioManager.getInstance().playJump(); } catch (_) {}
    }

    // Variable jump height — release jump early to jump shorter
    if (this.isJumping && !this.jumpPressed && this.playerBody.velocity.y < PLAYER.JUMP_VELOCITY * 0.4) {
      this.playerBody.setVelocityY(this.playerBody.velocity.y * 0.5);
      this.isJumping = false;
    }

    // ---- Character Animation ----
    const RUN_FRAMES = ['player_run1', 'player_run2', 'player_run3', 'player_run4'];
    const speed = Math.abs(this.playerBody.velocity.x);

    if (!onGround) {
      // Airborne
      if (this.playerBody.velocity.y < -50) {
        this.player.setTexture('player_jump');
      } else if (this.playerBody.velocity.y > 50) {
        this.player.setTexture('player_fall');
      }
      // Keep last run frame if near-zero vertical (looks better)
      this.runAnimTimer = 0;
    } else if (speed > 20) {
      // Running — animation speed scales with movement speed
      this.runAnimTimer += delta;
      const frameTime = Math.max(60, 160 - speed * 0.4); // faster run = faster animation
      if (this.runAnimTimer > frameTime) {
        this.runAnimTimer = 0;
        const currentIdx = RUN_FRAMES.indexOf(this.player.texture.key);
        const nextIdx = (currentIdx + 1) % RUN_FRAMES.length;
        this.player.setTexture(RUN_FRAMES[nextIdx]);
      }
    } else {
      // Idle
      this.player.setTexture('player');
      this.runAnimTimer = 0;
    }

    // Squash & stretch effect
    if (onGround && this.playerBody.velocity.y === 0) {
      // Landing squash (compress vertically, expand horizontally)
      const squash = 1 + Math.min(0.15, speed * 0.0003);
      this.player.setScale(squash, 1 / squash);
    } else if (!onGround && this.playerBody.velocity.y < -100) {
      // Jump stretch (elongate vertically)
      this.player.setScale(0.9, 1.1);
    } else if (!onGround && this.playerBody.velocity.y > 100) {
      // Fall stretch
      this.player.setScale(0.92, 1.08);
    } else {
      // Normal
      this.player.setScale(1, 1);
    }

    // ---- Dust Particles ----
    if (onGround && speed > 60) {
      // Running dust
      if (Math.random() < 0.3) {
        const dustX = this.player.x + (Math.random() - 0.5) * 10;
        const dustY = this.player.y + PLAYER.HEIGHT / 2 - 2;
        const dust = this.add.circle(dustX, dustY, 2 + Math.random() * 2, 0x888888, 0.4);
        this.tweens.add({
          targets: dust, y: dustY - 8 - Math.random() * 8, alpha: 0, scaleX: 0.3, scaleY: 0.3,
          duration: 300 + Math.random() * 200, ease: 'Power2',
          onComplete: () => dust.destroy(),
        });
      }
    }

    this.elapsedMs = Date.now() - this.startTime;
    const totalSecs = PLAYER.RAID_TIME_LIMIT;
    const elapsedSecs = Math.floor(this.elapsedMs / 1000);
    const remainingSecs = Math.max(0, totalSecs - elapsedSecs);
    const mins = Math.floor(remainingSecs / 60);
    const secsDisplay = remainingSecs % 60;
    this.timerText.setText(`${mins}:${secsDisplay.toString().padStart(2, '0')}`);

    // Flash red when low on time
    if (remainingSecs <= 10) {
      this.timerText.setColor(remainingSecs % 2 === 0 ? '#ff4444' : '#ffffff');
    } else if (remainingSecs <= 20) {
      this.timerText.setColor('#f39c12');
    }

    // Time's up — raid failed
    if (remainingSecs <= 0) {
      this.gameOver = true;
      this.handleDefeat();
      return;
    }

    this.updateTraps(delta);
    this.updateBombs(delta);
    this.updateMinimap();

    let action: 'idle' | 'left' | 'right' | 'jump' = 'idle';
    if (this.moveLeft) action = 'left';
    else if (this.moveRight) action = 'right';
    if (this.jumpPressed && this.playerBody.blocked.down) action = 'jump';
    ReplayManager.getInstance().recordFrame(this.player.x, this.player.y, this.playerBody.velocity.x, this.playerBody.velocity.y, action);

    this.checkFakeFloors();
    this.checkWinCondition();

    if (this.player.y > this.gridOffsetY + GRID_ROWS * CELL_SIZE + 30) {
      this.takeDamage(1);
      if (this.isAlive) {
        const respawn = this.findEntrance();
        this.player.setPosition(respawn.col * CELL_SIZE + CELL_SIZE / 2, this.gridOffsetY + respawn.row * CELL_SIZE - PLAYER.HEIGHT / 2);
        this.playerBody.setVelocity(0, 0);
      }
    }

    if (Date.now() < this.invincibleUntil) {
      this.player.setAlpha(Math.sin(Date.now() * 0.02) * 0.5 + 0.5);
    } else {
      this.player.setAlpha(1);
    }
  }

  private updateTraps(delta: number): void {
    for (const trap of this.activeTraps) {
      if (!trap.active) continue;
      trap.timer += delta;
      if (trap.type === TrapType.LASER && trap.sprite) {
        const beamOn = Math.floor(trap.timer / 1500) % 2 === 0;
        trap.sprite.setVisible(beamOn);
        const body = trap.sprite.body as Phaser.Physics.Arcade.StaticBody;
        if (body) body.enable = beamOn;
      } else if (trap.type === TrapType.TURRET && trap.timer > 3000) {
        trap.timer = 0;
        this.fireProjectile(trap.col, trap.row);
      }
    }
  }

  private fireProjectile(col: number, row: number): void {
    // Spawn projectile ABOVE the platform cell (where the turret barrel is)
    const turretX = col * CELL_SIZE + CELL_SIZE / 2 + 10;
    const turretY = this.gridOffsetY + row * CELL_SIZE - 12;

    // Use a rectangle — guaranteed to work with arcade physics
    const proj = this.add.rectangle(turretX, turretY, 10, 10, 0xff4444, 1);
    this.physics.add.existing(proj, false);
    const body = proj.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(10, 10);

    // Aim at the player
    const angle = Phaser.Math.Angle.Between(turretX, turretY, this.player.x, this.player.y);
    body.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);

    (proj as any).trapDamage = 1;

    // Set up overlap directly with this specific projectile
    this.physics.add.overlap(this.player, proj, (_p: any, _proj: any) => {
      if (Date.now() < this.invincibleUntil) return;
      if (_proj.active) _proj.destroy();
      this.takeDamage(1);
    }, undefined, this);

    // Destroy after 4 seconds
    this.time.delayedCall(4000, () => { if (proj.active) proj.destroy(); });
  }

  private checkFakeFloors(): void {
    for (const key of this.fakeFloorKeys) {
      const ff = this.fakeFloorMap.get(key);
      if (!ff || ff.triggered) continue;
      const bounds = ff.sprite.getBounds();
      const playerBounds = this.player.getBounds();

      // Check horizontal overlap first
      const hOverlap = playerBounds.right > bounds.left + 4 && playerBounds.left < bounds.right - 4;
      if (!hOverlap) continue;

      // Trigger 1: Player standing ON TOP of fake floor
      const standingOn = this.playerBody.blocked.down &&
        playerBounds.bottom >= bounds.top - 2 &&
        playerBounds.bottom <= bounds.top + 8;

      // Trigger 2: Player's HEAD hits fake floor from BELOW
      const headHit = this.playerBody.velocity.y < 0 &&
        playerBounds.top <= bounds.bottom + 2 &&
        playerBounds.top >= bounds.bottom - 12;

      if (standingOn || headHit) {
        ff.triggered = true;
        // Crumble animation
        this.tweens.add({
          targets: ff.sprite, alpha: 0, scaleX: 0.5, scaleY: 0.5,
          duration: 400, ease: 'Power2',
          onComplete: () => { if (ff.sprite.active) ff.sprite.destroy(); },
        });
        // Disable physics body quickly
        this.time.delayedCall(100, () => {
          const body = ff.sprite.body as Phaser.Physics.Arcade.StaticBody;
          if (body) body.enable = false;
        });
      }
    }
  }

  private vaultHasPlacedCoins(): boolean {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.vault.grid[r]?.[c]?.hasCoin) return true;
      }
    }
    return false;
  }

  private checkWinCondition(): void {
    if (!this.exitZone || !this.player.active) return;
    const exitBounds = this.exitZone.getBounds();
    const playerBounds = this.player.getBounds();
    // Check if player overlaps with exit door
    if (
      playerBounds.right > exitBounds.left + 8 &&
      playerBounds.left < exitBounds.right - 8 &&
      playerBounds.bottom > exitBounds.top + 8 &&
      playerBounds.top < exitBounds.bottom - 8
    ) {
      this.gameOver = true;
      this.playExitAnimation();
    }
  }

  private createExitDoor(x: number, y: number): void {
    // Container for all exit door visuals
    this.exitDoor = this.add.container(x + CELL_SIZE / 2, y + CELL_SIZE / 2);

    // Glowing aura behind the door
    const glow = this.add.graphics();
    glow.fillStyle(COLORS.EXIT_GOLD, 0.2);
    glow.fillCircle(0, 0, CELL_SIZE * 0.7);
    this.exitDoor.add(glow);

    // Door frame
    const frame = this.add.graphics();
    frame.fillStyle(COLORS.EXIT_GOLD, 0.9);
    frame.fillRoundedRect(-CELL_SIZE / 2 + 4, -CELL_SIZE / 2 + 4, CELL_SIZE - 8, CELL_SIZE - 8, 6);
    frame.fillStyle(0xb8860b, 1);
    frame.fillRoundedRect(-CELL_SIZE / 2 + 8, -CELL_SIZE / 2 + 8, CELL_SIZE - 16, CELL_SIZE - 16, 4);
    // Door handle
    frame.fillStyle(COLORS.ACCENT_GOLD, 1);
    frame.fillCircle(10, 0, 3);
    // Keyhole
    frame.fillStyle(0x333333, 1);
    frame.fillCircle(10, 0, 1.5);
    this.exitDoor.add(frame);

    // Door label
    const label = this.add.text(0, -CELL_SIZE / 2 - 10, '🚩 EXIT', {
      fontSize: '10px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.exitDoor.add(label);

    // Pulsing glow animation
    this.tweens.add({
      targets: glow, scaleX: 1.3, scaleY: 1.3, alpha: 0.5,
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Invisible collision zone for win detection
    this.exitZone = this.add.rectangle(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE - 8, CELL_SIZE - 8, 0x000000, 0);
  }

  private playExitAnimation(): void {
    if (!this.exitDoor) {
      this.handleVictory();
      return;
    }

    // Freeze player
    this.playerBody.setVelocity(0, 0);
    this.playerBody.setAllowGravity(false);

    // Player walks to exit door
    this.tweens.add({
      targets: this.player,
      x: this.exitDoor.x,
      y: this.exitDoor.y,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        // Door opens — golden flash
        const flash = this.add.graphics().setDepth(90);
        flash.fillStyle(COLORS.ACCENT_GOLD, 0);
        flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        this.tweens.add({
          targets: flash, alpha: { from: 0, to: 0.8 },
          duration: 300, yoyo: true,
          onComplete: () => {
            flash.destroy();
            // Player disappears into the door
            this.tweens.add({
              targets: this.player,
              scaleX: 0, scaleY: 0, alpha: 0, angle: 360,
              duration: 500, ease: 'Power3',
              onComplete: () => {
                // Door explodes with particles
                if (this.exitDoor) {
                  for (let i = 0; i < 12; i++) {
                    const spark = this.add.rectangle(
                      this.exitDoor.x, this.exitDoor.y,
                      6, 6, COLORS.ACCENT_GOLD, 1,
                    );
                    this.tweens.add({
                      targets: spark,
                      x: spark.x + (Math.random() - 0.5) * 200,
                      y: spark.y + (Math.random() - 0.5) * 200,
                      alpha: 0, scaleX: 0, scaleY: 0,
                      duration: 600 + Math.random() * 400,
                      ease: 'Power2',
                      onComplete: () => spark.destroy(),
                    });
                  }
                  this.exitDoor.destroy();
                }

                // Show victory after animation
                this.time.delayedCall(400, () => this.handleVictory());
              },
            });
          },
        });
      },
    });
  }

  private onCoinCollect = (_p: any, coin: any): void => {
    if (!coin.active) return;
    coin.destroy();
    this.coinsCollected++;
    this.coinCountText.setText(this.coinsCollected.toString());
    try { AudioManager.getInstance().playCoinPickup(); } catch (_) {}
    const popup = this.add.text(coin.x, coin.y, `+${CURRENCY.LOOT_COIN_VALUE}`, { fontSize: '14px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold' }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: popup, y: popup.y - 30, alpha: 0, duration: 600, ease: 'Power2', onComplete: () => popup.destroy() });
  };

  private onHazardHit = (_p: any, hazard: any): void => {
    if (Date.now() < this.invincibleUntil) return;
    if ((hazard as any).isSpring) {
      this.playerBody.setVelocityY(-500);
      try { AudioManager.getInstance().playJump(); } catch (_) {}
      return;
    }
    // Bomb trigger — activate ticking countdown
    if ((hazard as any).isBombTrigger) {
      const trapRef = (hazard as any).trapRef;
      if (trapRef && (trapRef as any).bombState === 'dormant') {
        (trapRef as any).bombState = 'ticking';
        (trapRef as any).bombFuseTime = 0;
        const body = hazard.body as Phaser.Physics.Arcade.StaticBody;
        if (body) body.enable = false;
        try { AudioManager.getInstance().playHit(); } catch (_) {}

        // Show "RUN!" warning above player
        const warning = this.add.text(this.player.x, this.player.y - 40, '⚠️ BOMB! RUN!', {
          fontSize: '18px', fontFamily: 'Arial', color: '#ff0000', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(70);
        this.tweens.add({
          targets: warning, y: warning.y - 40, alpha: 0,
          duration: 1500, ease: 'Power2',
          onComplete: () => warning.destroy(),
        });
      }
      return;
    }
    this.takeDamage((hazard as any).trapDamage || 1);
  };

  private onProjectileHit = (_p: any, proj: any): void => {
    if (Date.now() < this.invincibleUntil) return;
    if (proj.active) proj.destroy();
    this.takeDamage(1);
  };

  private takeDamage(amount: number): void {
    if (Date.now() < this.invincibleUntil) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invincibleUntil = Date.now() + PLAYER.INVINCIBLE_MS;
    for (let i = 0; i < PLAYER.MAX_HP; i++) {
      if (this.heartSprites[i]?.active) this.heartSprites[i].setTexture(i < this.hp ? 'heart' : 'heart_empty');
    }
    try { AudioManager.getInstance().playHit(); } catch (_) {}
    this.cameras.main.shake(200, 0.01);
    this.player.setTint(0xff0000);
    this.time.delayedCall(200, () => { if (this.player.active) this.player.clearTint(); });
    this.playerBody.setVelocityY(-200);
    ReplayManager.getInstance().recordFrame(this.player.x, this.player.y, 0, 0, 'hit');
    if (this.hp <= 0) { this.isAlive = false; this.gameOver = true; this.handleDefeat(); }
  }

  private handleVictory(): void {
    try { AudioManager.getInstance().playSuccess(); } catch (_) {}
    const earnedCoins = this.coinsCollected * CURRENCY.LOOT_COIN_VALUE + CURRENCY.RAID_SUCCESS_COINS;
    const earnedXP = CURRENCY.RAID_SUCCESS_XP;
    if (!this.isTest) {
      CurrencyManager.getInstance().addCoins(earnedCoins);
      const result = ProgressionManager.getInstance().addXP(earnedXP);
      ProgressionManager.getInstance().recordRaid(true);
      VaultManager.getInstance().recordRaidAttempt(this.vault.id, true, this.elapsedMs, this.coinsCollected);

      // Track this vault as completed so user can't raid it again
      const save = SaveManager.getInstance();
      const completed = save.getData().completedRaidVaults || [];
      if (!completed.includes(this.vault.id)) {
        completed.push(this.vault.id);
        save.updateData({ completedRaidVaults: completed });
      }

      const replay = ReplayManager.getInstance().createReplayData(this.vault.id, this.vault.name, SaveManager.getInstance().getData().playerId, SaveManager.getInstance().getData().playerName, true, this.elapsedMs, this.coinsCollected, PLAYER.MAX_HP - this.hp);
      const replays = SaveManager.getInstance().loadReplays();
      replays.push(replay);
      SaveManager.getInstance().saveReplays(replays);
      if (result.leveledUp) try { AudioManager.getInstance().playLevelUp(); } catch (_) {}

      // Update leaderboard
      const sData = SaveManager.getInstance().getData();
      VaultService.getInstance().savePlayerProfile(sData.playerId, {
        playerName: sData.playerName, level: sData.level, xp: sData.xp,
        totalRaids: sData.totalRaids, totalSuccessfulRaids: sData.totalSuccessfulRaids,
      }).catch(() => {});
    }
    // Check achievements
    const newAchievements = AchievementManager.getInstance().checkAchievements();
    this.showEndScreen(true, earnedCoins, earnedXP, newAchievements);
  }

  private handleDefeat(): void {
    try { AudioManager.getInstance().playFail(); } catch (_) {}
    const earnedCoins = this.coinsCollected * CURRENCY.LOOT_COIN_VALUE + CURRENCY.RAID_FAIL_COINS;
    const earnedXP = CURRENCY.RAID_FAIL_XP;
    if (!this.isTest) {
      CurrencyManager.getInstance().addCoins(earnedCoins);
      ProgressionManager.getInstance().addXP(earnedXP);
      ProgressionManager.getInstance().recordRaid(false);
      VaultManager.getInstance().recordRaidAttempt(this.vault.id, false, this.elapsedMs, this.coinsCollected);
      ReplayManager.getInstance().recordFrame(this.player.x, this.player.y, 0, 0, 'death');
      const replay = ReplayManager.getInstance().createReplayData(this.vault.id, this.vault.name, SaveManager.getInstance().getData().playerId, SaveManager.getInstance().getData().playerName, false, this.elapsedMs, this.coinsCollected, PLAYER.MAX_HP - this.hp);
      const replays = SaveManager.getInstance().loadReplays();
      replays.push(replay);
      SaveManager.getInstance().saveReplays(replays);
    }
    this.tweens.add({ targets: this.player, angle: 360, alpha: 0, y: this.player.y - 50, duration: 800, ease: 'Power2' });
    this.showEndScreen(false, earnedCoins, earnedXP, []);
  }

  private showEndScreen(success: boolean, coins: number, xp: number, achievements: any[] = []): void {
    // Stop camera following
    this.cameras.main.stopFollow();

    const overlay = this.add.graphics().setDepth(100).setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const hasAch = achievements.length > 0;
    const panelH = hasAch ? 340 : 280;
    const panelY = GAME_HEIGHT / 2 - panelH / 2 + 40;

    const panel = this.add.graphics().setDepth(101).setScrollFactor(0);
    panel.fillStyle(COLORS.BG_PANEL, 0.95);
    panel.fillRoundedRect(40, panelY - 100, GAME_WIDTH - 80, panelH, 20);
    panel.lineStyle(2, success ? COLORS.ACCENT_GOLD : COLORS.ACCENT_RED, 0.5);
    panel.strokeRoundedRect(40, panelY - 100, GAME_WIDTH - 80, panelH, 20);

    this.add.text(GAME_WIDTH / 2, panelY - 60, success ? '🏆' : '💀', { fontSize: '40px' }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
    this.add.text(GAME_WIDTH / 2, panelY - 15, success ? 'HEIST COMPLETE!' : 'BUSTED!', {
      fontSize: '24px', fontFamily: 'Arial', color: success ? COLORS.TEXT_GOLD : '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);

    const secs = Math.floor(this.elapsedMs / 1000);
    this.add.text(GAME_WIDTH / 2, panelY + 20, `⏱ ${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`, { fontSize: '15px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
    this.add.text(GAME_WIDTH / 2, panelY + 45, `🪙 +${coins}`, { fontSize: '15px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
    this.add.text(GAME_WIDTH / 2, panelY + 70, `⭐ +${xp} XP`, { fontSize: '15px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN }).setOrigin(0.5).setDepth(102).setScrollFactor(0);

    if (this.isTest) this.add.text(GAME_WIDTH / 2, panelY + 95, '(Test Mode)', { fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY }).setOrigin(0.5).setDepth(102).setScrollFactor(0);

    // Show unlocked achievements
    if (hasAch) {
      let achY = panelY + (this.isTest ? 115 : 100);
      this.add.text(GAME_WIDTH / 2, achY, '🎖️ ACHIEVEMENT UNLOCKED!', {
        fontSize: '14px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
      achY += 20;
      for (const ach of achievements.slice(0, 3)) {
        this.add.text(GAME_WIDTH / 2, achY, `${ach.icon} ${ach.name}`, {
          fontSize: '13px', fontFamily: 'Arial', color: '#ffffff',
        }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
        achY += 18;
      }
    }

    const btnY = panelY + panelH - 160;
    const retryBtn = new Button(this, { x: GAME_WIDTH / 2 - 80, y: btnY, width: 120, height: 42, text: '🔄 Retry', fontSize: 15, bgColor: 0x2980b9, onClick: () => this.scene.restart({ vault: this.vault, isTest: this.isTest }) });
    retryBtn.getContainer().setDepth(103).setScrollFactor(0);
    const menuBtn = new Button(this, { x: GAME_WIDTH / 2 + 80, y: btnY, width: 120, height: 42, text: '🏠 Menu', fontSize: 15, bgColor: COLORS.BG_PANEL, onClick: () => this.scene.start(SCENES.MAIN_MENU) });
    menuBtn.getContainer().setDepth(103).setScrollFactor(0);
  }
}
