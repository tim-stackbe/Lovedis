import type { Block } from 'payload'

import { linkField } from '../fields/link'

/** Storyblok `ecosystem-diagram-section` (layers = `ecosystem-diagram-layer`). */
export const EcosystemDiagramSection: Block = {
  slug: 'ecosystemDiagramSection',
  dbName: 'eco',
  labels: { singular: 'Ökosystem-Diagramm', plural: 'Ökosystem-Diagramme' },
  fields: [
    { name: 'visible', type: 'checkbox', label: 'Sichtbar', defaultValue: true },
    { name: 'tagline', type: 'text', label: 'Tagline', localized: true },
    { name: 'headline', type: 'text', label: 'Überschrift', localized: true },
    { name: 'description', type: 'textarea', label: 'Beschreibung', localized: true },
    {
      type: 'row',
      fields: [
        { name: 'ctaText', type: 'text', label: 'CTA-Text', localized: true, admin: { width: '50%' } },
        { name: 'textColor', type: 'text', label: 'Textfarbe', admin: { width: '50%' } },
      ],
    },
    linkField({ name: 'ctaLink', label: 'CTA-Link' }),
    {
      name: 'layers',
      type: 'array',
      label: 'Ebenen',
      labels: { singular: 'Ebene', plural: 'Ebenen' },
      fields: [
        { name: 'label', type: 'text', label: 'Beschriftung', localized: true },
        {
          type: 'row',
          fields: [
            {
              name: 'position',
              type: 'select',
              label: 'Position',
              options: [
                { label: 'Links', value: 'left' },
                { label: 'Rechts', value: 'right' },
              ],
              admin: { width: '34%' },
            },
            { name: 'textColor', type: 'text', label: 'Textfarbe', admin: { width: '33%' } },
            { name: 'backgroundColor', type: 'text', label: 'Hintergrundfarbe', admin: { width: '33%' } },
          ],
        },
      ],
    },
  ],
}
