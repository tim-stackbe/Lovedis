"use client";

import { useEffect, useRef, useState } from "react";
import { OdieOverlay } from "@/components/easter-eggs/OdieOverlay";

type Egg = {
  badge: string;
  title: string;
  subtitle: string;
};

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const SECRET_WORD = "odie";
const LOGO_STREAK = 7;
const LOGO_WINDOW_MS = 2500;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Mounted once in the root layout. Hosts four globally-triggered Odie eggs:
 * the Konami code, a logo click-streak, a typed secret word, and a styled
 * console greeting. (The fifth egg is the hidden /odie route.)
 */
export function OdieEggs() {
  const [egg, setEgg] = useState<Egg | null>(null);

  // Use a ref for the latest "is an egg showing" flag so listeners stay stable.
  const activeRef = useRef(false);
  useEffect(() => {
    activeRef.current = egg !== null;
  }, [egg]);

  const konamiPos = useRef(0);
  const typedBuffer = useRef("");
  const logoClicks = useRef<number[]>([]);

  // --- Console greeting (egg #4) -----------------------------------------
  useEffect(() => {
    const url = `${window.location.origin}/odie.png`;
    console.log(
      "%c🐾 Woof! You found Odie — the Lovedis office dog. %c\nGood human. Try the Konami code, type \"odie\", click the logo 7×, or visit /odie.\nHere's a treat: " +
        url,
      "background:#2926e5;color:#fff;font-weight:800;padding:6px 10px;border-radius:8px;font-size:13px;",
      "color:#6b6b7b;font-size:12px;"
    );
  }, []);

  // --- Keyboard triggers: Konami code (#1) + typed word (#5) --------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeRef.current) return;

      // Konami code — works anywhere, even while focused in a field.
      const expected = KONAMI[konamiPos.current];
      if (e.key.toLowerCase() === expected.toLowerCase()) {
        konamiPos.current += 1;
        if (konamiPos.current === KONAMI.length) {
          konamiPos.current = 0;
          setEgg({
            badge: "Cheat-Code akzeptiert",
            title: "↑↑↓↓←→←→ B A",
            subtitle: "30 Extra-Leben gibt's nicht, aber dafür Odie. 🎮",
          });
          return;
        }
      } else {
        // Reset, but allow the wrong key to start a fresh sequence.
        konamiPos.current =
          e.key.toLowerCase() === KONAMI[0].toLowerCase() ? 1 : 0;
      }

      // Typed secret word — ignore when typing into a field.
      if (!isTypingTarget(e.target) && /^[a-zA-Z]$/.test(e.key)) {
        typedBuffer.current = (typedBuffer.current + e.key.toLowerCase()).slice(
          -SECRET_WORD.length
        );
        if (typedBuffer.current === SECRET_WORD) {
          typedBuffer.current = "";
          setEgg({
            badge: "Geheimwort",
            title: "Hat da jemand meinen Namen gesagt?",
            subtitle: "Odie hört aufs Wort. 🐶",
          });
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // --- Logo click-streak (#2) --------------------------------------------
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (activeRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-lv-logo]")) return;

      const now = Date.now();
      logoClicks.current = [
        ...logoClicks.current.filter((t) => now - t < LOGO_WINDOW_MS),
        now,
      ];
      if (logoClicks.current.length >= LOGO_STREAK) {
        logoClicks.current = [];
        setEgg({
          badge: "Logo-Streak",
          title: "Okay okay, ich bin wach! 🐕",
          subtitle: `${LOGO_STREAK}× geklickt — Odie wedelt zurück.`,
        });
      }
    };

    // Capture phase so we still count even though the logo is a navigation link.
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  if (!egg) return null;

  return (
    <OdieOverlay
      badge={egg.badge}
      title={egg.title}
      subtitle={egg.subtitle}
      onClose={() => setEgg(null)}
    />
  );
}
