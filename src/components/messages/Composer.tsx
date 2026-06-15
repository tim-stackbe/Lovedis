"use client";

import { Paperclip, SendHorizontal, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { sendMessage } from "@/app/actions/messages";
import { cn } from "@/lib/utils";

export function Composer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = sendMessage.bind(null, conversationId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-t border-lv-border p-3 sm:p-4"
    >
      <div className="flex items-end gap-2 rounded-card border border-lv-border bg-white px-3 py-2 focus-within:border-lv-blue focus-within:ring-2 focus-within:ring-lv-blue/40 transition-shadow">
        <button
          type="button"
          title="Anhänge — bald verfügbar"
          disabled
          className="mb-1 rounded-button p-1.5 text-lv-secondary/70 cursor-not-allowed"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          name="body"
          rows={1}
          required
          placeholder="Nachricht schreiben…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-lv-text placeholder:text-lv-secondary/60 outline-none"
        />
        <button
          type="button"
          title="Emojis — bald verfügbar"
          disabled
          className="mb-1 rounded-button p-1.5 text-lv-secondary/70 cursor-not-allowed"
        >
          <Smile className="h-5 w-5" />
        </button>
        <button
          type="submit"
          disabled={pending}
          aria-label="Senden"
          className={cn(
            "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lv-blue text-white transition-colors hover:bg-lv-blue-dark",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
      {state?.error && (
        <p className="mt-2 px-1 text-xs font-medium text-lv-orange">
          {state.error}
        </p>
      )}
    </form>
  );
}
