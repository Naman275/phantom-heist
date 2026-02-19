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
import { VaultService } from '../firebase/vaultService';
import { SaveManager } from '../managers/SaveManager';
import { AchievementManager } from '../managers/AchievementManager';

type BuildTool = 'platform' | 'erase' | 'coin' | 'exit' | TrapType;

export class VaultBuilderScene extends Phaser.Scene {
  private hud!: HUD;
  private vault!: VaultData;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private selectedTool: BuildTool = 'platform';
  private toolButtons: Map<string, Button> = new Map();
  private toolIndicator!: Phaser.GameObjects.Text;
  private gridContainer!: Phaser.GameObjects.Container;
  private isDragging = false;
  private scrollX = 0;
  private scrollY = 0;

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

    // ---- Grid Area (scrollable viewport) ----
    const gridOffsetY = 110;
    const viewportH = 340; // visible grid area height
    this.scrollX = 0;
    this.scrollY = 0;
    this.gridContainer = this.add.container(GRID_OFFSET_X, gridOffsetY);
    this.gridGraphics = this.add.graphics();
    this.gridContainer.add(this.gridGraphics);

    // Mask the grid to viewport
    const maskShape = this.make.graphics({});
    maskShape.fillRect(0, gridOffsetY, GAME_WIDTH, viewportH);
    const mask = maskShape.createGeometryMask();
    this.gridContainer.setMask(mask);

    // Draw grid and set up interaction
    this.drawGrid();
    this.setupGridInteraction(gridOffsetY);

    // ---- Scroll Arrows ----
    const arrowY = gridOffsetY + viewportH + 5;

    new Button(this, { x: 50, y: arrowY + 12, width: 50, height: 24, text: '◀', fontSize: 16, bgColor: 0x444444,
      onClick: () => { this.scrollX = Math.max(0, this.scrollX - CELL_SIZE * 3); this.updateGridScroll(gridOffsetY); } });
    new Button(this, { x: 130, y: arrowY + 12, width: 50, height: 24, text: '▶', fontSize: 16, bgColor: 0x444444,
      onClick: () => { this.scrollX = Math.min(GRID_COLS * CELL_SIZE - GAME_WIDTH, this.scrollX + CELL_SIZE * 3); this.updateGridScroll(gridOffsetY); } });
    new Button(this, { x: 240, y: arrowY + 12, width: 50, height: 24, text: '▲', fontSize: 16, bgColor: 0x444444,
      onClick: () => { this.scrollY = Math.max(0, this.scrollY - CELL_SIZE * 3); this.updateGridScroll(gridOffsetY); } });
    new Button(this, { x: 320, y: arrowY + 12, width: 50, height: 24, text: '▼', fontSize: 16, bgColor: 0x444444,
      onClick: () => { this.scrollY = Math.min(GRID_ROWS * CELL_SIZE - viewportH, this.scrollY + CELL_SIZE * 3); this.updateGridScroll(gridOffsetY); } });

    // Scroll position label
    this.add.text(420, arrowY + 12, '📍', { fontSize: '14px' }).setOrigin(0.5);

