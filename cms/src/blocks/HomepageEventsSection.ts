import type { Block } from 'payload'

import { BLOCK_GROUPS, visibleField } from '../fields/common'
import { linkField } from '../fields/link'

/** Storyblok `homepage-events-section` (events = `homepage-event-card`). */
export const HomepageEventsSection: Block = {
  slug: 'homepageEventsSection',
  dbName: 'evt',
  labels: { singular: 'Events-Sektion', plural: 'Events-Sektionen' },
  admin: {
    group: BLOCK_GROUPS.sections,
    images: { thumbnail: '/block-previews/events.svg' },
  },
  fields: [
    visibleField(),
    { name: 'tagline', type: 'text', label: 'Tagline', localized: true },
    { name: 'headline', type: 'text', label: 'Überschrift', localized: true },
    { name: 'subtitle', type: 'textarea', label: 'Untertitel', localized: true },
    { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
    { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true },
    linkField({ name: 'ctaLink', label: 'CTA-Link' }),
    {
      type: 'row',
      fields: [
        { name: 'maxEvents', type: 'number', label: 'Max. Events', admin: { width: '50%' } },
        {
          name: 'selectionMode',
          type: 'select',
          label: 'Auswahlmodus',
          defaultValue: 'automatic',
          options: [
            { label: 'Automatisch', value: 'automatic' },
            { label: 'Manuell', value: 'manual' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'selectedEvents',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true,
      label: 'Ausgewählte Events (manuell)',
      admin: { condition: (_, siblingData) => siblingData?.selectionMode === 'manual' },
    },
    {
      name: 'events',
      type: 'array',
      label: 'Event-Karten (statisch)',
      labels: { singular: 'Event-Karte', plural: 'Event-Karten' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', label: 'Titel', localized: true },
        {
          type: 'row',
          fields: [
            { name: 'date', type: 'text', label: 'Datum', admin: { width: '50%' } },
            { name: 'location', type: 'text', label: 'Ort', admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'hostedBy', type: 'text', label: 'Veranstalter', admin: { width: '34%' } },
            { name: 'tags', type: 'text', label: 'Tags', admin: { width: '33%' } },
            {
              name: 'colorTheme',
              type: 'select',
              label: 'Farbschema',
              options: [
                { label: 'Pink', value: 'pink' },
                { label: 'Blau', value: 'blue' },
                { label: 'Hellblau', value: 'light-blue' },
              ],
              admin: { width: '33%' },
            },
          ],
        },
        { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
        linkField({ name: 'link', label: 'Link' }),
      ],
    },
  ],
}
