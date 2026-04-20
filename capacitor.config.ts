import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const isCleartext = Boolean(serverUrl && serverUrl.startsWith('http://'));

const config: CapacitorConfig = {
  appId: 'com.amerytech.amerymedportal',
  appName: 'AmeryMed Portal',
  webDir: 'capacitor-shell',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: isCleartext,
        allowNavigation: [
          '*.supabase.co',
          '*.amerytechnet.com',
          '*.site4future.com',
          'localhost',
        ],
      }
    : undefined,
};

export default config;
