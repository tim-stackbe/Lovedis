"use client";

import { Check, Copy, Mail, Share2, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BrandIcon = (props: { className?: string }) => React.ReactElement;

// lucide-react dropped its brand glyphs, so the social marks are inlined as
// single-colour SVGs that inherit `currentColor`.
const LinkedinIcon: BrandIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const XIcon: BrandIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon: BrandIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsappIcon: BrandIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.359 11.943-11.893a11.821 11.821 0 00-3.416-8.413z" />
  </svg>
);

type Size = "sm" | "md";
type Variant = "secondary" | "white" | "ghost";

interface ShareChallengeButtonProps {
  /** Challenge title used for prefilled share text. */
  title: string;
  /** Absolute URL to share. If omitted, it is built from `challengeId` and the current origin. */
  url?: string;
  /** Challenge id, used to build the URL when `url` is not provided. */
  challengeId?: string;
  size?: Size;
  variant?: Variant;
  className?: string;
}

const VARIANTS: Record<Variant, string> = {
  secondary:
    "border border-lv-border text-lv-text font-medium hover:bg-lv-surface hover:border-lv-secondary/30",
  white: "bg-white text-lv-blue font-semibold shadow-sm hover:bg-lv-blue-soft",
  ghost: "text-lv-text hover:bg-lv-surface",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-button cursor-pointer whitespace-nowrap transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lv-blue/40 focus-visible:ring-offset-2";

export function ShareChallengeButton({
  title,
  url,
  challengeId,
  size = "sm",
  variant = "secondary",
  className,
}: ShareChallengeButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(url ?? "");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolveUrl = () => {
    if (url) return url;
    if (challengeId && typeof window !== "undefined") {
      return `${window.location.origin}/challenges/${challengeId}`;
    }
    return "";
  };

  // `window`/`navigator` are only available on the client, so the URL and
  // Web Share capability are resolved when the menu opens (in an event
  // handler) rather than during render or in an effect.
  const toggle = () => {
    if (!open) {
      setShareUrl(resolveUrl());
      setCanNativeShare(
        typeof navigator !== "undefined" && typeof navigator.share === "function"
      );
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const shareText = `Schau dir diese Challenge auf Lovedis an: ${title}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(title);

  const channels: {
    key: string;
    label: string;
    icon: BrandIcon;
    href: string;
  }[] = [
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: LinkedinIcon,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      key: "x",
      label: "X / Twitter",
      icon: XIcon,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: FacebookIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: WhatsappIcon,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
    {
      key: "email",
      label: "E-Mail",
      icon: (props) => <Mail {...props} />,
      href: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
    },
  ];

  const handleCopy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(shareUrl);
      ok = true;
    } catch {
      // Clipboard API can reject (insecure context, focus). Fall back to a
      // temporary textarea + execCommand, which works more broadly.
      try {
        const el = document.createElement("textarea");
        el.value = shareUrl;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        ok = document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
      setOpen(false);
    } catch {
      // User cancelled or share failed — keep menu open as fallback.
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Challenge teilen"
        className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      >
        <Share2 className="h-4 w-4" />
        Teilen
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            aria-label="Teilen-Optionen"
            className="absolute right-0 z-50 mt-2 w-60 rounded-card border border-lv-border bg-white p-2 shadow-card"
          >
            <p className="px-3 py-1.5 lv-wordmark text-[10px] text-lv-secondary">
              Challenge teilen
            </p>

            {canNativeShare && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleNativeShare}
                  className="flex w-full items-center gap-2.5 rounded-button px-3 py-2 text-sm text-lv-text hover:bg-lv-surface transition-colors focus-visible:outline-none focus-visible:bg-lv-surface"
                >
                  <Smartphone className="h-4 w-4 text-lv-blue" />
                  Über das Gerät teilen
                </button>
                <div className="my-1 h-px bg-lv-border" />
              </>
            )}

            {channels.map((c) => (
              <a
                key={c.key}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-button px-3 py-2 text-sm text-lv-text hover:bg-lv-surface transition-colors focus-visible:outline-none focus-visible:bg-lv-surface"
              >
                <c.icon className="h-4 w-4 text-lv-blue" />
                {c.label}
              </a>
            ))}

            <div className="my-1 h-px bg-lv-border" />

            <button
              type="button"
              role="menuitem"
              onClick={handleCopy}
              className="flex w-full items-center gap-2.5 rounded-button px-3 py-2 text-sm text-lv-text hover:bg-lv-surface transition-colors focus-visible:outline-none focus-visible:bg-lv-surface"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-lv-mint-deep" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-lv-blue" />
                  Link kopieren
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
