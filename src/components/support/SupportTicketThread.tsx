import { cn, formatDate } from "@/lib/utils";

export type SupportThreadMessage = {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: Date;
  author: { name: string | null };
};

export function SupportTicketThread({
  messages,
}: {
  messages: SupportThreadMessage[];
}) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "rounded-card border p-4",
            message.isStaff
              ? "border-lv-blue/20 bg-lv-blue-soft/40"
              : "border-lv-border bg-white"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              {message.isStaff
                ? "LOVEDIS-Team"
                : (message.author.name ?? "Du")}
            </p>
            <p className="text-xs text-lv-secondary">
              {formatDate(message.createdAt)}
            </p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-lv-text">
            {message.body}
          </p>
        </div>
      ))}
    </div>
  );
}
