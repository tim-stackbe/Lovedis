import type { Block } from 'payload'

import { linkField } from '../fields/link'

/** Storyblok `cta-section` → Payload block. */
export const CtaSection: Block = {
  slug: 'ctaSection',
  dbName: 'cta',
  labels: { singular: 'CTA-Sektion', plural: 'CTA-Sektionen' },
  fields: [
    { name: 'visible', type: 'checkbox', label: 'Sichtbar', defaultValue: true },
    { name: 'tagline', type: 'text', label: 'Tagline', localized: true },
    { name: 'title', type: 'text', label: 'Titel', localized: true },
    { name: 'subtitle', type: 'textarea', label: 'Untertitel', localized: true },
    { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true },
    linkField({ name: 'ctaLink', label: 'CTA-Link' }),
    {
      type: 'row',
      fields: [
        { name: 'sectionId', type: 'text', label: 'Sektion-ID (Anker)', admin: { width: '34%' } },
        { name: 'imageFit', type: 'text', label: 'Bild-Fit', admin: { width: '33%' } },
        { name: 'imagePosition', type: 'text', label: 'Bild-Position', admin: { width: '33%' } },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild (Desktop)' },
    { name: 'mobileImage', type: 'upload', relationTo: 'media', label: 'Bild (Mobil)' },
  ],
}
