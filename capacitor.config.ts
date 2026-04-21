import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amerytech.amerymedportal',
  appName: 'AmeryMed Portal',
  webDir: 'capacitor-shell',
  server: {
    url: 'https://amerymed-portal.vercel.app',
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