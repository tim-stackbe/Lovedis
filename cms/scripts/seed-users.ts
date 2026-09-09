/**
 * Seed an initial admin + editor account from environment variables.
 * Idempotent: existing users (matched by email) are left untouched.
 *
 * Usage (never hardcode real passwords):
 *   CMS_ADMIN_EMAIL=... CMS_ADMIN_PASSWORD=... \
 *   CMS_EDITOR_EMAIL=... CMS_EDITOR_PASSWORD=... \
 *   npm run seed:users
 *
 * Alternatively, create the first admin interactively at /admin on first run.
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

type Role = 'admin' | 'editor'

async function ensureUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  email: string | undefined,
  password: string | undefined,
  role: Role,
  name: string,
) {
  if (!email || !password) {
    console.log(`[seed:users] Skipping ${role}: email/password env not set.`)
    return
  }

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    console.log(`[seed:users] ${role} "${email}" already exists — skipping.`)
    return
  }

  await payload.create({
    collection: 'users',
    data: { email, password, role, name },
  })
  console.log(`[seed:users] Created ${role} "${email}".`)
}

async function run() {
  const payload = await getPayload({ config })

  await ensureUser(
    payload,
    process.env.CMS_ADMIN_EMAIL,
    process.env.CMS_ADMIN_PASSWORD,
    'admin',
    'Administrator',
  )
  await ensureUser(
    payload,
    process.env.CMS_EDITOR_EMAIL,
    process.env.CMS_EDITOR_PASSWORD,
    'editor',
    'Redaktion',
  )

  console.log('[seed:users] Done.')
  process.exit(0)
}

run().catch((error) => {
  console.error('[seed:users] Failed:', error)
  process.exit(1)
})
