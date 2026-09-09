import type { Block } from 'payload'

import { BLOCK_GROUPS, visibleField } from '../fields/common'
import { linkField } from '../fields/link'

/** Storyblok `hero` → Payload block. Headline uses Lexical rich text. */
export const Hero: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  admin: {
    group: BLOCK_GROUPS.header,
    images: { thumbnail: '/block-previews/hero.svg' },
  },
  fields: [
    visibleField(),
    {
      name: 'headline',
      type: 'richText',
      label: 'Überschrift',
      localized: true,
      admin: { description: 'Große Titelzeile ganz oben auf der Seite.' },
    },
    { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
    {
      type: 'row',
      fields: [
        { name: 'primaryCtaText', type: 'text', label: 'CTA-Text', localized: true, admin: { width: '50%' } },
        { name: 'textColor', type: 'text', label: 'Textfarbe', admin: { width: '25%' } },
        { name: 'backgroundColor', type: 'text', label: 'Hintergrundfarbe', admin: { width: '25%' } },
      ],
    },
    linkField({ name: 'primaryCtaLink', label: 'Primärer CTA-Link' }),
    { name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Hero-Bild (Desktop)' },
    { name: 'heroImageTablet', type: 'upload', relationTo: 'media', label: 'Hero-Bild (Tablet)' },
    { name: 'heroImageMobile', type: 'upload', relationTo: 'media', label: 'Hero-Bild (Mobil)' },
    {
      name: 'quickAccessCards',
      type: 'array',
      label: 'Quick-Access-Karten',
      labels: { singular: 'Karte', plural: 'Karten' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', label: 'Titel', localized: true },
        {
          type: 'row',
          fields: [
            {
              name: 'variant',
              type: 'select',
              label: 'Variante',
              options: [
                { label: 'Brand', value: 'brand' },
                { label: 'Accent', value: 'accent' },
              ],
              admin: { width: '50%' },
            },
            {
              name: 'position',
              type: 'select',
              label: 'Position',
              options: [
                { label: 'Links', value: 'left' },
                { label: 'Rechts', value: 'right' },
              ],
              admin: { width: '50%' },
            },
          ],
        },
        linkField({ name: 'link', label: 'Link' }),
      ],
    },
  ],
}
