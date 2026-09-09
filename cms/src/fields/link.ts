import type { Field } from 'payload'

type LinkFieldOptions = {
  /** Field name (default: `link`). */
  name?: string
  /** German admin label. */
  label?: string
  /** Include a visible link-text field alongside the target. */
  withLabel?: boolean
  localized?: boolean
}

/**
 * Reusable link field — the Payload analogue of Storyblok's `multilink`.
 * Supports an internal reference (→ Pages) or an external/absolute URL,
 * plus an optional anchor and "open in new tab" toggle.
 */
export const linkField = (options: LinkFieldOptions = {}): Field => {
  const { name = 'link', label = 'Link', withLabel = false, localized = false } = options

  const fields: Field[] = [
    {
      name: 'type',
      type: 'radio',
      defaultValue: 'internal',
      admin: { layout: 'horizontal' },
      options: [
        { label: 'Interne Seite', value: 'internal' },
        { label: 'Externe URL', value: 'external' },
      ],
    },
    {
      name: 'page',
      type: 'relationship',
      relationTo: 'pages',
      label: 'Zielseite',
      admin: { condition: (_, siblingData) => siblingData?.type === 'internal' },
    },
    {
      name: 'url',
      type: 'text',
      label: 'URL',
      admin: { condition: (_, siblingData) => siblingData?.type === 'external' },
    },
    {
      name: 'anchor',
      type: 'text',
      label: 'Anker (optional)',
      admin: { description: 'z. B. programs oder apply (ohne #)' },
    },
    {
      name: 'newTab',
      type: 'checkbox',
      label: 'In neuem Tab öffnen',
      defaultValue: false,
    },
  ]

  if (withLabel) {
    fields.unshift({
      name: 'label',
      type: 'text',
      label: 'Linktext',
      localized,
    })
  }

  return {
    name,
    type: 'group',
    label,
    fields,
  }
}
