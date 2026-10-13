import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminFieldLevel } from '../access/roles'

/**
 * CMS editors — separate from the platform's NextAuth users.
 * `admin` manages everything (incl. users/settings); `editor` manages content only.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Benutzer', plural: 'Benutzer' },
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Team',
    description: 'CMS-Zugänge. „Admin" verwaltet alles inkl. Team & Einstellungen, „Redakteur:in" pflegt Inhalte.',
  },
  access: {
    // Only admins manage the user list; users may read/update their own record.
    read: ({ req: { user } }) => {
      if ((user as { role?: string } | null)?.role === 'admin') return true
      return { id: { equals: user?.id } }
    },
    create: isAdmin,
    update: ({ req: { user }, id }) => {
      if ((user as { role?: string } | null)?.role === 'admin') return true
      return user?.id === id
    },
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Name' },
    {
      name: 'role',
      type: 'select',
      label: 'Rolle',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Redakteur:in', value: 'editor' },
      ],
      access: {
        // Editors cannot escalate their own role.
        update: isAdminFieldLevel,
      },
    },
  ],
}
