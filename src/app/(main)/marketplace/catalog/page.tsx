import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { EDITOR_PATH } from "@/lib/venture-store-editor";

/** The catalog is maintained in the Venture Store editor (ADMIN only). */
export default async function MarketplaceCatalogPage() {
  await requireAdmin();
  redirect(EDITOR_PATH);
}
