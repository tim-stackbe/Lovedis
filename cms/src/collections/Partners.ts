import type { CollectionConfig } from 'payload'

import { isAdmin, isEditorOrAdmin, publishedOrSignedIn } from '../access/roles'

/**
 * Partners — Storyblok `partner` stories, referenced from the partners section.
 * Phase 1 seeds only the partners referenced by the homepage; the full set of 42
 * follows in a later phase.
 */
export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: { singular: 'Partner', plural: 'Partner' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', '_status'],
    group: 'Inhalt',
    description: 'Partner-Organisationen, die u. a. in der Partner-Sektion der Startseite erscheinen.',
  },
  versions: { drafts: true },
  access: {
    read: publishedOrSignedIn,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Name', required: true },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug',
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
    { name: 'website', type: 'text', label: 'Website' },
    { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
    {
      name: 'storyblokUuid',
      type: 'text',
      label: 'Storyblok-UUID',
      unique: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
