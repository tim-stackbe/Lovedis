import type { Block } from 'payload'

import { BLOCK_GROUPS, visibleField } from '../fields/common'
import { linkField } from '../fields/link'

/** Storyblok `homepage-partners-section` (logos = `homepage-partner-logo`). */
export const HomepagePartnersSection: Block = {
  slug: 'homepagePartnersSection',
  dbName: 'prtnrs',
  labels: { singular: 'Partner-Sektion', plural: 'Partner-Sektionen' },
  admin: {
    group: BLOCK_GROUPS.sections,
    images: { thumbnail: '/block-previews/partners.svg' },
  },
  fields: [
    visibleField(),
    { name: 'tagline', type: 'text', label: 'Tagline', localized: true },
    { name: 'title', type: 'text', label: 'Titel', localized: true },
    { name: 'subtitle', type: 'textarea', label: 'Untertitel', localized: true },
    {
      type: 'row',
      fields: [
        { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true, admin: { width: '34%' } },
        { name: 'rowCount', type: 'text', label: 'Zeilenanzahl', admin: { width: '33%' } },
        { name: 'backgroundColor', type: 'text', label: 'Hintergrundfarbe', admin: { width: '33%' } },
      ],
    },
    linkField({ name: 'ctaLink', label: 'CTA-Link' }),
    {
      name: 'logos',
      type: 'array',
      label: 'Partner-Logos',
      labels: { singular: 'Logo', plural: 'Logos' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'name', type: 'text', label: 'Name' },
        { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
        { name: 'partner', type: 'relationship', relationTo: 'partners', label: 'Partner-Eintrag' },
        linkField({ name: 'link', label: 'Link (optional)' }),
      ],
    },
  ],
}
