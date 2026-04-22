import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

type SupabaseStorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

function createBrowserStorage(): SupabaseStorageAdapter | undefined {
  if (typeof window === 'undefined') {
    return undefined;
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
