import type { GlobalConfig } from 'payload'

import { isEditorOrAdmin } from '../access/roles'
import { linkField } from '../fields/link'

/** Storyblok `site-settings` (footer + feature toggles + defaults). */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Website-Einstellungen',
  admin: { group: 'Einstellungen' },
  access: {
    read: () => true,
    update: isEditorOrAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'showNavbar', type: 'checkbox', label: 'Navbar anzeigen', defaultValue: true, admin: { width: '50%' } },
        { name: 'showFooter', type: 'checkbox', label: 'Footer anzeigen', defaultValue: true, admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'hideNavbarRoutes', type: 'text', label: 'Navbar ausblenden (Routen)', admin: { width: '50%' } },
        { name: 'hideFooterRoutes', type: 'text', label: 'Footer ausblenden (Routen)', admin: { width: '50%' } },
      ],
    },
    {
      name: 'footer',
      type: 'group',
      label: 'Footer',
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
        { name: 'copyrightText', type: 'text', label: 'Copyright-Text' },
        {
          name: 'columns',
          type: 'array',
          label: 'Spalten',
          labels: { singular: 'Spalte', plural: 'Spalten' },
          fields: [
            { name: 'title', type: 'text', label: 'Titel', localized: true },
            {
              name: 'links',
              type: 'array',
              label: 'Links',
              fields: [linkField({ name: 'link', label: 'Link', withLabel: true, localized: true })],
            },
          ],
        },
        {
          name: 'legalLinks',
          type: 'array',
          label: 'Rechtliche Links',
          fields: [linkField({ name: 'link', label: 'Link', withLabel: true, localized: true })],
        },
        {
          name: 'socialLinks',
          type: 'array',
          label: 'Social-Links',
          fields: [linkField({ name: 'link', label: 'Link', withLabel: true })],
        },
      ],
    },
    {
      name: 'newsletter',
      type: 'group',
      label: 'Newsletter',
      fields: [
        { name: 'show', type: 'checkbox', label: 'Anzeigen', defaultValue: true },
        { name: 'title', type: 'text', label: 'Titel', localized: true },
        { name: 'text', type: 'text', label: 'Text', localized: true },
        { name: 'buttonText', type: 'text', label: 'Button-Text', localized: true },
        { name: 'embedCode', type: 'textarea', label: 'Embed-Code' },
      ],
    },
  ],
}
