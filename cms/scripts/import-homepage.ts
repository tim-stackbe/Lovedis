/**
 * Phase-1 homepage import: seeds the `home` page (de + en) into Payload from the
 * Storyblok baseline export (docs/storyblok-baseline/home.story.json).
 *
 * - Maps the 10 Storyblok bloks → the Payload `layout` blocks.
 * - Converts Storyblok richtext → Lexical.
 * - Best-effort downloads assets → Media entries (set IMPORT_MEDIA=false to skip).
 * - Idempotent: upserts the page by its Storyblok uuid.
 *
 * Usage:  npm run import:homepage
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'
import config from '../src/payload.config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const BASELINE = path.resolve(dirname, '../../docs/storyblok-baseline/home.story.json')
const IMPORT_MEDIA = process.env.IMPORT_MEDIA !== 'false'

type Locale = 'de' | 'en'
type Payload = Awaited<ReturnType<typeof getPayload>>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Blok = Record<string, any>

// --- Storyblok i18n helper -------------------------------------------------
// Storyblok stores translations as `field__i18n__en`. Return the localized
// value for `en`, falling back to the base (German) value.
function loc(blok: Blok, key: string, locale: Locale): unknown {
  if (locale === 'en') {
    const translated = blok[`${key}__i18n__en`]
    if (translated !== undefined && translated !== null && translated !== '') return translated
  }
  return blok[key]
}

// --- richtext helpers ------------------------------------------------------
function textNode(text: string, format = 0) {
  return { type: 'text', text, format, style: '', mode: 'normal', detail: 0, version: 1 }
}

function lexicalRoot(children: unknown[]) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: children.length > 0 ? children : [emptyParagraph()],
    },
  }
}

function emptyParagraph() {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    textFormat: 0,
    children: [],
  }
}

const MARK_FORMAT: Record<string, number> = { bold: 1, italic: 2, strike: 4, underline: 8, code: 16 }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inlineChildren(nodes: any[]): unknown[] {
  const out: unknown[] = []
  for (const node of nodes || []) {
    if (node.type !== 'text') continue
    const marks: string[] = (node.marks || []).map((m: Blok) => m.type)
    let format = 0
    for (const mark of marks) format |= MARK_FORMAT[mark] ?? 0
    const linkMark = (node.marks || []).find((m: Blok) => m.type === 'link')
    if (linkMark) {
      out.push({
        type: 'link',
        format: '',
        indent: 0,
        version: 3,
        direction: 'ltr',
        fields: {
          url: linkMark.attrs?.href || '#',
          newTab: linkMark.attrs?.target === '_blank',
          linkType: 'custom',
        },
        children: [textNode(node.text ?? '', format)],
      })
    } else {
      out.push(textNode(node.text ?? '', format))
    }
  }
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blockNode(node: any): unknown | null {
  switch (node.type) {
    case 'paragraph':
      return {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        children: inlineChildren(node.content || []),
      }
    case 'heading':
      return {
        type: 'heading',
        tag: `h${node.attrs?.level ?? 2}`,
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: inlineChildren(node.content || []),
      }
    case 'bullet_list':
    case 'ordered_list':
      return {
        type: 'list',
        listType: node.type === 'ordered_list' ? 'number' : 'bullet',
        start: 1,
        tag: node.type === 'ordered_list' ? 'ol' : 'ul',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        children: (node.content || []).map((li: any, i: number) => ({
          type: 'listitem',
          value: i + 1,
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: inlineChildren((li.content?.[0]?.content as unknown[]) || []),
        })),
      }
    default:
      return null
  }
}

// Convert a Storyblok richtext doc (or plain string) → Lexical JSON.
function toLexical(value: unknown) {
  if (!value) return lexicalRoot([])
  if (typeof value === 'string') {
    return lexicalRoot(
      value
        .split('\n')
        .filter(Boolean)
        .map((line) => ({
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          textFormat: 0,
          children: [textNode(line)],
        })),
    )
  }
  const doc = value as Blok
  if (doc.type === 'doc' && Array.isArray(doc.content)) {
    const children = doc.content.map(blockNode).filter(Boolean)
    return lexicalRoot(children as unknown[])
  }
  return lexicalRoot([])
}

// Flatten a Storyblok richtext doc (or string) → plain text.
function plain(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  const doc = value as Blok
  if (Array.isArray(doc.content)) {
    return doc.content
      .map((node: Blok) =>
        node.type === 'text' ? node.text : Array.isArray(node.content) ? plain(node) : '',
      )
      .join(' ')
      .trim()
  }
  return ''
}

function locPlain(blok: Blok, key: string, locale: Locale): string {
  return plain(loc(blok, key, locale))
}

// --- link mapping ----------------------------------------------------------
function mapLink(sb: Blok | undefined) {
  if (!sb) return undefined
  const url = sb.url || sb.cached_url || ''
  return {
    type: 'external' as const,
    url,
    anchor: sb.anchor || '',
    newTab: sb.target === '_blank',
  }
}

// --- media mapping (best-effort) -------------------------------------------
const mediaCache = new Map<string, number | undefined>()

async function ensureMedia(
  payload: Payload,
  asset: Blok | undefined,
): Promise<number | undefined> {
  const url: string | undefined = asset?.filename
  if (!IMPORT_MEDIA || !url) return undefined
  if (mediaCache.has(url)) return mediaCache.get(url)

  const existing = await payload.find({
    collection: 'media',
    where: { sourceUrl: { equals: url } },
    limit: 1,
  })
  if (existing.docs.length > 0) {
    const id = existing.docs[0].id as number
    mediaCache.set(url, id)
    return id
  }

  try {
    const controller = AbortSignal.timeout(20000)
    const res = await fetch(url, { signal: controller })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const filename = path.basename(new URL(url).pathname) || `asset-${Date.now()}`
    const tmp = path.join(os.tmpdir(), `sb-${Date.now()}-${filename}`)
    fs.writeFileSync(tmp, buffer)
    const doc = await payload.create({
      collection: 'media',
      data: { alt: asset?.alt || filename, sourceUrl: url },
      filePath: tmp,
    })
    fs.unlinkSync(tmp)
    mediaCache.set(url, doc.id as number)
    console.log(`[import] media ✓ ${filename}`)
    return doc.id as number
  } catch (error) {
    console.warn(`[import] media ✗ ${url} (${String(error)})`)
    mediaCache.set(url, undefined)
    return undefined
  }
}

// --- block mappers ---------------------------------------------------------
async function mapBlok(payload: Payload, blok: Blok, locale: Locale): Promise<Blok | null> {
  switch (blok.component) {
    case 'hero':
      return {
        blockType: 'hero',
        visible: blok.visible ?? true,
        headline: toLexical(loc(blok, 'headline', locale)),
        description: locPlain(blok, 'description', locale),
        primaryCtaText: loc(blok, 'primary_cta_text', locale),
        textColor: blok.text_color || undefined,
        backgroundColor: blok.background_color || undefined,
        primaryCtaLink: mapLink(blok.primary_cta_link),
        heroImage: await ensureMedia(payload, blok.hero_image),
        heroImageTablet: await ensureMedia(payload, blok.hero_image_tablet),
        heroImageMobile: await ensureMedia(payload, blok.hero_image_mobile),
        quickAccessCards: await Promise.all(
          (blok.quick_access_cards || []).map(async (card: Blok) => ({
            title: loc(card, 'title', locale),
            variant: card.variant || undefined,
            position: card.position || undefined,
            link: mapLink(card.link),
          })),
        ),
      }
    case 'benefits-bento':
      return {
        blockType: 'benefitsBento',
        visible: blok.visible ?? true,
        tagline: loc(blok, 'tagline', locale),
        headline: loc(blok, 'headline', locale),
        description: locPlain(blok, 'description', locale),
        ctaText: loc(blok, 'cta_text', locale),
        ctaLink: mapLink(blok.cta_link),
        cards: await Promise.all(
          (blok.cards || []).map(async (card: Blok) => ({
            title: loc(card, 'title', locale),
            description: locPlain(card, 'description', locale),
            icon: await ensureMedia(payload, card.icon),
            backgroundColor: card.background_color || undefined,
            textColor: card.text_color || undefined,
          })),
        ),
      }
    case 'programs-section':
      return {
        blockType: 'programsSection',
        visible: blok.visible ?? true,
        tagline: loc(blok, 'tagline', locale),
        headline: loc(blok, 'headline', locale),
        description: locPlain(blok, 'description', locale),
        ctaText: loc(blok, 'cta_text', locale),
        sectionId: blok.section_id || undefined,
        ctaLink: mapLink(blok.cta_link),
        programs: await Promise.all(
          (blok.programs || []).map(async (program: Blok) => ({
            title: loc(program, 'title', locale),
            description: locPlain(program, 'description', locale),
            stageLabel: loc(program, 'stage_label', locale),
            backgroundColor: program.background_color || undefined,
            image: await ensureMedia(payload, program.image),
            imageTablet: await ensureMedia(payload, program.image_tablet),
            imageMobile: await ensureMedia(payload, program.image_mobile),
            link: mapLink(program.link),
          })),
        ),
      }
    case 'challenges-section':
      return {
        blockType: 'challengesSection',
        visible: blok.visible ?? true,
        tagline: locPlain(blok, 'tagline', locale),
        headline: loc(blok, 'headline', locale),
        description: locPlain(blok, 'description', locale),
        ctaText: loc(blok, 'cta_text', locale),
        ctaLink: mapLink(blok.cta_link),
        challenges: await Promise.all(
          (blok.challenges || []).map(async (challenge: Blok) => ({
            title: locPlain(challenge, 'title', locale),
            category: loc(challenge, 'category', locale),
            description: toLexical(loc(challenge, 'description', locale)),
            ctaText: loc(challenge, 'cta_text', locale),
            ctaLink: mapLink(challenge.cta_link),
            featuredImage: await ensureMedia(payload, challenge.featured_image),
            featuredImageTablet: await ensureMedia(payload, challenge.featured_image_tablet),
            featuredImageMobile: await ensureMedia(payload, challenge.featured_image_mobile),
          })),
        ),
      }
    case 'why-join-us-section':
      return {
        blockType: 'whyJoinUsSection',
        visible: blok.visible ?? true,
        tagline: loc(blok, 'tagline', locale),
        headline: loc(blok, 'headline', locale),
        subtitle: locPlain(blok, 'subtitle', locale),
        description: locPlain(blok, 'description', locale),
        backgroundStyle: blok.background_style || undefined,
        tab1Label: loc(blok, 'tab_1_label', locale),
        tab2Label: loc(blok, 'tab_2_label', locale),
        tab1Cards: await mapWhyCards(payload, blok.tab_1_cards, locale),
        tab2Cards: await mapWhyCards(payload, blok.tab_2_cards, locale),
      }
    case 'key-topics-slider-section':
      return {
        blockType: 'keyTopicsSliderSection',
        visible: blok.visible ?? true,
        tagline: loc(blok, 'tagline', locale),
        headline: loc(blok, 'headline', locale),
        subtitle: locPlain(blok, 'subtitle', locale),
        description: toLexical(loc(blok, 'description', locale)),
        ctaText: loc(blok, 'cta_text', locale),
        sliderLabel: loc(blok, 'slider_label', locale),
        ctaLink: mapLink(blok.cta_link),
        topics: await Promise.all(
          (blok.topics || []).map(async (topic: Blok) => ({
            title: locPlain(topic, 'title', locale),
            cardTitle: loc(topic, 'card_title', locale),
            cardDescription: locPlain(topic, 'card_description', locale),
            linkText: loc(topic, 'link_text', locale),
            accentColor: topic.accent_color || undefined,
            link: mapLink(topic.link),
            image: await ensureMedia(payload, topic.image),
            imageTablet: await ensureMedia(payload, topic.image_tablet),
            imageMobile: await ensureMedia(payload, topic.image_mobile),
          })),
        ),
      }
    case 'homepage-partners-section':
      return {
        blockType: 'homepagePartnersSection',
        visible: blok.visible ?? true,
        tagline: loc(blok, 'tagline', locale),
        title: loc(blok, 'title', locale),
        subtitle: locPlain(blok, 'subtitle', locale),
        ctaText: loc(blok, 'cta_text', locale),
        rowCount: blok.row_count || undefined,
        backgroundColor: blok.background_color || undefined,
        ctaLink: mapLink(blok.cta_link),
        logos: await Promise.all(
          (blok.logos || []).map(async (logo: Blok) => ({
            name: logo.name,
            logo: await ensureMedia(payload, logo.logo),
            link: mapLink(logo.link),
          })),
        ),
      }
    case 'ecosystem-diagram-section':
      return {
        blockType: 'ecosystemDiagramSection',
        visible: blok.visible ?? true,
        tagline: loc(blok, 'tagline', locale),
        headline: loc(blok, 'headline', locale),
        description: locPlain(blok, 'description', locale),
        ctaText: loc(blok, 'cta_text', locale),
        textColor: blok.text_color || undefined,
        ctaLink: mapLink(blok.cta_link),
        layers: (blok.layers || []).map((layer: Blok) => ({
          label: loc(layer, 'label', locale),
          position: layer.position || undefined,
          textColor: layer.text_color || undefined,
          backgroundColor: layer.background_color || undefined,
        })),
      }
    case 'homepage-events-section':
      return {
        blockType: 'homepageEventsSection',
        visible: blok.visible ?? true,
        tagline: loc(blok, 'tagline', locale),
        headline: loc(blok, 'headline', locale),
        subtitle: locPlain(blok, 'subtitle', locale),
        description: locPlain(blok, 'description', locale),
        ctaText: loc(blok, 'cta_text', locale),
        ctaLink: mapLink(blok.cta_link),
        maxEvents: blok.max_events ? Number(blok.max_events) : undefined,
        selectionMode: blok.selection_mode === 'manual' ? 'manual' : 'automatic',
        events: await Promise.all(
          (blok.events || []).map(async (event: Blok) => ({
            title: loc(event, 'title', locale),
            date: event.date || undefined,
            location: event.location || undefined,
            hostedBy: event.hosted_by || undefined,
            tags: event.tags || undefined,
            colorTheme: event.color_theme || undefined,
            ctaText: loc(event, 'cta_text', locale),
            image: await ensureMedia(payload, event.image),
            link: mapLink(event.link),
          })),
        ),
      }
    case 'cta-section':
      return {
        blockType: 'ctaSection',
        visible: blok.visible ?? true,
        tagline: loc(blok, 'tagline', locale),
        title: locPlain(blok, 'title', locale),
        subtitle: locPlain(blok, 'subtitle', locale),
        ctaText: loc(blok, 'cta_text', locale),
        ctaLink: mapLink(blok.cta_link),
        sectionId: blok.section_id || undefined,
        imageFit: blok.image_fit || undefined,
        imagePosition: blok.image_position || undefined,
        image: await ensureMedia(payload, blok.image),
        mobileImage: await ensureMedia(payload, blok.mobile_image),
      }
    default:
      console.warn(`[import] unmapped blok: ${blok.component}`)
      return null
  }
}

async function mapWhyCards(payload: Payload, cards: Blok[] | undefined, locale: Locale) {
  return Promise.all(
    (cards || []).map(async (card: Blok) => ({
      title: locPlain(card, 'title', locale),
      description: locPlain(card, 'description', locale),
      icon: await ensureMedia(payload, card.icon),
    })),
  )
}

async function buildLayout(payload: Payload, body: Blok[], locale: Locale): Promise<Blok[]> {
  const blocks: Blok[] = []
  for (const blok of body) {
    const mapped = await mapBlok(payload, blok, locale)
    if (mapped) blocks.push(mapped)
  }
  return blocks
}

// --- main ------------------------------------------------------------------
async function run() {
  const raw = JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
  const story = raw.story
  const uuid: string = story.uuid
  const slug: string = story.slug || 'home'
  const body: Blok[] = story.content?.body || []

  const payload = await getPayload({ config })

  console.log(`[import] building de layout (${body.length} bloks)…`)
  const layoutDe = await buildLayout(payload, body, 'de')
  console.log(`[import] building en layout…`)
  const layoutEn = await buildLayout(payload, body, 'en')

  const existing = await payload.find({
    collection: 'pages',
    where: { storyblokUuid: { equals: uuid } },
    limit: 1,
  })

  let pageId: number | string
  if (existing.docs.length > 0) {
    pageId = existing.docs[0].id
    await payload.update({
      collection: 'pages',
      id: pageId,
      locale: 'de',
      data: { title: 'Home', slug, layout: layoutDe as never, _status: 'published' },
    })
    console.log(`[import] updated existing page ${pageId} (de).`)
  } else {
    const created = await payload.create({
      collection: 'pages',
      locale: 'de',
      data: { title: 'Home', slug, storyblokUuid: uuid, layout: layoutDe as never, _status: 'published' },
    })
    pageId = created.id
    console.log(`[import] created page ${pageId} (de).`)
  }

  await payload.update({
    collection: 'pages',
    id: pageId,
    locale: 'en',
    data: { title: 'Home', layout: layoutEn as never, _status: 'published' },
  })
  console.log('[import] updated page (en).')

  console.log('[import] Done. Homepage imported for de + en.')
  process.exit(0)
}

run().catch((error) => {
  console.error('[import] Failed:', error)
  process.exit(1)
})
