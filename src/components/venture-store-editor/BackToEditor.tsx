import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EDITOR_PATH } from "@/lib/venture-store-editor";

export function BackToEditor() {
  return (
    <Link
      href={EDITOR_PATH}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-lv-secondary hover:text-lv-blue"
    >
      <ArrowLeft className="h-4 w-4" />
      Zurück zum Venture Store Editor
    </Link>
  );
}
