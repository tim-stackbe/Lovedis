-- Alpha cleanup for Hetzner: remove real partners/startups, keep QA test + admins.
-- Idempotent-ish: safe to re-run (deletes already-gone rows).
BEGIN;

-- Dependent content (all demo/matrix data).
DELETE FROM "MarketplaceBooking";
DELETE FROM "CreditTransaction";
DELETE FROM "CreditAccount";
DELETE FROM "Program";
DELETE FROM "MentorProfile";
DELETE FROM "SupportOffering";
DELETE FROM "Message";
DELETE FROM "ConversationParticipant";
DELETE FROM "Conversation";
DELETE FROM "IntroRequest";
DELETE FROM "StartupFollow";
DELETE FROM "StartupUpdate";
DELETE FROM "SharedScoring";
DELETE FROM "Score";
DELETE FROM "Evaluation";
DELETE FROM "PoCPerformance";
DELETE FROM "ChallengeApplication";
-- Challenge rows are production content; do not delete in alpha cleanup.
DELETE FROM "CheckInReminder";
DELETE FROM "StartupPush";
DELETE FROM "PartnerStartupReview";
DELETE FROM "Engagement";
DELETE FROM "PartnerVote";
DELETE FROM "PartnerStartupMatch";
DELETE FROM "BatchPartner";
DELETE FROM "BatchStartup";
DELETE FROM "RoadmapItem";
DELETE FROM "ContentPage";
DELETE FROM "MediaAsset";
DELETE FROM "KnowledgeResource";
DELETE FROM "Contact";
DELETE FROM "Attachment";

-- Matrix partner columns except QA test partner.
DELETE FROM "PartnerCompany" WHERE name <> 'Test Partner (QA)';

-- Startups except QA test startup.
DELETE FROM "Startup" WHERE name <> 'Test Startup (QA)';

-- Partner org accounts except QA test company.
DELETE FROM "Company" WHERE name <> 'Test Partner (QA)';

-- Batches / campaigns.
DELETE FROM "ScoutingCampaign";

-- Non-QA partner/startup user accounts (none expected on Hetzner today).
DELETE FROM "User"
WHERE role IN ('BUSINESS_PARTNER', 'STARTUP')
  AND email NOT IN ('partner.test@lovedis.de', 'startup.test@lovedis.de');

COMMIT;

-- Verification
SELECT 'companies' AS what, name FROM "Company" ORDER BY name;
SELECT 'partner_cols' AS what, name FROM "PartnerCompany" ORDER BY name;
SELECT 'startups' AS what, name FROM "Startup" ORDER BY name;
SELECT 'users' AS what, email, role FROM "User" ORDER BY role, email;
