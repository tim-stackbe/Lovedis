import type { Block } from 'payload'

import { linkField } from '../fields/link'

/** Storyblok `programs-section` (programs = `program-card`). */
export const ProgramsSection: Block = {
  slug: 'programsSection',
  dbName: 'prog',
  labels: { singular: 'Programme-Sektion', plural: 'Programme-Sektionen' },
  fields: [
    { name: 'visible', type: 'checkbox', label: 'Sichtbar', defaultValue: true },
    { name: 'tagline', type: 'text', label: 'Tagline', localized: true },
    { name: 'headline', type: 'text', label: 'Überschrift', localized: true },
    { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
    {
      type: 'row',
      fields: [
        { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true, admin: { width: '50%' } },
        { name: 'sectionId', type: 'text', label: 'Sektion-ID (Anker)', admin: { width: '50%' } },
      ],
    },
    linkField({ name: 'ctaLink', label: 'CTA-Link' }),
    {
      name: 'programs',
      type: 'array',
      label: 'Programme',
      labels: { singular: 'Programm', plural: 'Programme' },
      fields: [
        { name: 'title', type: 'text', label: 'Titel', localized: true },
        { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
        {
          type: 'row',
          fields: [
            { name: 'stageLabel', type: 'text', label: 'Stufen-Label', localized: true, admin: { width: '50%' } },
            { name: 'backgroundColor', type: 'text', label: 'Hintergrundfarbe', admin: { width: '50%' } },
          ],
        },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild (Desktop)' },
        { name: 'imageTablet', type: 'upload', relationTo: 'media', label: 'Bild (Tablet)' },
        { name: 'imageMobile', type: 'upload', relationTo: 'media', label: 'Bild (Mobil)' },
        linkField({ name: 'link', label: 'Link' }),
      ],
    },
  ],
}
