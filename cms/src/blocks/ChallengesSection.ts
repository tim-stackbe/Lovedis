import type { Block } from 'payload'

import { linkField } from '../fields/link'

/** Storyblok `challenges-section` (challenges = `key-topic-challenge-card`). */
export const ChallengesSection: Block = {
  slug: 'challengesSection',
  dbName: 'chal',
  labels: { singular: 'Challenges-Sektion', plural: 'Challenges-Sektionen' },
  fields: [
    { name: 'visible', type: 'checkbox', label: 'Sichtbar', defaultValue: true },
    { name: 'tagline', type: 'text', label: 'Tagline', localized: true },
    { name: 'headline', type: 'text', label: 'Überschrift', localized: true },
    { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
    { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true },
    linkField({ name: 'ctaLink', label: 'CTA-Link' }),
    {
      name: 'challenges',
      type: 'array',
      label: 'Challenges',
      labels: { singular: 'Challenge', plural: 'Challenges' },
      fields: [
        { name: 'title', type: 'text', label: 'Titel', localized: true },
        { name: 'category', type: 'text', label: 'Kategorie', localized: true },
        { name: 'description', type: 'richText', label: 'Beschreibung', localized: true },
        { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true },
        linkField({ name: 'ctaLink', label: 'CTA-Link' }),
        { name: 'featuredImage', type: 'upload', relationTo: 'media', label: 'Titelbild (Desktop)' },
        { name: 'featuredImageTablet', type: 'upload', relationTo: 'media', label: 'Titelbild (Tablet)' },
        { name: 'featuredImageMobile', type: 'upload', relationTo: 'media', label: 'Titelbild (Mobil)' },
      ],
    },
  ],
}
