"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { emptyWorkshopRow, type WorkshopFormRow } from "@/lib/venture-store-editor";

const ICON_BUTTON =
  "inline-flex h-7 w-7 items-center justify-center rounded-button border border-lv-border text-lv-secondary transition-colors hover:bg-lv-surface hover:text-lv-blue disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Editable list of program workshops. The rows are serialized into the hidden
 * `workshops` field; the server derives `sessions` from the workshop titles.
 */
export function WorkshopEditor({ initial }: { initial: WorkshopFormRow[] }) {
  const [rows, setRows] = useState<WorkshopFormRow[]>(initial);

  const update = (index: number, patch: Partial<WorkshopFormRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) =>
    setRows((prev) => prev.filter((_, i) => i !== index));
  const move = (index: number, delta: -1 | 1) =>
    setRows((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <div className="space-y-4">
      <input type="hidden" name="workshops" value={JSON.stringify(rows)} />
      {rows.length === 0 && (
        <p className="rounded-button border border-dashed border-lv-border px-4 py-3 text-sm text-lv-secondary">
          Noch keine Workshops. Ohne Workshops zeigt die Detailseite keine
          Workshop-Liste.
        </p>
      )}
      {rows.map((row, i) => {
        const id = (field: string) => `ws-${i}-${field}`;
        return (
          <div
            key={i}
            className="space-y-4 rounded-card border border-lv-border bg-lv-surface/40 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-lv-blue">
                Workshop {i + 1}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={ICON_BUTTON}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Workshop nach oben"
                  title="Nach oben"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={ICON_BUTTON}
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label="Workshop nach unten"
                  title="Nach unten"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={ICON_BUTTON}
                  onClick={() => remove(i)}
                  aria-label="Workshop entfernen"
                  title="Entfernen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <Field label="Titel" htmlFor={id("title")}>
              <Input
                id={id("title")}
                value={row.title}
                onChange={(e) => update(i, { title: e.target.value })}
                maxLength={200}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Datum" htmlFor={id("date")}>
                <Input
                  id={id("date")}
                  type="date"
                  value={row.date}
                  onChange={(e) => update(i, { date: e.target.value })}
                />
              </Field>
              <Field label="Uhrzeit" htmlFor={id("time")}>
                <Input
                  id={id("time")}
                  type="time"
                  value={row.startTime}
                  onChange={(e) => update(i, { startTime: e.target.value })}
                />
              </Field>
              <Field label="Format" htmlFor={id("format")}>
                <Select
                  id={id("format")}
                  value={row.format}
                  onChange={(e) =>
                    update(i, { format: e.target.value as WorkshopFormRow["format"] })
                  }
                >
                  <option value="">Nicht angegeben</option>
                  <option value="ONLINE">Online</option>
                  <option value="ON_SITE">Vor Ort</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location" htmlFor={id("location")}>
                <Input
                  id={id("location")}
                  value={row.location}
                  onChange={(e) => update(i, { location: e.target.value })}
                  placeholder="z. B. Microsoft Teams oder Adresse"
                />
              </Field>
              <Field label="Location-Link" htmlFor={id("url")}>
                <Input
                  id={id("url")}
                  type="url"
                  value={row.locationUrl}
                  onChange={(e) => update(i, { locationUrl: e.target.value })}
                  placeholder="https://"
                />
              </Field>
            </div>

            <Field
              label="Beschreibung"
              htmlFor={id("desc")}
              hint="Leerzeile trennt Absätze. „### “ am Absatzanfang macht eine Zwischenüberschrift, **Text** wird fett."
            >
              <Textarea
                id={id("desc")}
                value={row.description}
                onChange={(e) => update(i, { description: e.target.value })}
                className="min-h-32"
              />
            </Field>
          </div>
        );
      })}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setRows((prev) => [...prev, emptyWorkshopRow()])}
      >
        <Plus className="h-4 w-4" />
        Workshop hinzufügen
      </Button>
    </div>
  );
}
