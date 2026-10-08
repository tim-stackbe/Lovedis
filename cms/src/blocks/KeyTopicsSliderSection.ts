import type { Block } from 'payload'

import { BLOCK_GROUPS, visibleField } from '../fields/common'
import { linkField } from '../fields/link'

/** Storyblok `key-topics-slider-section` (topics = `key-topic-item`). */
export const KeyTopicsSliderSection: Block = {
  slug: 'keyTopicsSliderSection',
  dbName: 'topics',
  labels: { singular: 'Key-Topics-Slider', plural: 'Key-Topics-Slider' },
  admin: {
    group: BLOCK_GROUPS.sections,
    images: { thumbnail: '/block-previews/key-topics.svg' },
  },
  fields: [
    visibleField(),
    { name: 'tagline', type: 'text', label: 'Tagline', localized: true },
    { name: 'headline', type: 'text', label: 'Überschrift', localized: true },
    { name: 'subtitle', type: 'textarea', label: 'Untertitel', localized: true },
    { name: 'description', type: 'richText', label: 'Beschreibung', localized: true },
    {
      type: 'row',
      fields: [
        { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true, admin: { width: '50%' } },
        { name: 'sliderLabel', type: 'text', label: 'Slider-Label', localized: true, admin: { width: '50%' } },
      ],
    },
    linkField({ name: 'ctaLink', label: 'CTA-Link' }),
    {
      name: 'topics',
      type: 'array',
      label: 'Fokusthemen',
      labels: { singular: 'Fokusthema', plural: 'Fokusthemen' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', label: 'Titel', localized: true },
        { name: 'cardTitle', type: 'text', label: 'Karten-Titel', localized: true },
        { name: 'cardDescription', type: 'textarea', label: 'Karten-Beschreibung', localized: true },
        {
          type: 'row',
          fields: [
            { name: 'linkText', type: 'text', label: 'Linktext', localized: true, admin: { width: '50%' } },
            { name: 'accentColor', type: 'text', label: 'Akzentfarbe', admin: { width: '50%' } },
          ],
        },
        linkField({ name: 'link', label: 'Link' }),
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild (Desktop)' },
        { name: 'imageTablet', type: 'upload', relationTo: 'media', label: 'Bild (Tablet)' },
        { name: 'imageMobile', type: 'upload', relationTo: 'media', label: 'Bild (Mobil)' },
      ],
    },
  ],
}
