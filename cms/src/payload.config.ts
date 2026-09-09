import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Events } from './collections/Events'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Partners } from './collections/Partners'
import { Users } from './collections/Users'
import { Navigation } from './globals/Navigation'
import { SiteSettings } from './globals/SiteSettings'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3001'
const homepageURL = process.env.HOMEPAGE_URL

// Origins allowed to call the API / submit forms (CORS + CSRF).
const allowedOrigins = [serverURL, homepageURL].filter(
  (value): value is string => typeof value === 'string' && value.length > 0,
)

// Local verification can skip S3 by writing uploads to ./media on disk.
const s3Enabled =
  process.env.DISABLE_S3_STORAGE !== 'true' && Boolean(process.env.S3_BUCKET)

export default buildConfig({
  serverURL,
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '· Lovedis CMS',
    },
    // Friendly German onboarding at the top of the dashboard.
    components: {
      beforeDashboard: ['@/components/BeforeDashboard#BeforeDashboard'],
    },
    // Phase 2 (Live Preview) — harmless to define now; the Nuxt `/preview`
    // route is wired later. The admin loads this URL in the preview pane.
    livePreview: {
      url: ({ data, locale }) => {
        const base = homepageURL || serverURL
        const slug = (data as { slug?: string })?.slug ?? 'home'
        const secret = process.env.PREVIEW_SECRET ?? ''
        const localeCode = locale?.code ?? 'de'
        return `${base}/preview?secret=${secret}&slug=${slug}&locale=${localeCode}`
      },
      collections: ['pages'],
      breakpoints: [
        { name: 'mobile', width: 375, height: 667, label: 'Mobile' },
        { name: 'tablet', width: 768, height: 1024, label: 'Tablet' },
        { name: 'desktop', width: 1440, height: 900, label: 'Desktop' },
      ],
    },
  },
  editor: lexicalEditor(),
  collections: [Pages, Media, Partners, Events, Users],
  globals: [Navigation, SiteSettings],
  localization: {
    locales: [
      { code: 'de', label: 'Deutsch' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'de',
    fallback: true,
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
      max: process.env.PAYLOAD_DB_POOL_MAX ? Number(process.env.PAYLOAD_DB_POOL_MAX) : 10,
    },
    // Isolate all CMS tables in their own schema; the platform's Prisma owns `public`.
    schemaName: process.env.PAYLOAD_DB_SCHEMA || 'payload',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  plugins: s3Enabled
    ? [
        s3Storage({
          collections: { media: true },
          bucket: process.env.S3_BUCKET as string,
          config: {
            // Hetzner Object Storage (S3-compatible). Endpoint per data center:
            //   https://fsn1.your-objectstorage.com (Falkenstein)
            //   https://nbg1.your-objectstorage.com (Nuremberg)
            //   https://hel1.your-objectstorage.com (Helsinki)
            // Docs: https://docs.hetzner.com/storage/object-storage/overview/
            endpoint: process.env.S3_ENDPOINT || 'https://fsn1.your-objectstorage.com',
            // The `region` must match the bucket's location code (fsn1/nbg1/hel1).
            region: process.env.S3_REGION || 'fsn1',
            // Hetzner's canonical addressing is virtual-hosted style, but it also
            // accepts path-style API requests; we keep path-style for simplicity
            // and S3-compatibility. Override with S3_FORCE_PATH_STYLE=false to use
            // virtual-hosted addressing.
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
            },
          },
        }),
      ]
    : [],
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-me',
  cors: allowedOrigins,
  csrf: allowedOrigins,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
