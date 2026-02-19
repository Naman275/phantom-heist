// ============================================================
// Vault Builder Scene — Design trap-filled vaults
// ============================================================
import Phaser from 'phaser';
import {
  SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS,
  GRID_COLS, GRID_ROWS, CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y,
  TrapType, TRAP_DATA, CellType, VaultData, VaultCell,
} from '../config/constants';
import { Button } from '../ui/Button';
import { HUD } from '../ui/HUD';
import { VaultManager } from '../managers/VaultManager';
import { CurrencyManager } from '../managers/CurrencyManager';
import { AudioManager } from '../managers/AudioManager';

type BuildTool = 'platform' | 'erase' | TrapType;

export class VaultBuilderScene extends Phaser.Scene {
  private hud!: HUD;
  private vault!: VaultData;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private selectedTool: BuildTool = 'platform';
  private toolButtons: Map<string, Button> = new Map();
  private toolIndicator!: Phaser.GameObjects.Text;
  private gridContainer!: Phaser.GameObjects.Container;
  private isDragging = false;

  constructor() {
    super({ key: SCENES.VAULT_BUILDER });
  }

  create(): void {
    // Get or create vault
    const vm = VaultManager.getInstance();
    const myVaults = vm.getMyVaults();

    if (myVaults.length > 0) {
      this.vault = myVaults[myVaults.length - 1];
    } else {
      this.vault = vm.createNewVault('My First Vault');
    }

    // ---- Header ----
    this.hud = new HUD(this);

    this.add.text(GAME_WIDTH / 2, 70, '🏗️ VAULT BUILDER', {
      fontSize: '20px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 90, this.vault.name, {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5);

    // Back button
    new Button(this, {
      x: 40, y: 68, width: 60, height: 30,
      text: '← Back', fontSize: 12,
      bgColor: COLORS.BG_PANEL,
      onClick: () => {
        VaultManager.getInstance().saveVault(this.vault);
        this.scene.start(SCENES.MAIN_MENU);
      },
    });

    // ---- Grid Area ----
    const gridOffsetY = 110;
    this.gridContainer = this.add.container(GRID_OFFSET_X, gridOffsetY);
    this.gridGraphics = this.add.graphics();
    this.gridContainer.add(this.gridGraphics);

    // Draw grid and set up interaction
    this.drawGrid();
    this.setupGridInteraction(gridOffsetY);

    // ---- Tool Palette ----
    const paletteY = gridOffsetY + GRID_ROWS * CELL_SIZE + 20;
    this.createToolPalette(paletteY);

    // ---- Action Buttons ----
    const actionY = GAME_HEIGHT - 70;

    new Button(this, {
      x: GAME_WIDTH / 2 - 120, y: actionY,
      width: 100, height: 40,
      text: '🧪 Test', fontSize: 14,
      bgColor: 0x2980b9,
      onClick: () => {
        VaultManager.getInstance().saveVault(this.vault);
        this.scene.start(SCENES.RAID, { vault: this.vault, isTest: true });
      },
    });

    new Button(this, {
      x: GAME_WIDTH / 2, y: actionY,
      width: 100, height: 40,
      text: '📤 Publish', fontSize: 14,
      bgColor: COLORS.ACCENT_GREEN,
      onClick: () => this.publishVault(),
    });

    new Button(this, {
      x: GAME_WIDTH / 2 + 120, y: actionY,
      width: 100, height: 40,
      text: '🗑️ Clear', fontSize: 14,
      bgColor: COLORS.ACCENT_RED,
      onClick: () => this.clearGrid(),
    });

    // New vault button
    new Button(this, {
      x: GAME_WIDTH / 2, y: actionY + 50,
      width: 200, height: 36,
      text: '➕ New Vault', fontSize: 13,
      bgColor: COLORS.BG_PANEL,
      onClick: () => {
        const name = 'Vault ' + (VaultManager.getInstance().getMyVaults().length + 1);
        this.vault = VaultManager.getInstance().createNewVault(name);
        this.drawGrid();
      },
    });

    // Selected tool indicator
    this.toolIndicator = this.add.text(GAME_WIDTH / 2, paletteY - 10, 'Tool: Platform', {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private createToolPalette(startY: number): void {
    const tools: { key: BuildTool; label: string; color: number; cost?: number }[] = [
      { key: 'platform', label: '⬛ Floor', color: COLORS.PLATFORM },
      { key: 'erase', label: '✖ Erase', color: 0x666666 },
      { key: TrapType.SPIKES, label: '▲ Spikes', color: TRAP_DATA[TrapType.SPIKES].color, cost: 0 },
      { key: TrapType.LASER, label: '═ Laser', color: TRAP_DATA[TrapType.LASER].color, cost: 50 },
      { key: TrapType.SPRING, label: '⌇ Spring', color: TRAP_DATA[TrapType.SPRING].color, cost: 100 },
      { key: TrapType.FAKE_FLOOR, label: '▒ Fake', color: TRAP_DATA[TrapType.FAKE_FLOOR].color, cost: 150 },
      { key: TrapType.TURRET, label: '◉ Turret', color: TRAP_DATA[TrapType.TURRET].color, cost: 200 },
      { key: TrapType.SAW_BLADE, label: '⚙ Saw', color: TRAP_DATA[TrapType.SAW_BLADE].color, cost: 300 },
    ];

    const cols = 4;
    const btnW = 105;
    const btnH = 38;
    const gap = 10;
    const totalW = cols * btnW + (cols - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + btnW / 2;

    tools.forEach((tool, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gap);
      const y = startY + 20 + row * (btnH + gap);

      const btn = new Button(this, {
        x, y, width: btnW, height: btnH,
        text: tool.label,
        fontSize: 12,
        bgColor: this.selectedTool === tool.key ? tool.color : COLORS.BG_PANEL,
        hoverColor: tool.color,
        onClick: () => {
          this.selectedTool = tool.key;
          this.updateToolIndicator();
          AudioManager.getInstance().playClick();
        },
      });
      this.toolButtons.set(tool.key, btn);
    });
  }

  private updateToolIndicator(): void {
    const names: Record<string, string> = {
      platform: 'Platform',
      erase: 'Erase',
      [TrapType.SPIKES]: 'Spikes (Free)',
      [TrapType.LASER]: 'Laser (50 coins)',
      [TrapType.SPRING]: 'Spring (100 coins)',
      [TrapType.FAKE_FLOOR]: 'Fake Floor (150 coins)',
      [TrapType.TURRET]: 'Turret (200 coins)',
      [TrapType.SAW_BLADE]: 'Saw Blade (300 coins)',
    };
    this.toolIndicator.setText(`Tool: ${names[this.selectedTool] || this.selectedTool}`);
  }

  private setupGridInteraction(gridOffsetY: number): void {
    // Create interactive zone over the grid
    const zone = this.add.zone(
      GRID_OFFSET_X + (GRID_COLS * CELL_SIZE) / 2,
      gridOffsetY + (GRID_ROWS * CELL_SIZE) / 2,
      GRID_COLS * CELL_SIZE,
      GRID_ROWS * CELL_SIZE,
    ).setInteractive();

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.handleGridClick(pointer.x - GRID_OFFSET_X, pointer.y - gridOffsetY);
    });

    zone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.isDown) {
        this.handleGridClick(pointer.x - GRID_OFFSET_X, pointer.y - gridOffsetY);
      }
    });

    zone.on('pointerup', () => { this.isDragging = false; });
    zone.on('pointerout', () => { this.isDragging = false; });
  }

