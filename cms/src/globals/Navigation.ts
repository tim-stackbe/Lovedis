import type { GlobalConfig } from 'payload'

import { isEditorOrAdmin } from '../access/roles'
import { linkField } from '../fields/link'

/**
 * Navigation — Storyblok `site-settings.navbar`. Menu items support up to two
 * dropdown levels (the baseline nests Fokusthemen → Überblick → topic).
 */
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Navigation',
  admin: {
    group: 'Einstellungen',
    description: 'Hauptmenü, Logo und CTA-Button der Website-Kopfzeile.',
  },
  access: {
    read: () => true,
    update: isEditorOrAdmin,
  },
  fields: [
    { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
    {
      type: 'row',
      fields: [
        { name: 'logoText', type: 'text', label: 'Logo-Text', admin: { width: '50%' } },
        { name: 'sticky', type: 'checkbox', label: 'Sticky', defaultValue: true, admin: { width: '25%' } },
        {
          name: 'showLanguageSwitcher',
          type: 'checkbox',
          label: 'Sprachumschalter',
          defaultValue: true,
          admin: { width: '25%' },
        },
      ],
    },
    linkField({ name: 'logoLink', label: 'Logo-Link' }),
    {
      name: 'menuItems',
      type: 'array',
      label: 'Menüpunkte',
      labels: { singular: 'Menüpunkt', plural: 'Menüpunkte' },
      fields: [
        { name: 'label', type: 'text', label: 'Label', localized: true },
        linkField({ name: 'link', label: 'Link' }),
        { name: 'hasDropdown', type: 'checkbox', label: 'Hat Dropdown', defaultValue: false },
        {
          name: 'dropdownItems',
          type: 'array',
          label: 'Dropdown-Einträge',
          admin: { condition: (_, siblingData) => Boolean(siblingData?.hasDropdown) },
          fields: [
            { name: 'label', type: 'text', label: 'Label', localized: true },
            linkField({ name: 'link', label: 'Link' }),
            {
              name: 'subItems',
              type: 'array',
              label: 'Unterpunkte',
              fields: [
                { name: 'label', type: 'text', label: 'Label', localized: true },
                linkField({ name: 'link', label: 'Link' }),
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'ctaButton',
      type: 'group',
      label: 'CTA-Button',
      fields: [
        { name: 'label', type: 'text', label: 'Label', localized: true },
        {
          name: 'variant',
          type: 'select',
          label: 'Variante',
          defaultValue: 'primary',
          options: [
            { label: 'Primär', value: 'primary' },
            { label: 'Sekundär', value: 'secondary' },
          ],
        },
        linkField({ name: 'link', label: 'Link' }),
      ],
    },
  ],
}
