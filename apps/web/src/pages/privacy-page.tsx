import { MarketingLegalLayout } from "@/components/marketing/marketing-legal-layout";

const effectiveDate = "September 17, 2026";

const sections = [
  {
    id: "scope",
    title: "Who this policy covers",
    intro:
      "This Privacy Policy describes how Orch (“we,” “us”) handles personal information when you use the Orch website, sign in with Google, or use our Canvas and Agency workspace services.",
    paragraphs: [
      "Orch is operated by the team behind orch.studio. This policy applies to information you give us, information we collect when you use the product, and information we receive from service providers that help us run authentication, billing, hosting, analytics, and support.",
      "If you use Google to sign in, the section “Google Sign-In data” explains what we receive from Google and what we do with it.",
    ],
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    intro: "We collect only what we need to run the service and keep your account secure.",
    bullets: [
      "Account information, such as your name, email address, profile photo URL, and internal user identifiers.",
      "Workspace content you create in Orch, including Canvas boards, Agency time and project data, files, prompts, and messages you send through the product.",
      "Usage and device information, such as IP address, browser type, pages or features used, timestamps, and approximate location derived from IP.",
      "Billing information when you subscribe to a paid plan. Payment card details are handled by our payment provider; we do not store full card numbers on our servers.",
    ],
  },
  {
    id: "google-sign-in",
    title: "Google Sign-In data",
    intro:
      "You can sign in to Orch with Google. When you do, Google shares limited account information with us so we can create or open your Orch account.",
    bullets: [
      "What we access from Google: your Google account identifier, name, email address, and profile picture URL when Google provides them for sign-in (typically through OpenID Connect profile and email scopes).",
      "How we use it: to authenticate you, create or link your Orch account, display your profile in the product, prevent fraud and abuse, and send service-related messages (such as security or billing notices).",
      "How we share it: we do not sell Google user data. We share it only with subprocessors that process data on our behalf to provide the service (for example hosting and authentication infrastructure), under contracts that limit how they may use the data.",
      "How we protect it: we use administrative, technical, and organizational safeguards, including encryption in transit (HTTPS/TLS) and access controls on production systems.",
      "Retention and deletion: we keep Google sign-in data while your account is active and as needed for security, billing, and legal compliance. When you delete your account or ask us to delete your personal information, we delete or anonymize Google-derived profile data within a reasonable period, except where we must keep limited records by law or for legitimate business needs (such as fraud prevention or completed transaction records).",
      "Limited use: we use Google user data only to provide and improve Orch features you use. We do not use Google user data for advertising, selling to data brokers, credit decisions, or building generalized machine-learning or AI models.",
      "Third-party use: we do not transfer Google user data to third parties for purposes other than providing or improving Orch. We do not allow third parties to use Google user data for advertising or to train generalized AI or ML models.",
      "Google Workspace APIs: Orch does not use Google Workspace APIs. We do not use Google user data to develop, improve, or train non-personalized or generalized AI or ML models.",
    ],
    paragraphs: [
      "Google’s own privacy policy describes how Google handles your data when you use Google Sign-In: https://policies.google.com/privacy",
      "To stop using Google with Orch, disconnect Google in your account settings where available, or contact us at legal@orch.studio to request account deletion.",
    ],
  },
  {
    id: "how-we-use-data",
    title: "How we use personal information",
    bullets: [
      "Provide, maintain, and secure the service, including authentication, team workspaces, and customer support.",
      "Process subscriptions and communicate about your account, product changes, or security issues.",
      "Understand reliability and performance, fix bugs, and improve features (using aggregated or de-identified data where possible).",
      "Meet legal obligations and enforce our Terms of Service.",
    ],
  },
  {
    id: "ai-processing",
    title: "AI features and providers",
    paragraphs: [
      "Some Orch features send prompts, files, or other workspace content to AI or infrastructure providers acting on our behalf to generate responses or run product functionality.",
      "Those providers process content under contractual limits appropriate to the service. Do not submit information you are not allowed to share, or that must never leave your organization, unless your team’s configuration supports that use.",
      "Google Sign-In data (name, email, Google account ID, profile photo) is not used to train generalized AI models and is handled as described in “Google Sign-In data” above.",
    ],
  },
  {
    id: "sharing",
    title: "When we share information",
    paragraphs: ["We do not sell your personal information for money."],
    bullets: [
      "Service providers that host the product, run authentication, process payments, deliver email, measure performance, or help with security and support.",
      "Professional advisers, regulators, or law enforcement when required by law, to protect rights and safety, or to enforce our terms.",
      "A successor organization if we are involved in a merger, acquisition, or asset sale, subject to this policy or notice to you.",
    ],
  },
  {
    id: "retention",
    title: "How long we keep data",
    paragraphs: [
      "We keep personal information for as long as your account is active and as needed to provide the service, resolve disputes, enforce agreements, and comply with law.",
      "When retention no longer serves those purposes, we delete or anonymize the data. Retention periods depend on the type of data and whether we need it for security, accounting, or operational records.",
    ],
  },
  {
    id: "rights",
    title: "Your choices and rights",
    bullets: [
      "Update profile details in Orch where the product allows it.",
      "Request access, correction, or deletion of personal information by emailing legal@orch.studio. We may need to verify your request and may decline where law or legitimate business needs apply.",
      "Opt out of non-essential marketing email using unsubscribe links when we send them.",
      "Depending on where you live, you may have additional rights (such as portability, objection, or appeal). We will honor applicable law.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use safeguards designed to protect personal information from unauthorized access, loss, misuse, or alteration.",
      "No method of transmission or storage is completely secure. Keep your credentials private and secure the devices you use to access Orch.",
    ],
  },
  {
    id: "international",
    title: "International processing",
    paragraphs: [
      "We may process and store information in countries other than where you live. When required, we use appropriate transfer mechanisms and contractual protections for cross-border processing.",
    ],
  },
  {
    id: "updates",
    title: "Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy when our product, practices, or legal requirements change. We will post the new version on this page and update the effective date above.",
      "If we make material changes to how we use Google user data, we will update this policy and take additional steps where Google or law requires notice or consent.",
      "Questions or privacy requests: legal@orch.studio",
    ],
  },
] as const;

export function PrivacyPage() {
  return (
    <MarketingLegalLayout
      title="Privacy Policy"
      description="How Orch collects, uses, shares, and protects your information—including data from Google Sign-In."
      effectiveDate={effectiveDate}
      sections={sections}
      crossLink={{ label: "Terms of Service", to: "/terms" }}
    />
  );
}
