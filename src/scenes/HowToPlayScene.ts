// ============================================================
// How To Play Scene — Tutorial / Instructions
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';
import { Button } from '../ui/Button';

interface TutorialPage {
  title: string;
  icon: string;
  lines: string[];
}

const PAGES: TutorialPage[] = [
  {
    title: 'WELCOME, PHANTOM!',
    icon: '👻',
    lines: [
      'You are a master thief in the',
      'Phantom Guild. Your mission:',
      '',
      '🏗️ BUILD deadly trap vaults',
      '⚔️ RAID other players\' vaults',
      '🪙 STEAL coins & climb ranks!',
    ],
  },
  {
    title: 'BUILDING VAULTS',
    icon: '🏗️',
    lines: [
      'Tap BUILD VAULT from the menu.',
      '',
      '⬛ Place FLOORS to create paths',
      '▲ Add TRAPS to stop raiders',
      '🪙 Place COINS as loot',
      '🚩 Place EXIT DOOR (required!)',
      '',
      'Use ◀ ▶ ▲ ▼ arrows to scroll',
      'the grid and build bigger vaults!',
    ],
  },
  {
    title: 'TRAP TYPES',
    icon: '⚠️',
    lines: [
      '▲ SPIKES — Damage on contact',
      '═ LASER — Beams toggle on/off',
      '⌇ SPRING — Launches you up!',
      '▒ FAKE FLOOR — Breaks when',
      '    you step or jump into it',
      '◉ TURRET — Shoots at you!',
      '⚙ SAW — Spinning blade, 2x dmg',
    ],
  },
  {
    title: 'RAIDING VAULTS',
    icon: '⚔️',
    lines: [
      'Tap RAID VAULTS to find a vault.',
      '',
      '🕹️ Use the JOYSTICK to move',
      '⬆️ Tap JUMP to leap over traps',
      '❤️ You have 3 HP — don\'t die!',
      '⏱️ Beat the timer countdown!',
      '🚩 Reach the EXIT DOOR to win!',
      '',
      '🪙 Collect coins along the way!',
    ],
  },
  {
    title: 'CONTROLS',
    icon: '🕹️',
    lines: [
      'MOBILE: Drag the joystick (left',
      'side) to move. Tap JUMP button',
      '(right side) to jump.',
      '',
      'KEYBOARD: Arrow keys or WASD',
      'to move. SPACE or UP to jump.',
      '',
      'The camera follows your player',
      'through the vault automatically.',
    ],
  },
  {
    title: 'TIPS & TRICKS',
    icon: '💡',
    lines: [
      '• Test your vault before publishing!',
      '• Place the Exit far from the start',
      '• Combine traps for deadly combos',
      '• Fake floors look like real ones!',
      '• Springs launch you — use them',
      '    to reach higher platforms',
      '• Collect coins for extra rewards',
      '• Daily login = free coins & gems!',
    ],
  },
  {
    title: 'CURRENCIES',
    icon: '💰',
    lines: [
      '🪙 COINS — Earned from raids.',
      '    Used to buy traps for vaults.',
      '',
      '💎 GEMS — Premium currency.',
      '    Buy skins, gadgets, energy.',
      '',
      '⚡ ENERGY — Need 1 per raid.',
      '    Recharges every 30 minutes.',
      '    Max 5 energy. Buy refills!',
    ],
  },
];

export class HowToPlayScene extends Phaser.Scene {
  private currentPage = 0;
  private pageContainer!: Phaser.GameObjects.Container;
  private pageIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HowToPlayScene' });
  }

  create(): void {
    this.currentPage = 0;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_DARK, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Header
    this.add.text(GAME_WIDTH / 2, 36, '📖 HOW TO PLAY', {
      fontSize: '22px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back button
    new Button(this, {
      x: 40, y: 36, width: 60, height: 30,
      text: '← Back', fontSize: 12,
      bgColor: COLORS.BG_PANEL,
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });

    // Page container
    this.pageContainer = this.add.container(0, 0);

    // Page indicator
    this.pageIndicator = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5);

    // Navigation buttons
    new Button(this, {
      x: 80, y: GAME_HEIGHT - 70,
      width: 120, height: 42,
      text: '◀ Previous', fontSize: 14,
      bgColor: COLORS.BG_PANEL,
      onClick: () => {
        if (this.currentPage > 0) {
          this.currentPage--;
          this.showPage();
        }
      },
    });

    new Button(this, {
      x: GAME_WIDTH - 80, y: GAME_HEIGHT - 70,
      width: 120, height: 42,
      text: 'Next ▶', fontSize: 14,
      bgColor: COLORS.ACCENT_PURPLE,
      onClick: () => {
        if (this.currentPage < PAGES.length - 1) {
          this.currentPage++;
          this.showPage();
        } else {
          // Last page — go back to menu
          this.scene.start(SCENES.MAIN_MENU);
        }
      },
    });

    // Show first page
    this.showPage();
  }

  private showPage(): void {
    // Clear previous page content
    this.pageContainer.removeAll(true);

    const page = PAGES[this.currentPage];
    const panelX = 30;
    const panelY = 70;
    const panelW = GAME_WIDTH - 60;
    const panelH = GAME_HEIGHT - 180;

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.BG_PANEL, 0.9);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
    panel.lineStyle(2, COLORS.ACCENT_PURPLE, 0.3);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
    this.pageContainer.add(panel);

    // Icon
    const icon = this.add.text(GAME_WIDTH / 2, panelY + 40, page.icon, {
      fontSize: '40px',
    }).setOrigin(0.5);
    this.pageContainer.add(icon);

    // Title
    const title = this.add.text(GAME_WIDTH / 2, panelY + 80, page.title, {
      fontSize: '20px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.pageContainer.add(title);

    // Content lines
    page.lines.forEach((line, i) => {
      const t = this.add.text(GAME_WIDTH / 2, panelY + 115 + i * 26, line, {
        fontSize: '14px', fontFamily: 'Arial',
        color: line.startsWith('•') || line.startsWith(' ') ? COLORS.TEXT_WHITE : '#cccccc',
      }).setOrigin(0.5);
      this.pageContainer.add(t);
    });

    // Update page indicator
    const dots = PAGES.map((_, i) => i === this.currentPage ? '●' : '○').join(' ');
    this.pageIndicator.setText(`${dots}  (${this.currentPage + 1}/${PAGES.length})`);
  }
}
