import type { CollectionConfig } from 'payload'

import { homepageBlocks } from '../blocks'
import { isAdmin, isEditorOrAdmin, previewOrPublishedOrSignedIn } from '../access/roles'
import { seoField } from '../fields/seo'

/**
 * Pages — Storyblok `page` stories. The `layout` Blocks field mirrors the
 * homepage's on-page block sequence. Drafts/versions are enabled so Phase 2
 * live preview can render unpublished content.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Seite', plural: 'Seiten' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    group: 'Inhalte',
  },
  versions: {
    drafts: {
      autosave: { interval: 375 },
      schedulePublish: true,
    },
    maxPerDoc: 25,
  },
  access: {
    read: previewOrPublishedOrSignedIn,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Inhalt',
          fields: [
            { name: 'title', type: 'text', label: 'Titel', required: true, localized: true },
            {
              name: 'layout',
              type: 'blocks',
              label: 'Layout',
              localized: true,
              blocks: homepageBlocks,
            },
          ],
        },
        {
          label: 'SEO',
          fields: [seoField],
        },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      // Original Storyblok story uuid → idempotent upsert on re-import.
      name: 'storyblokUuid',
      type: 'text',
      label: 'Storyblok-UUID',
      unique: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true, description: 'Import-Referenz' },
    },
  ],
}
