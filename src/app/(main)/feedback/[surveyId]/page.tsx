import { ArrowLeft, MessageSquareHeart } from "lucide-react";
import type { Metadata } from "next";
import { FeedbackForm } from "@/components/insights/FundingForms";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { requireStartup } from "@/lib/auth-guards";
import { surveysForStartup } from "@/lib/insights/funding-data";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Feedback" };

export default async function FeedbackPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const session = await requireStartup();
  const { surveyId } = await params;
  const startup = await prisma.startup.findUnique({
    where: { ownerUserId: session.user.id },
    select: { id: true },
  });
  const survey = startup ? (await surveysForStartup(startup.id)).find((s) => s.id === surveyId) : undefined;
  const answer =
    startup && survey
      ? await prisma.feedbackResponse.findUnique({
          where: { surveyId_startupId: { surveyId, startupId: startup.id } },
          select: { recommend: true, overall: true, goodText: true, improveText: true },
        })
      : null;

  return (
    <>
      <HeroBanner
        kicker="Feedback"
        title={survey?.title ?? "Feedback-Umfrage"}
        subtitle={
          survey
            ? `Dein Feedback zu „${survey.scopeName}“ hilft uns, das Programm zu verbessern, und fließt zusammengefasst in unseren Bericht an die Förderer ein. Dauert etwa zwei Minuten.`
            : undefined
        }
        actions={
          <LinkButton href="/dashboard/startup" variant="white">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </LinkButton>
        }
      />
      {!survey ? (
        <EmptyState
          icon={MessageSquareHeart}
          title="Umfrage nicht verfügbar"
          description="Diese Umfrage gibt es nicht oder sie gilt für ein Programm, an dem dein Startup nicht teilnimmt."
        />
      ) : !survey.open ? (
        <EmptyState
          icon={MessageSquareHeart}
          title="Umfrage geschlossen"
          description={
            answer ? "Danke, deine Antwort ist gespeichert." : "Diese Umfrage nimmt keine Antworten mehr an."
          }
        />
      ) : (
        <FeedbackForm
          key={answer ? `${answer.recommend}:${answer.overall}` : "new"}
          surveyId={surveyId}
          programName={`„${survey.scopeName}“`}
          answer={answer}
        />
      )}
    </>
  );
}