  private handleGridClick(localX: number, localY: number): void {
    const col = Math.floor(localX / CELL_SIZE);
    const row = Math.floor(localY / CELL_SIZE);

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    const cell = this.vault.grid[row][col];
    const currency = CurrencyManager.getInstance();

    if (this.selectedTool === 'erase') {
      cell.cellType = CellType.EMPTY;
      cell.trapType = null;
      AudioManager.getInstance().playClick();
    } else if (this.selectedTool === 'platform') {
      cell.cellType = CellType.PLATFORM;
      cell.trapType = null;
      AudioManager.getInstance().playTrapPlace();
    } else {
      // It's a trap type
      const trapType = this.selectedTool as TrapType;
      const trapInfo = TRAP_DATA[trapType];

      // Check if player can afford it
      if (trapInfo.coinCost > 0 && !currency.canAffordCoins(trapInfo.coinCost)) {
        // Flash red indicator
        this.toolIndicator.setColor('#ff4444');
        this.toolIndicator.setText('Not enough coins!');
        this.time.delayedCall(1000, () => {
          this.toolIndicator.setColor(COLORS.TEXT_CYAN);
          this.updateToolIndicator();
        });
        return;
      }

      // Only place on platform
      if (cell.trapType === trapType) return; // Already placed
      if (cell.cellType !== CellType.PLATFORM) {
        // Auto-place platform underneath
        cell.cellType = CellType.PLATFORM;
      }

      // Charge coins
      if (trapInfo.coinCost > 0) {
        currency.spendCoins(trapInfo.coinCost);
        this.hud.refresh();
      }

      cell.trapType = trapType;
      AudioManager.getInstance().playTrapPlace();
    }

    this.drawGrid();
    VaultManager.getInstance().saveVault(this.vault);
  }

  private drawGrid(): void {
    this.gridGraphics.clear();

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;
        const cell = this.vault.grid[row][col];

        // Cell background
        if (cell.cellType === CellType.PLATFORM) {
          this.gridGraphics.fillStyle(COLORS.PLATFORM, 1);
          this.gridGraphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          // Top edge
          this.gridGraphics.fillStyle(COLORS.PLATFORM_EDGE, 1);
          this.gridGraphics.fillRect(x, y, CELL_SIZE, 3);
        } else {
          this.gridGraphics.fillStyle(COLORS.BG_CELL, 0.4);
          this.gridGraphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }

        // Grid lines
        this.gridGraphics.lineStyle(1, 0xffffff, 0.08);
        this.gridGraphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        // Draw trap
        if (cell.trapType) {
          this.drawTrapInCell(x, y, cell.trapType);
        }

        // Entrance marker (column 0, bottom row)
        if (col === 0 && row === GRID_ROWS - 1) {
          this.gridGraphics.lineStyle(2, COLORS.ENTRANCE_GREEN, 0.8);
          this.gridGraphics.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
        // Exit marker (column 9, bottom row)
        if (col === GRID_COLS - 1 && row === GRID_ROWS - 1) {
          this.gridGraphics.lineStyle(2, COLORS.EXIT_GOLD, 0.8);
          this.gridGraphics.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      }
    }

    // Entrance/Exit labels
    this.gridGraphics.lineStyle(1, 0x000000, 0);
  }

