import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-guards";
import { ROLE_HOMES } from "@/lib/roles";

/**
 * `/dashboard` itself carried no page — only the per-role children
 * (`/dashboard/startup`, `/dashboard/partner`, …) existed — so the bare parent
 * segment 404'd.
 *
 * That 404 was reachable straight out of a successful login: middleware turns
 * any logged-out request into `/login?callbackUrl=<path>`, and the login action
 * honours that callbackUrl verbatim. So anyone arriving on `/dashboard` (typed,
 * bookmarked, shared link) signed in fine — session issued, `lastLoginAt`
 * stamped — and was then dropped on "This page could not be found".
 *
 * Resolving the segment to the caller's role home makes `/dashboard` a stable,
 * role-agnostic entry point instead of a dead end.
 */
export default async function DashboardIndex() {
  const session = await requireAuth();
  redirect(ROLE_HOMES[session.user.role]);
}
