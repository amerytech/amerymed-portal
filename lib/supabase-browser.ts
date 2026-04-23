import { registerPlugin } from '@capacitor/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

type NativeStoragePlugin = {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
};

type SupabaseStorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

const NativeStorage = registerPlugin<NativeStoragePlugin>('NativeStorage');

function isNativeCapacitorApp() {
  if (typeof window === 'undefined') {
    return false;
  }

  const candidate = window as typeof window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  };

  if (typeof candidate.Capacitor?.isNativePlatform === 'function') {
    return candidate.Capacitor.isNativePlatform();
  }

  return false;
}

function createBrowserStorage(): SupabaseStorageAdapter | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  if (isNativeCapacitorApp()) {
    return {
      async getItem(key) {
        try {
          const result = await NativeStorage.get({ key });
          return result.value;
        } catch {
          return null;
        }
      },
      async setItem(key, value) {
        try {
          await NativeStorage.set({ key, value });
        } catch {
          // Ignore storage write failures so login can still proceed in constrained native wrappers.
        }
      },
      async removeItem(key) {
        try {
          await NativeStorage.remove({ key });
        } catch {
          // Ignore storage removal failures so logout can still proceed.
        }
      },
    };
  }

  return {
    getItem(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignore storage write failures so login can still proceed in constrained browsers.
      }
    },
    removeItem(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore storage removal failures so logout can still proceed.
      }
    },
  };
}

export function createBrowserSupabaseClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'amerymed.auth',
      storage: createBrowserStorage(),
    },
  });

  return browserClient;
}
