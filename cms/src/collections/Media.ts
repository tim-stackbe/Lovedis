import type { CollectionConfig } from 'payload'

import { isEditorOrAdmin, isAdmin } from '../access/roles'

/**
 * Uploads. In production, files are stored on S3/R2 via the storage-s3 plugin
 * (configured in payload.config.ts). Locally they fall back to ./media.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Medium', plural: 'Medien' },
  admin: {
    group: 'Inhalt',
    description: 'Bilder, Logos und Dateien. Vergib immer einen Alt-Text für Barrierefreiheit und SEO.',
  },
  access: {
    read: () => true,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isAdmin,
  },
  upload: {
    // When object storage is disabled (DISABLE_S3_STORAGE=true), files live on
    // local disk. MEDIA_DIR pins an absolute, mountable path so uploads survive
    // container restarts; unset falls back to Payload's default (./media).
    staticDir: process.env.MEDIA_DIR || undefined,
    // Small, responsive-friendly set matching the homepage's needs.
    imageSizes: [
      { name: 'thumbnail', width: 400, height: undefined, position: 'centre' },
      { name: 'card', width: 768, height: undefined, position: 'centre' },
      { name: 'tablet', width: 1024, height: undefined, position: 'centre' },
      { name: 'desktop', width: 1920, height: undefined, position: 'centre' },
    ],
    mimeTypes: ['image/*', 'video/*', 'application/pdf'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt-Text',
      localized: true,
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Bildunterschrift',
      localized: true,
    },
    {
      // Preserves the original Storyblok asset URL for idempotent re-import
      // and for a later CDN cutover. Hidden from editors.
      name: 'sourceUrl',
      type: 'text',
      label: 'Quell-URL (Storyblok)',
      admin: { readOnly: true, hidden: true },
      index: true,
    },
  ],
}
