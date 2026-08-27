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
            endpoint: process.env.S3_ENDPOINT,
            // 'auto' for Cloudflare R2; a real region for Hetzner Object Storage.
            region: process.env.S3_REGION || 'auto',
            forcePathStyle: true,
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