    // ---- Tool Palette ----
    const paletteY = arrowY + 35;
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
      { key: 'coin', label: '🪙 Coin', color: COLORS.ACCENT_GOLD },
      { key: 'exit', label: '🚩 Exit', color: COLORS.EXIT_GOLD },
      { key: 'entrance', label: '🟢 Start', color: COLORS.ENTRANCE_GREEN },
      { key: TrapType.SPIKES, label: '▲ Spikes', color: TRAP_DATA[TrapType.SPIKES].color, cost: 0 },
      { key: TrapType.LASER, label: '═ Laser', color: TRAP_DATA[TrapType.LASER].color, cost: 50 },
      { key: TrapType.SPRING, label: '⌇ Spring', color: TRAP_DATA[TrapType.SPRING].color, cost: 100 },
      { key: TrapType.FAKE_FLOOR, label: '▒ Fake', color: TRAP_DATA[TrapType.FAKE_FLOOR].color, cost: 150 },
      { key: TrapType.TURRET, label: '◉ Turret', color: TRAP_DATA[TrapType.TURRET].color, cost: 200 },
      { key: TrapType.SAW_BLADE, label: '⚙ Saw', color: TRAP_DATA[TrapType.SAW_BLADE].color, cost: 300 },
      { key: TrapType.BOMB, label: '💣 Bomb', color: TRAP_DATA[TrapType.BOMB].color, cost: 400 },
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
      coin: 'Place Coin 🪙',
      exit: 'Place Exit Door 🚩 (only 1 allowed)',
      entrance: 'Place Start Point 🟢 (only 1 allowed)',
      [TrapType.SPIKES]: 'Spikes (Free)',
      [TrapType.LASER]: 'Laser (50 coins)',
      [TrapType.SPRING]: 'Spring (100 coins)',
      [TrapType.FAKE_FLOOR]: 'Fake Floor (150 coins)',
      [TrapType.TURRET]: 'Turret (200 coins)',
      [TrapType.SAW_BLADE]: 'Saw Blade (300 coins)',
      [TrapType.BOMB]: 'Time Bomb (400 coins)',
    };
    this.toolIndicator.setText(`Tool: ${names[this.selectedTool] || this.selectedTool}`);
  }

  private updateGridScroll(gridOffsetY: number): void {
    this.gridContainer.setPosition(-this.scrollX, gridOffsetY - this.scrollY);
  }

  private setupGridInteraction(gridOffsetY: number): void {
    // Create interactive zone over the visible viewport area
    const zone = this.add.zone(
      GAME_WIDTH / 2,
      gridOffsetY + 170,
      GAME_WIDTH,
      340,
    ).setInteractive();

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.handleGridClick(pointer.x + this.scrollX - GRID_OFFSET_X, pointer.y - gridOffsetY + this.scrollY);
    });

    zone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.isDown) {
        this.handleGridClick(pointer.x + this.scrollX - GRID_OFFSET_X, pointer.y - gridOffsetY + this.scrollY);
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
      cell.hasCoin = false;
      cell.hasExit = false;
      cell.hasEntrance = false;
      AudioManager.getInstance().playClick();
    } else if (this.selectedTool === 'platform') {
      cell.cellType = CellType.PLATFORM;
      cell.trapType = null;
      cell.hasCoin = false;
      AudioManager.getInstance().playTrapPlace();
    } else if (this.selectedTool === 'coin') {
      // Toggle coin on/off on empty cells
      cell.hasCoin = !cell.hasCoin;
      try { AudioManager.getInstance().playCoinPickup(); } catch (_) {}
    } else if (this.selectedTool === 'exit') {
      // Only one exit allowed — clear any previous exit
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          this.vault.grid[r][c].hasExit = false;
        }
      }
      cell.hasExit = true;
      try { AudioManager.getInstance().playSuccess(); } catch (_) {}
    } else if (this.selectedTool === 'entrance') {
      // Only one entrance allowed — clear any previous
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          this.vault.grid[r][c].hasEntrance = false;
        }
      }
      cell.hasEntrance = true;
      try { AudioManager.getInstance().playSuccess(); } catch (_) {}
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

      // Traps are placed independently — no auto-floor
      if (cell.trapType === trapType) return; // Already placed

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

        // Draw coin marker
        if (cell.hasCoin) {
          const cx = x + CELL_SIZE / 2;
          const cy = y + CELL_SIZE / 2;
          this.gridGraphics.fillStyle(COLORS.ACCENT_GOLD, 0.9);
          this.gridGraphics.fillCircle(cx, cy, 8);
          this.gridGraphics.fillStyle(0xeebb00, 1);
          this.gridGraphics.fillCircle(cx, cy, 5);
          this.gridGraphics.fillStyle(COLORS.ACCENT_GOLD, 1);
          this.gridGraphics.fillCircle(cx, cy, 3);
        }

        // Draw exit door
        if (cell.hasExit) {
          const ex = x + 4;
          const ey = y + 4;
          const ew = CELL_SIZE - 8;
          const eh = CELL_SIZE - 8;
          // Golden door frame
          this.gridGraphics.fillStyle(COLORS.EXIT_GOLD, 0.8);
          this.gridGraphics.fillRoundedRect(ex, ey, ew, eh, 6);
          // Door panel
          this.gridGraphics.fillStyle(0xb8860b, 1);
          this.gridGraphics.fillRoundedRect(ex + 4, ey + 4, ew - 8, eh - 8, 4);
          // Door handle
          this.gridGraphics.fillStyle(COLORS.ACCENT_GOLD, 1);
          this.gridGraphics.fillCircle(x + CELL_SIZE / 2 + 8, y + CELL_SIZE / 2, 3);
          // Glow border
          this.gridGraphics.lineStyle(2, COLORS.ACCENT_GOLD, 0.9);
          this.gridGraphics.strokeRoundedRect(ex, ey, ew, eh, 6);
        }

        // Draw entrance point
        if (cell.hasEntrance) {
          const sx = x + 4;
          const sy = y + 4;
          const sw = CELL_SIZE - 8;
          const sh = CELL_SIZE - 8;
          this.gridGraphics.fillStyle(COLORS.ENTRANCE_GREEN, 0.6);
          this.gridGraphics.fillRoundedRect(sx, sy, sw, sh, 6);
          // Arrow pointing down (spawn indicator)
          this.gridGraphics.fillStyle(0xffffff, 0.8);
          const acx = x + CELL_SIZE / 2;
          const acy = y + CELL_SIZE / 2;
          this.gridGraphics.fillTriangle(acx, acy + 8, acx - 8, acy - 4, acx + 8, acy - 4);
          this.gridGraphics.lineStyle(2, COLORS.ENTRANCE_GREEN, 0.9);
          this.gridGraphics.strokeRoundedRect(sx, sy, sw, sh, 6);
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

      case TrapType.BOMB:
        // Bomb body (dark sphere)
        this.gridGraphics.fillStyle(0x222222, 1);
        this.gridGraphics.fillCircle(cx, cy + 4, 12);
        // Highlight
        this.gridGraphics.fillStyle(0x444444, 1);
        this.gridGraphics.fillCircle(cx - 3, cy + 1, 5);
        // Fuse
        this.gridGraphics.lineStyle(2, 0xaa6600, 1);
        this.gridGraphics.lineBetween(cx + 6, cy - 6, cx + 12, cy - 14);
        // Fuse spark
        this.gridGraphics.fillStyle(0xff4400, 1);
        this.gridGraphics.fillCircle(cx + 12, cy - 14, 3);
        this.gridGraphics.fillStyle(0xffaa00, 1);
        this.gridGraphics.fillCircle(cx + 12, cy - 14, 1.5);
        this.gridGraphics.lineStyle(1, 0x000000, 0);
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
    // Show name editor first, then validate and publish
    this.showNameEditor();
  }

  private showNameEditor(): void {
    const overlay = this.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const panelY = GAME_HEIGHT / 2 - 110;
    const panel = this.add.graphics().setDepth(201);
    panel.fillStyle(COLORS.BG_PANEL, 0.95);
    panel.fillRoundedRect(30, panelY, GAME_WIDTH - 60, 260, 20);
    panel.lineStyle(2, COLORS.ACCENT_GOLD, 0.5);
    panel.strokeRoundedRect(30, panelY, GAME_WIDTH - 60, 260, 20);

    this.add.text(GAME_WIDTH / 2, panelY + 25, '📝 NAME YOUR VAULT', {
      fontSize: '18px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    this.add.text(GAME_WIDTH / 2, panelY + 52, 'Give your vault a cool name!', {
      fontSize: '12px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5).setDepth(202);

    // Current name display (editable via browser prompt)
    let vaultName = this.vault.name;

    const nameDisplay = this.add.graphics().setDepth(202);
    nameDisplay.fillStyle(0x1a0a2e, 1);
    nameDisplay.fillRoundedRect(60, panelY + 70, GAME_WIDTH - 120, 40, 10);
    nameDisplay.lineStyle(2, COLORS.ACCENT_CYAN, 0.5);
    nameDisplay.strokeRoundedRect(60, panelY + 70, GAME_WIDTH - 120, 40, 10);

    const nameText = this.add.text(GAME_WIDTH / 2, panelY + 90, vaultName, {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(203);

    // Edit name button
    new Button(this, {
      x: GAME_WIDTH / 2, y: panelY + 130,
      width: 160, height: 36,
      text: '✏️ Change Name', fontSize: 14,
      bgColor: COLORS.ACCENT_CYAN,
      textColor: '#1a0a2e',
      onClick: () => {
        const newName = prompt('Enter vault name:', vaultName);
        if (newName && newName.trim().length > 0 && newName.trim().length <= 30) {
          vaultName = newName.trim();
          nameText.setText(vaultName);
        }
      },
    }).getContainer().setDepth(203);

    // Suggested names
    const suggestions = ['Death Maze', 'The Labyrinth', 'Trap City', 'No Escape', 'Spike Run', 'Phantom\'s Lair'];
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    this.add.text(GAME_WIDTH / 2, panelY + 162, `💡 Try: "${randomSuggestion}"`, {
      fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5).setDepth(202);

    // Publish button
    new Button(this, {
      x: GAME_WIDTH / 2 - 70, y: panelY + 210,
      width: 130, height: 42,
      text: '📤 Publish', fontSize: 16,
      bgColor: COLORS.ACCENT_GREEN,
      onClick: () => {
        // Update vault name
        this.vault.name = vaultName;
        VaultManager.getInstance().saveVault(this.vault);

        // Now validate and publish
        const vm = VaultManager.getInstance();
        if (vm.publishVault(this.vault.id)) {
          try { AudioManager.getInstance().playSuccess(); } catch (_) {}
          VaultService.getInstance().publishVault(this.vault)
            .then(ok => console.log('Cloud publish:', ok ? 'success' : 'offline mode'))
            .catch(e => console.log('Cloud publish skipped:', e));

          // Track published count + check achievements
          const sd = SaveManager.getInstance().getData();
          SaveManager.getInstance().updateData({ publishedVaults: (sd.publishedVaults || 0) + 1 });
          const newAch = AchievementManager.getInstance().checkAchievements();
          this.updateLeaderboard();

          overlay.destroy();
          panel.destroy();
          this.showPublishPopup(true);
        } else {
          overlay.destroy();
          panel.destroy();
          this.showPublishPopup(false);
        }
      },
    }).getContainer().setDepth(203);

    // Cancel button
    new Button(this, {
      x: GAME_WIDTH / 2 + 70, y: panelY + 210,
      width: 100, height: 42,
      text: 'Cancel', fontSize: 14,
      bgColor: 0x555555,
      onClick: () => {
        overlay.destroy();
        panel.destroy();
        this.scene.restart();
      },
    }).getContainer().setDepth(203);
  }

  private updateLeaderboard(): void {
    const save = SaveManager.getInstance().getData();
    VaultService.getInstance().savePlayerProfile(save.playerId, {
      playerName: save.playerName,
      level: save.level,
      xp: save.xp,
      totalRaids: save.totalRaids,
      totalSuccessfulRaids: save.totalSuccessfulRaids,
      coins: save.coins,
    }).catch(e => console.log('Leaderboard update skipped:', e));
  }

  private showPublishPopup(success: boolean): void {
    // Overlay
    const overlay = this.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Panel
    const panel = this.add.graphics().setDepth(201);
    const panelY = GAME_HEIGHT / 2 - 80;
    panel.fillStyle(COLORS.BG_PANEL, 0.95);
    panel.fillRoundedRect(40, panelY, GAME_WIDTH - 80, 200, 20);
    panel.lineStyle(2, success ? COLORS.ACCENT_GOLD : COLORS.ACCENT_RED, 0.6);
    panel.strokeRoundedRect(40, panelY, GAME_WIDTH - 80, 200, 20);

    if (success) {
      this.add.text(GAME_WIDTH / 2, panelY + 30, '✅', { fontSize: '36px' }).setOrigin(0.5).setDepth(202);
      this.add.text(GAME_WIDTH / 2, panelY + 70, 'VAULT PUBLISHED!', {
        fontSize: '20px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(202);
      this.add.text(GAME_WIDTH / 2, panelY + 100, 'Other players can now raid your vault!', {
        fontSize: '12px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
      }).setOrigin(0.5).setDepth(202);
      this.add.text(GAME_WIDTH / 2, panelY + 120, `Difficulty: ${'⭐'.repeat(this.vault.difficulty)}`, {
        fontSize: '14px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN,
      }).setOrigin(0.5).setDepth(202);
    } else {
      this.add.text(GAME_WIDTH / 2, panelY + 30, '❌', { fontSize: '36px' }).setOrigin(0.5).setDepth(202);
      this.add.text(GAME_WIDTH / 2, panelY + 70, 'CANNOT PUBLISH', {
        fontSize: '20px', fontFamily: 'Arial', color: '#ff4444', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(202);
      this.add.text(GAME_WIDTH / 2, panelY + 100, 'Your vault needs:', {
        fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
      }).setOrigin(0.5).setDepth(202);
      this.add.text(GAME_WIDTH / 2, panelY + 118, '• At least 1 platform (Floor)', {
        fontSize: '12px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
      }).setOrigin(0.5).setDepth(202);
      this.add.text(GAME_WIDTH / 2, panelY + 134, '• At least 1 trap', {
        fontSize: '12px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
      }).setOrigin(0.5).setDepth(202);
      this.add.text(GAME_WIDTH / 2, panelY + 150, '• An Exit Door 🚩', {
        fontSize: '12px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD,
      }).setOrigin(0.5).setDepth(202);
    }

    // OK button
    new Button(this, {
      x: GAME_WIDTH / 2, y: panelY + 170,
      width: 120, height: 38,
      text: 'OK', fontSize: 16,
      bgColor: success ? COLORS.ACCENT_GOLD : COLORS.ACCENT_RED,
      textColor: success ? '#1a0a2e' : '#ffffff',
      onClick: () => {
        // Remove all popup elements
        overlay.destroy();
        panel.destroy();
        // Restart scene to clean up text objects
        this.scene.restart();
      },
    }).getContainer().setDepth(203);
  }
}