  private drawTrapInCell(x: number, y: number, trapType: TrapType): void {
    const info = TRAP_DATA[trapType];
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;

    this.gridGraphics.fillStyle(info.color, 0.8);

    switch (trapType) {
      case TrapType.SPIKES:
        // Draw small triangles
        for (let i = 0; i < 3; i++) {
          const sx = x + 8 + i * 14;
          this.gridGraphics.fillTriangle(sx, y + CELL_SIZE - 4, sx + 12, y + CELL_SIZE - 4, sx + 6, y + 10);
        }
        break;

      case TrapType.LASER:
        this.gridGraphics.fillRect(x + 2, cy - 2, 6, 6);
        this.gridGraphics.fillRect(x + CELL_SIZE - 8, cy - 2, 6, 6);
        this.gridGraphics.lineStyle(2, info.color, 0.5);
        this.gridGraphics.lineBetween(x + 8, cy, x + CELL_SIZE - 8, cy);
        this.gridGraphics.lineStyle(1, 0x000000, 0);
        break;

      case TrapType.SPRING:
        this.gridGraphics.fillRect(cx - 10, y + CELL_SIZE - 8, 20, 8);
        this.gridGraphics.lineStyle(2, info.color, 0.9);
        this.gridGraphics.lineBetween(cx - 6, y + CELL_SIZE - 10, cx + 6, y + CELL_SIZE - 16);
        this.gridGraphics.lineBetween(cx + 6, y + CELL_SIZE - 16, cx - 6, y + CELL_SIZE - 22);
        this.gridGraphics.lineStyle(1, 0x000000, 0);
        break;

      case TrapType.FAKE_FLOOR:
        // Looks like platform but with subtle cracks
        this.gridGraphics.lineStyle(1, 0x000000, 0.3);
        this.gridGraphics.lineBetween(x + 10, y + 6, x + 18, y + CELL_SIZE - 6);
        this.gridGraphics.lineBetween(x + 28, y + 8, x + 34, y + CELL_SIZE - 4);
        // Warning color overlay
        this.gridGraphics.fillStyle(TRAP_DATA[TrapType.FAKE_FLOOR].color, 0.25);
        this.gridGraphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        this.gridGraphics.lineStyle(1, 0x000000, 0);
        break;

      case TrapType.TURRET:
        this.gridGraphics.fillRect(cx - 8, y + CELL_SIZE - 18, 16, 16);
        this.gridGraphics.fillStyle(0x555555, 1);
        this.gridGraphics.fillRect(cx + 4, y + CELL_SIZE - 14, 14, 4);
        this.gridGraphics.fillStyle(0xff0000, 1);
        this.gridGraphics.fillCircle(cx + 17, y + CELL_SIZE - 12, 2);
        break;

      case TrapType.SAW_BLADE:
        this.gridGraphics.fillCircle(cx, cy, 12);
        this.gridGraphics.fillStyle(0xcc5500, 1);
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const px = cx + Math.cos(angle) * 12;
          const py = cy + Math.sin(angle) * 12;
          this.gridGraphics.fillTriangle(
            px, py,
            px + Math.cos(angle + 0.5) * 5, py + Math.sin(angle + 0.5) * 5,
            px + Math.cos(angle - 0.5) * 5, py + Math.sin(angle - 0.5) * 5,
          );
        }
        this.gridGraphics.fillStyle(0x333333, 1);
        this.gridGraphics.fillCircle(cx, cy, 3);
        break;
    }
  }

  private clearGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.vault.grid[row][col] = {
          cellType: row === GRID_ROWS - 1 ? CellType.PLATFORM : CellType.EMPTY,
          trapType: null,
        };
      }
    }
    this.drawGrid();
    VaultManager.getInstance().saveVault(this.vault);
  }

  private publishVault(): void {
    const vm = VaultManager.getInstance();
    if (vm.publishVault(this.vault.id)) {
      try { AudioManager.getInstance().playSuccess(); } catch (_) {}
      this.toolIndicator.setText('✅ Vault Published!');
      this.toolIndicator.setColor('#2ecc71');
      this.time.delayedCall(2000, () => {
        this.toolIndicator.setColor(COLORS.TEXT_CYAN);
        this.updateToolIndicator();
      });
    } else {
      this.toolIndicator.setText('❌ Add platforms & at least 1 trap!');
      this.toolIndicator.setColor('#ff4444');
      this.time.delayedCall(2000, () => {
        this.toolIndicator.setColor(COLORS.TEXT_CYAN);
        this.updateToolIndicator();
      });
    }
  }
}
