import type { CollectionConfig } from 'payload'

import { isAdmin, isEditorOrAdmin, publishedOrSignedIn } from '../access/roles'

/**
 * Events — Storyblok `event` stories. Referenced by the homepage events section
 * when `selectionMode` is manual. Minimal Phase-1 model; expand in later phases.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Event', plural: 'Events' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'location', '_status'],
    group: 'Inhalte',
  },
  versions: { drafts: true },
  access: {
    read: publishedOrSignedIn,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Titel', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug',
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        { name: 'date', type: 'text', label: 'Datum', admin: { width: '50%' } },
        { name: 'location', type: 'text', label: 'Ort', admin: { width: '50%' } },
      ],
    },
    { name: 'hostedBy', type: 'text', label: 'Veranstalter' },
    { name: 'tags', type: 'text', label: 'Tags' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    { name: 'description', type: 'richText', label: 'Beschreibung', localized: true },
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
