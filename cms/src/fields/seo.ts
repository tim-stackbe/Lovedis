import type { Field } from 'payload'

/** SEO field group shared by content collections (mirrors Storyblok seo_* + og_image). */
export const seoField: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'SEO-Titel',
      localized: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'SEO-Beschreibung',
      localized: true,
    },
    {
      name: 'ogImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Open-Graph-Bild',
    },
  ],
}
