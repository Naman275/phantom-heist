// ============================================================
// Replay Manager — Record & Playback Raid Inputs
// ============================================================

export interface ReplayFrame {
  frame: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  action: 'idle' | 'left' | 'right' | 'jump' | 'gadget' | 'hit' | 'death';
}

export interface ReplayData {
  id: string;
  vaultId: string;
  vaultName: string;
  raiderId: string;
  raiderName: string;
  frames: ReplayFrame[];
  success: boolean;
  timeMs: number;
  coinsCollected: number;
  damagesTaken: number;
  recordedAt: number;
}

export class ReplayManager {
  private static instance: ReplayManager;
  private recording: boolean = false;
  private frames: ReplayFrame[] = [];
  private frameCounter: number = 0;

  private constructor() {}

  static getInstance(): ReplayManager {
    if (!ReplayManager.instance) {
      ReplayManager.instance = new ReplayManager();
    }
    return ReplayManager.instance;
  }

  startRecording(): void {
    this.recording = true;
    this.frames = [];
    this.frameCounter = 0;
  }

  recordFrame(x: number, y: number, vx: number, vy: number, action: ReplayFrame['action']): void {
    if (!this.recording) return;
    // Only record every 3rd frame to save space
    if (this.frameCounter % 3 === 0) {
      this.frames.push({
        frame: this.frameCounter,
        x: Math.round(x),
        y: Math.round(y),
        velocityX: Math.round(vx),
        velocityY: Math.round(vy),
        action,
      });
    }
    this.frameCounter++;
  }

  stopRecording(): ReplayFrame[] {
    this.recording = false;
    return [...this.frames];
  }

  isRecording(): boolean {
    return this.recording;
  }

  createReplayData(
    vaultId: string,
    vaultName: string,
    raiderId: string,
    raiderName: string,
    success: boolean,
    timeMs: number,
    coinsCollected: number,
    damagesTaken: number,
  ): ReplayData {
    return {
      id: 'replay_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      vaultId,
      vaultName,
      raiderId,
      raiderName,
      frames: this.stopRecording(),
      success,
      timeMs,
      coinsCollected,
      damagesTaken,
      recordedAt: Date.now(),
    };
  }
}
