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
  private timerText!: Phaser.GameObjects.Text;
  private coinCountText!: Phaser.GameObjects.Text;
  private coinsCollected = 0;
  private moveLeft = false;
  private moveRight = false;
  private jumpPressed = false;
  private startTime = 0;
  private elapsedMs = 0;
  private gameOver = false;
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
    this.moveLeft = false;
    this.moveRight = false;
    this.jumpPressed = false;

    if (!this.vault || !this.vault.grid) {
      this.scene.start(SCENES.MAIN_MENU);
      return;
    }

    this.physics.world.gravity.y = PLAYER.GRAVITY;
    this.physics.world.setBounds(0, 0, GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE + this.gridOffsetY + CELL_SIZE);

    this.platforms = this.physics.add.staticGroup();
    this.coins = this.physics.add.staticGroup();
    this.hazardZones = this.physics.add.staticGroup();
    this.movingHazards = this.physics.add.group({ allowGravity: false });
    this.projectiles = this.physics.add.group({ allowGravity: false });

    this.buildLevel();

    const spawnRow = this.findSpawnRow(0);
    const spawnX = CELL_SIZE / 2;
    const spawnY = this.gridOffsetY + spawnRow * CELL_SIZE - PLAYER.HEIGHT / 2;

    this.player = this.add.sprite(spawnX, spawnY, 'player');
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setSize(PLAYER.WIDTH - 4, PLAYER.HEIGHT - 2);
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setMaxVelocity(PLAYER.SPEED, 600);

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

    new Button(this, {
      x: GAME_WIDTH - 40, y: 24,
      width: 60, height: 28,
      text: '✕ Exit', fontSize: 11,
      bgColor: 0x444444,
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    }).getContainer().setDepth(55);
  }

  private findSpawnRow(col: number): number {
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (this.vault.grid[row]?.[col]?.cellType === CellType.PLATFORM) return row;
    }
    return GRID_ROWS - 1;
  }

  private buildLevel(): void {
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_DARK, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

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

        if (!cell.trapType && cell.cellType === CellType.EMPTY && Math.random() < 0.12) {
          const coin = this.add.sprite(x + CELL_SIZE / 2, y + CELL_SIZE / 2 - 8, 'coin');
          coin.setDisplaySize(16, 16);
          this.physics.add.existing(coin, true);
          this.coins.add(coin);
          this.tweens.add({ targets: coin, y: coin.y - 5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }

        if (col === 0 && row === GRID_ROWS - 1) {
          const ent = this.add.graphics();
          ent.lineStyle(2, COLORS.ENTRANCE_GREEN, 0.6);
          ent.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
        if (col === GRID_COLS - 1 && row === GRID_ROWS - 1) {
          const ext = this.add.graphics();
          ext.fillStyle(COLORS.EXIT_GOLD, 0.3);
          ext.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          ext.lineStyle(2, COLORS.EXIT_GOLD, 0.8);
          ext.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      }
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
    }
    this.activeTraps.push(trap);
  }

  private createUI(): void {
    const topBar = this.add.graphics().setDepth(50);
    topBar.fillStyle(0x000000, 0.7);
    topBar.fillRect(0, 0, GAME_WIDTH, 48);

    this.heartSprites = [];
    for (let i = 0; i < PLAYER.MAX_HP; i++) {
      const heart = this.add.sprite(20 + i * 28, 24, 'heart').setDisplaySize(22, 20).setDepth(51);
      this.heartSprites.push(heart);
    }

    this.timerText = this.add.text(GAME_WIDTH / 2, 24, '0:00', {
      fontSize: '18px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    this.add.text(GAME_WIDTH - 110, 16, '🪙', { fontSize: '16px' }).setDepth(51);
    this.coinCountText = this.add.text(GAME_WIDTH - 90, 24, '0', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(51);

    this.add.text(GAME_WIDTH / 2, 42, this.vault.name, {
      fontSize: '10px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5).setDepth(51);
  }

  private createTouchControls(): void {
    const controlsY = GAME_HEIGHT - 90;
    const btnSize = 70;

    const ctrlBg = this.add.graphics().setDepth(50);
    ctrlBg.fillStyle(0x000000, 0.3);
    ctrlBg.fillRect(0, GAME_HEIGHT - 140, GAME_WIDTH, 140);

    const leftBtn = this.add.graphics().setDepth(51);
    leftBtn.fillStyle(0xffffff, 0.15);
    leftBtn.fillCircle(65, controlsY, btnSize / 2);
    leftBtn.fillStyle(0xffffff, 0.3);
    leftBtn.fillTriangle(48, controlsY, 75, controlsY - 18, 75, controlsY + 18);
    const leftZone = this.add.zone(65, controlsY, btnSize, btnSize).setDepth(52).setInteractive();
    leftZone.on('pointerdown', () => { this.moveLeft = true; });
    leftZone.on('pointerup', () => { this.moveLeft = false; });
    leftZone.on('pointerout', () => { this.moveLeft = false; });

    const rightBtn = this.add.graphics().setDepth(51);
    rightBtn.fillStyle(0xffffff, 0.15);
    rightBtn.fillCircle(170, controlsY, btnSize / 2);
    rightBtn.fillStyle(0xffffff, 0.3);
    rightBtn.fillTriangle(187, controlsY, 160, controlsY - 18, 160, controlsY + 18);
    const rightZone = this.add.zone(170, controlsY, btnSize, btnSize).setDepth(52).setInteractive();
    rightZone.on('pointerdown', () => { this.moveRight = true; });
    rightZone.on('pointerup', () => { this.moveRight = false; });
    rightZone.on('pointerout', () => { this.moveRight = false; });

    const jumpBtn = this.add.graphics().setDepth(51);
    jumpBtn.fillStyle(COLORS.ACCENT_CYAN, 0.2);
    jumpBtn.fillCircle(GAME_WIDTH - 75, controlsY, btnSize / 2 + 8);
    jumpBtn.fillStyle(COLORS.ACCENT_CYAN, 0.4);
    jumpBtn.fillTriangle(GAME_WIDTH - 75, controlsY - 22, GAME_WIDTH - 92, controlsY + 8, GAME_WIDTH - 58, controlsY + 8);
    const jumpZone = this.add.zone(GAME_WIDTH - 75, controlsY, btnSize + 16, btnSize + 16).setDepth(52).setInteractive();
    jumpZone.on('pointerdown', () => { this.jumpPressed = true; });
    jumpZone.on('pointerup', () => { this.jumpPressed = false; });
    jumpZone.on('pointerout', () => { this.jumpPressed = false; });

    this.add.text(65, controlsY + 42, '◀', { fontSize: '14px', color: '#888' }).setOrigin(0.5).setDepth(51);
    this.add.text(170, controlsY + 42, '▶', { fontSize: '14px', color: '#888' }).setOrigin(0.5).setDepth(51);
    this.add.text(GAME_WIDTH - 75, controlsY + 42, 'JUMP', { fontSize: '12px', fontFamily: 'Arial', color: '#88ddff' }).setOrigin(0.5).setDepth(51);
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || !this.isAlive) return;

    if (this.moveLeft) {
      this.playerBody.setVelocityX(-PLAYER.SPEED);
      this.player.setFlipX(true);
    } else if (this.moveRight) {
      this.playerBody.setVelocityX(PLAYER.SPEED);
      this.player.setFlipX(false);
    } else {
      this.playerBody.setVelocityX(0);
    }

    if (this.jumpPressed && this.playerBody.blocked.down) {
      this.playerBody.setVelocityY(PLAYER.JUMP_VELOCITY);
      try { AudioManager.getInstance().playJump(); } catch (_) {}
    }

    this.elapsedMs = Date.now() - this.startTime;
    const secs = Math.floor(this.elapsedMs / 1000);
    const mins = Math.floor(secs / 60);
    this.timerText.setText(`${mins}:${(secs % 60).toString().padStart(2, '0')}`);

    this.updateTraps(delta);

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
        const spawnRow = this.findSpawnRow(0);
        this.player.setPosition(CELL_SIZE / 2, this.gridOffsetY + spawnRow * CELL_SIZE - PLAYER.HEIGHT / 2);
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

  private checkWinCondition(): void {
    if (this.player.x >= (GRID_COLS - 1) * CELL_SIZE) {
      this.gameOver = true;
      this.handleVictory();
    }
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
      const replay = ReplayManager.getInstance().createReplayData(this.vault.id, this.vault.name, SaveManager.getInstance().getData().playerId, SaveManager.getInstance().getData().playerName, true, this.elapsedMs, this.coinsCollected, PLAYER.MAX_HP - this.hp);
      const replays = SaveManager.getInstance().loadReplays();
      replays.push(replay);
      SaveManager.getInstance().saveReplays(replays);
      if (result.leveledUp) try { AudioManager.getInstance().playLevelUp(); } catch (_) {}
    }
    this.showEndScreen(true, earnedCoins, earnedXP);
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
    this.showEndScreen(false, earnedCoins, earnedXP);
  }

  private showEndScreen(success: boolean, coins: number, xp: number): void {
    const overlay = this.add.graphics().setDepth(100);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const panelY = GAME_HEIGHT / 2 - 60;
    const panel = this.add.graphics().setDepth(101);
    panel.fillStyle(COLORS.BG_PANEL, 0.95);
    panel.fillRoundedRect(40, panelY - 100, GAME_WIDTH - 80, 280, 20);
    panel.lineStyle(2, success ? COLORS.ACCENT_GOLD : COLORS.ACCENT_RED, 0.5);
    panel.strokeRoundedRect(40, panelY - 100, GAME_WIDTH - 80, 280, 20);

    this.add.text(GAME_WIDTH / 2, panelY - 60, success ? '🏆' : '💀', { fontSize: '40px' }).setOrigin(0.5).setDepth(102);
    this.add.text(GAME_WIDTH / 2, panelY - 15, success ? 'HEIST COMPLETE!' : 'BUSTED!', {
      fontSize: '24px', fontFamily: 'Arial', color: success ? COLORS.TEXT_GOLD : '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    const secs = Math.floor(this.elapsedMs / 1000);
    this.add.text(GAME_WIDTH / 2, panelY + 20, `⏱ ${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`, { fontSize: '15px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE }).setOrigin(0.5).setDepth(102);
    this.add.text(GAME_WIDTH / 2, panelY + 45, `🪙 +${coins}`, { fontSize: '15px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD }).setOrigin(0.5).setDepth(102);
    this.add.text(GAME_WIDTH / 2, panelY + 70, `⭐ +${xp} XP`, { fontSize: '15px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN }).setOrigin(0.5).setDepth(102);
    if (this.isTest) this.add.text(GAME_WIDTH / 2, panelY + 95, '(Test Mode)', { fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY }).setOrigin(0.5).setDepth(102);

    new Button(this, { x: GAME_WIDTH / 2 - 80, y: panelY + 140, width: 120, height: 42, text: '🔄 Retry', fontSize: 15, bgColor: 0x2980b9, onClick: () => this.scene.restart({ vault: this.vault, isTest: this.isTest }) }).getContainer().setDepth(103);
    new Button(this, { x: GAME_WIDTH / 2 + 80, y: panelY + 140, width: 120, height: 42, text: '🏠 Menu', fontSize: 15, bgColor: COLORS.BG_PANEL, onClick: () => this.scene.start(SCENES.MAIN_MENU) }).getContainer().setDepth(103);
  }
}
