import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AmeryMed Portal',
    short_name: 'AmeryMed',
    description: 'Installable AmeryMed portal for client uploads, messaging, and admin operations.',
    start_url: '/client/login',
    display: 'standalone',
    background_color: '#eff8f6',
    theme_color: '#123c7a',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
