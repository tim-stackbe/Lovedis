import type { Block, Field } from 'payload'

import { BLOCK_GROUPS, visibleField } from '../fields/common'

const whyJoinCards = (name: string, label: string): Field => ({
  name,
  type: 'array',
  label,
  labels: { singular: 'Karte', plural: 'Karten' },
  admin: { initCollapsed: true },
  fields: [
    { name: 'title', type: 'text', label: 'Titel', localized: true },
    { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
    { name: 'icon', type: 'upload', relationTo: 'media', label: 'Icon' },
  ],
})

/** Storyblok `why-join-us-section` with two tabs (cards = `why-join-us-card`). */
export const WhyJoinUsSection: Block = {
  slug: 'whyJoinUsSection',
  dbName: 'why',
  labels: { singular: 'Why-Join-Us-Sektion', plural: 'Why-Join-Us-Sektionen' },
  admin: {
    group: BLOCK_GROUPS.sections,
    images: { thumbnail: '/block-previews/why-join-us.svg' },
  },
  fields: [
    visibleField(),
    { name: 'tagline', type: 'text', label: 'Tagline', localized: true },
    { name: 'headline', type: 'text', label: 'Überschrift', localized: true },
    { name: 'subtitle', type: 'textarea', label: 'Untertitel', localized: true },
    { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
    { name: 'backgroundStyle', type: 'text', label: 'Hintergrund-Stil' },
    {
      type: 'row',
      fields: [
        { name: 'tab1Label', type: 'text', label: 'Tab 1 – Label', localized: true, admin: { width: '50%' } },
        { name: 'tab2Label', type: 'text', label: 'Tab 2 – Label', localized: true, admin: { width: '50%' } },
      ],
    },
    whyJoinCards('tab1Cards', 'Tab 1 – Karten'),
    whyJoinCards('tab2Cards', 'Tab 2 – Karten'),
  ],
}
