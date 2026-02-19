// ============================================================
// Firebase Auth Service — Anonymous + Google sign-in
// ============================================================
import { signInAnonymously, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './firebaseConfig';
import { SaveManager } from '../managers/SaveManager';

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async signInAnon(): Promise<User | null> {
    if (!isFirebaseConfigured()) return null;
    const auth = getFirebaseAuth();
    if (!auth) return null;

    try {
      const result = await signInAnonymously(auth);
      this.currentUser = result.user;
      // Sync local player ID with Firebase UID
      SaveManager.getInstance().updateData({ playerId: result.user.uid });
      return result.user;
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      return null;
    }
  }

  async signInWithGoogle(): Promise<User | null> {
    if (!isFirebaseConfigured()) return null;
    const auth = getFirebaseAuth();
    if (!auth) return null;

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      this.currentUser = result.user;
      SaveManager.getInstance().updateData({
        playerId: result.user.uid,
        playerName: result.user.displayName || SaveManager.getInstance().getData().playerName,
      });
      return result.user;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isSignedIn(): boolean {
    return this.currentUser !== null;
  }
}
