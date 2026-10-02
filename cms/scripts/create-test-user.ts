/**
 * Create (or reset) a shared TEST editor account via Payload's Local API so the
 * password is hashed with Payload's own scrypt scheme (never hand-write a hash
 * or use SQL for the password). Idempotent: if the email already exists, its
 * password/role/name are reset instead of erroring.
 *
 * Only touches the CMS `payload` schema (Users collection). Reads config from
 * env, so run it inside the `cms` container with cms.env loaded:
 *
 *   TEST_USER_PASSWORD=... docker compose run --rm \
 *     -e TEST_USER_EMAIL -e TEST_USER_NAME -e TEST_USER_ROLE -e TEST_USER_PASSWORD \
 *     cms npx tsx scripts/create-test-user.ts
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function run() {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  const name = process.env.TEST_USER_NAME || 'CMS Test (Redaktion)'
  const role = (process.env.TEST_USER_ROLE as 'admin' | 'editor') || 'editor'

  if (!email || !password) {
    console.error('[create-test-user] TEST_USER_EMAIL and TEST_USER_PASSWORD must be set.')
    process.exit(1)
  }

  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    const id = existing.docs[0].id
    await payload.update({ collection: 'users', id, data: { password, role, name } })
    console.log(`[create-test-user] RESET existing user "${email}" (id ${id}) → role=${role}.`)
  } else {
    const created = await payload.create({
      collection: 'users',
      data: { email, password, role, name },
    })
    console.log(`[create-test-user] CREATED "${email}" (id ${created.id}) → role=${role}.`)
  }

  process.exit(0)
}

run().catch((error) => {
  console.error('[create-test-user] Failed:', error)
  process.exit(1)
})
