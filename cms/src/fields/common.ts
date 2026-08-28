import type { CheckboxField } from 'payload'

/**
 * Shared "Sichtbar" toggle for homepage sections — with editor-friendly German
 * help text. Turning it off hides the section on the site without deleting its
 * content (mirrors Storyblok's per-block visibility toggle).
 */
export const visibleField = (): CheckboxField => ({
  name: 'visible',
  type: 'checkbox',
  label: 'Sichtbar',
  defaultValue: true,
  admin: {
    description: 'Deaktivieren, um diese Sektion auf der Website auszublenden — der Inhalt bleibt erhalten.',
  },
})

/** German picker groups so the "Block hinzufügen"-Dialog reads like Storyblok. */
export const BLOCK_GROUPS = {
  header: 'Kopfbereich',
  sections: 'Sektionen',
  closing: 'Abschluss',
} as const
