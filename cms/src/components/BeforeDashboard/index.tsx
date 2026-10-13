import type React from 'react'

/**
 * German welcome shown at the top of the admin dashboard
 * (`admin.components.beforeDashboard`). Gives non-technical editors a friendly
 * starting point with quick links and a one-line Live-Preview how-to.
 *
 * Server component — no client JS, no data fetching; robust and lightweight.
 */
const quickLinks: { href: string; title: string; hint: string }[] = [
  { href: '/admin/collections/pages', title: 'Seiten bearbeiten', hint: 'Startseite & Inhalte' },
  { href: '/admin/collections/media', title: 'Medien', hint: 'Bilder & Logos' },
  { href: '/admin/globals/navigation', title: 'Navigation', hint: 'Menü & Kopfzeile' },
  { href: '/admin/globals/site-settings', title: 'Einstellungen', hint: 'Footer & Newsletter' },
]

export const BeforeDashboard: React.FC = () => {
  return (
    <section className="lovedis-welcome">
      <h2 className="lovedis-welcome__title">Willkommen im Lovedis CMS</h2>
      <p className="lovedis-welcome__lead">
        Hier pflegst du die Inhalte von lovedis.de. Öffne eine <strong>Seite</strong> und wechsle
        oben auf den Reiter <strong>{'„Live Preview"'}</strong>, um deine Änderungen sofort neben
        dem Editor zu sehen. Speichern legt zunächst einen <strong>Entwurf</strong> an – erst{' '}
        <strong>{'„Veröffentlichen"'}</strong> aktualisiert die Live-Website.
      </p>
      <div className="lovedis-welcome__links">
        {quickLinks.map((link) => (
          <a key={link.href} className="lovedis-welcome__card" href={link.href}>
            <span className="lovedis-welcome__card-title">{link.title}</span>
            <span className="lovedis-welcome__card-hint">{link.hint}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

export default BeforeDashboard
