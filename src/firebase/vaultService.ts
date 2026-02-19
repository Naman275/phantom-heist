// ============================================================
// Firebase Vault Service — Online vault sharing
// ============================================================
import {
  collection, doc, setDoc, getDoc, getDocs, query,
  orderBy, limit, where, updateDoc, increment, Timestamp,
} from 'firebase/firestore';
import { getFirebaseDB, isFirebaseConfigured } from './firebaseConfig';
import { VaultData } from '../config/constants';

const COLLECTION_VAULTS = 'vaults';
const COLLECTION_PLAYERS = 'players';

export class VaultService {
  private static instance: VaultService;

  private constructor() {}

  static getInstance(): VaultService {
    if (!VaultService.instance) {
      VaultService.instance = new VaultService();
    }
    return VaultService.instance;
  }

  /** Upload a vault to the cloud */
  async publishVault(vault: VaultData): Promise<boolean> {
    if (!isFirebaseConfigured()) return false;
    const db = getFirebaseDB();
    if (!db) return false;

    try {
      const docRef = doc(collection(db, COLLECTION_VAULTS), vault.id);
      await setDoc(docRef, {
        ...vault,
        grid: JSON.stringify(vault.grid), // Store grid as JSON string
        publishedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return true;
    } catch (error) {
      console.error('Failed to publish vault:', error);
      return false;
    }
  }

  /** Fetch community vaults (newest first) */
  async getCommunityVaults(count: number = 20): Promise<VaultData[]> {
    if (!isFirebaseConfigured()) return [];
    const db = getFirebaseDB();
    if (!db) return [];

    try {
      // Try with composite index first, fall back to simpler query
      let snapshot;
      try {
        const q = query(
          collection(db, COLLECTION_VAULTS),
          where('published', '==', true),
          orderBy('publishedAt', 'desc'),
          limit(count),
        );
        snapshot = await getDocs(q);
      } catch (indexErr) {
        console.log('Composite index not ready, trying simple query:', indexErr);
        // Fallback: just get all vaults without ordering
        const q = query(
          collection(db, COLLECTION_VAULTS),
          where('published', '==', true),
          limit(count),
        );
        snapshot = await getDocs(q);
      }

      return snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          grid: typeof data.grid === 'string' ? JSON.parse(data.grid) : data.grid,
        } as VaultData;
      });
    } catch (error) {
      console.error('Failed to fetch community vaults:', error);
      return [];
    }
  }

  /** Fetch a specific vault */
  async getVault(vaultId: string): Promise<VaultData | null> {
    if (!isFirebaseConfigured()) return null;
    const db = getFirebaseDB();
    if (!db) return null;

    try {
      const docRef = doc(db, COLLECTION_VAULTS, vaultId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return { ...data, grid: JSON.parse(data.grid) } as VaultData;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch vault:', error);
      return null;
    }
  }

  /** Record a raid attempt on a cloud vault */
  async recordRaidAttempt(vaultId: string, success: boolean): Promise<void> {
    if (!isFirebaseConfigured()) return;
    const db = getFirebaseDB();
    if (!db) return;

    try {
      const docRef = doc(db, COLLECTION_VAULTS, vaultId);
      const updates: Record<string, any> = {
        'stats.attempts': increment(1),
        updatedAt: Timestamp.now(),
      };
      if (success) {
        updates['stats.successes'] = increment(1);
      }
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Failed to record raid attempt:', error);
    }
  }

  /** Save player profile to cloud */
  async savePlayerProfile(playerId: string, data: Record<string, any>): Promise<void> {
    if (!isFirebaseConfigured()) return;
    const db = getFirebaseDB();
    if (!db) return;

    try {
      const docRef = doc(db, COLLECTION_PLAYERS, playerId);
      await setDoc(docRef, { ...data, updatedAt: Timestamp.now() }, { merge: true });
    } catch (error) {
      console.error('Failed to save player profile:', error);
    }
  }

  /** Get top players (leaderboard) */
  async getLeaderboard(count: number = 20): Promise<any[]> {
    if (!isFirebaseConfigured()) return [];
    const db = getFirebaseDB();
    if (!db) return [];

    try {
      const q = query(
        collection(db, COLLECTION_PLAYERS),
        orderBy('xp', 'desc'),
        limit(count),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  }
}
