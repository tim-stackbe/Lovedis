/**
 * One-off admin recovery: reset the admin password via Payload's Local API so it
 * is hashed with Payload's own scheme (never hand-write a hash). Reads the target
 * email from CMS_ADMIN_EMAIL and the new password from NEW_ADMIN_PASSWORD.
 *
 * Usage:
 *   NEW_ADMIN_PASSWORD=... docker compose run --rm -e NEW_ADMIN_PASSWORD cms \
 *     npx tsx scripts/reset-admin.ts
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function run() {
  const email = process.env.CMS_ADMIN_EMAIL
  const password = process.env.NEW_ADMIN_PASSWORD
  if (!email || !password) {
    console.error('[reset-admin] CMS_ADMIN_EMAIL and NEW_ADMIN_PASSWORD must be set.')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (found.docs.length === 0) {
    console.error(`[reset-admin] No user with email "${email}".`)
    process.exit(1)
  }

  const id = found.docs[0].id
  await payload.update({ collection: 'users', id, data: { password, role: 'admin' } })
  console.log(`[reset-admin] Password reset + role=admin ensured for "${email}" (id ${id}).`)
  process.exit(0)
}

run().catch((error) => {
  console.error('[reset-admin] Failed:', error)
  process.exit(1)
})
