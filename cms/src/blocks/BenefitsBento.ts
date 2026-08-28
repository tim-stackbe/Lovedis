import type { Block } from 'payload'

import { BLOCK_GROUPS, visibleField } from '../fields/common'
import { linkField } from '../fields/link'

/** Storyblok `benefits-bento` (cards = `bento-box`). */
export const BenefitsBento: Block = {
  slug: 'benefitsBento',
  dbName: 'bento',
  labels: { singular: 'Benefits-Bento', plural: 'Benefits-Bentos' },
  admin: {
    group: BLOCK_GROUPS.sections,
    images: { thumbnail: '/block-previews/benefits-bento.svg' },
  },
  fields: [
    visibleField(),
    {
      name: 'tagline',
      type: 'text',
      label: 'Tagline',
      localized: true,
      admin: { description: 'Kurze Kennzeichnung über der Überschrift (z. B. „Vorteile").' },
    },
    { name: 'headline', type: 'text', label: 'Überschrift', localized: true },
    { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
    { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true },
    linkField({ name: 'ctaLink', label: 'CTA-Link' }),
    {
      name: 'cards',
      type: 'array',
      label: 'Bento-Karten',
      labels: { singular: 'Karte', plural: 'Karten' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', label: 'Titel', localized: true },
        { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
        { name: 'icon', type: 'upload', relationTo: 'media', label: 'Icon' },
        {
          type: 'row',
          fields: [
            { name: 'backgroundColor', type: 'text', label: 'Hintergrundfarbe', admin: { width: '50%' } },
            { name: 'textColor', type: 'text', label: 'Textfarbe', admin: { width: '50%' } },
          ],
        },
      ],
    },
  ],
}
