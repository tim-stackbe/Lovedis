import { MarketingTabs } from "@/components/marketing/MarketingTabs";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const inReview = await prisma.contentItem.count({ where: { status: "IN_REVIEW" } });

  return (
    <>
      <MarketingTabs badges={{ "/marketing/redaktionsplan": inReview }} />
      {children}
    </>
  );
}
