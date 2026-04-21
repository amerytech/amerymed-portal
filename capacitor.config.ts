import type { CapacitorConfig } from '@capacitor/cli';

const appId = process.env.CAPACITOR_APP_ID?.trim() || 'com.amerytech.amerymedportal';
const appName = process.env.CAPACITOR_APP_NAME?.trim() || 'AmeryMed Portal';
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim() || 'https://amerymed-portal.vercel.app';
const appStartPath = process.env.CAPACITOR_START_PATH?.trim();

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: 'capacitor-shell',
  server: {
    url: serverUrl,
    ...(appStartPath ? { appStartPath } : {}),
    cleartext: false,
    allowNavigation: [
      '*.supabase.co',
      '*.amerytechnet.com',
      '*.site4future.com',
      'localhost',
    ],
  },
};

export default config;
