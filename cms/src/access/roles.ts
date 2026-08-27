import type { Access, FieldAccess } from 'payload'

/**
 * Role model (confirm with the team): `admin` = full control incl. users/settings,
 * `editor` = create/update/publish content but NOT manage users or delete.
 */
export type UserRole = 'admin' | 'editor'

const roleOf = (user: unknown): UserRole | undefined =>
  (user as { role?: UserRole } | null | undefined)?.role

export const isAdmin: Access = ({ req: { user } }) => roleOf(user) === 'admin'

export const isEditorOrAdmin: Access = ({ req: { user } }) => {
  const role = roleOf(user)
  return role === 'admin' || role === 'editor'
}

/** Field-level: only admins may change the value (e.g. a user's role). */
export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) => roleOf(user) === 'admin'

/**
 * Public read for published docs; authenticated editors/admins see drafts too.
 * Used on content collections that power the public site.
 */
export const publishedOrSignedIn: Access = ({ req: { user } }) => {
  if (user) return true
  return {
    _status: {
      equals: 'published',
    },
  }
}
