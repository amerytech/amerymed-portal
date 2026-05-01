## AmeryMed Web App

This is the active codebase for the AmeryMed client/admin portal.

Project path:

- `/Users/amerytech/Downloads/amerymed-web`

Main documentation:

- [Developer Guide](/Users/amerytech/Downloads/amerymed-web/docs/DEVELOPER_GUIDE.md)
- [SmarterASP Deployment Checklist](/Users/amerytech/Downloads/amerymed-web/docs/SMARTERASP_DEPLOYMENT_CHECKLIST.md)
- [QA Testing Checklist](/Users/amerytech/Downloads/amerymed-web/docs/QA_TESTING_CHECKLIST.md)
- [Mobile QA Checklist](/Users/amerytech/Downloads/amerymed-web/docs/MOBILE_QA_CHECKLIST.md)
- [Mobile Store Packaging](/Users/amerytech/Downloads/amerymed-web/docs/MOBILE_STORE_PACKAGING.md)
- [Mobile Store Submission Starter Pack](/Users/amerytech/Downloads/amerymed-web/docs/MOBILE_STORE_SUBMISSION_STARTER_PACK.md)

PWA assets:

- `/public/icons/icon-192.png`
- `/public/icons/icon-512.png`
- `/public/icons/apple-touch-icon.png`
- `/app/manifest.ts`
- `/public/sw.js`

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open:

- [http://localhost:3000](http://localhost:3000)

Key pages:

- `app/client/page.tsx`
- `app/admin/page.tsx`
- `app/client/login/page.tsx`
- `app/admin/login/page.tsx`
- `app/api/notify-upload/route.ts`
- `app/api/industry-updates/sync/route.ts`

Useful commands:

```bash
npm run dev
npm run lint
npm run build
npm run start
```

For full architecture, database, deployment, and enhancement guidance, use:

- [Developer Guide](/Users/amerytech/Downloads/amerymed-web/docs/DEVELOPER_GUIDE.md)
- [SmarterASP Deployment Checklist](/Users/amerytech/Downloads/amerymed-web/docs/SMARTERASP_DEPLOYMENT_CHECKLIST.md)
- [QA Testing Checklist](/Users/amerytech/Downloads/amerymed-web/docs/QA_TESTING_CHECKLIST.md)
- [Mobile QA Checklist](/Users/amerytech/Downloads/amerymed-web/docs/MOBILE_QA_CHECKLIST.md)
- [Mobile Store Packaging](/Users/amerytech/Downloads/amerymed-web/docs/MOBILE_STORE_PACKAGING.md)
- [Mobile Store Submission Starter Pack](/Users/amerytech/Downloads/amerymed-web/docs/MOBILE_STORE_SUBMISSION_STARTER_PACK.md)

<!-- trigger deploy -->
