import Link from "next/link";

export const metadata = {
  title: "LinkUp | Student Networking & Career Readiness",
  description:
    "LinkUp helps university students discover relevant professional contacts, organize their network, and send AI-personalized outreach messages.",
};

const coreFeatures = [
  {
    title: "Import every contact in minutes",
    description:
      "Pull people in from Gmail, spreadsheets, campus directories, or uploaded files. LinkUp automatically extracts names, roles, and verified email details so your list is always current.",
  },
  {
    title: "Organize connections effortlessly",
    description:
      "Clean messy data with smart deduplication, group contacts by school, industry, or priority, and keep everyone searchable in one secure workspace.",
  },
  {
    title: "AI-assisted outreach",
    description:
      "Generate tailored introductions, follow-up nudges, and thank-you notes that sound like you. Keep templates for coffee chats, internship asks, and career fairs ready to go.",
  },
  {
    title: "Conversation tracking",
    description:
      "See every message you have sent, what is awaiting a reply, and reminders for the next touchpoint so no opportunity slips by.",
  },
];

const optionalEnhancements = [
  {
    title: "Verified alumni spotlights",
    description:
      "Browse curated lists of graduates who opted in to help current students, complete with shared majors, clubs, and interests.",
  },
  {
    title: "Connection scoring",
    description:
      "Focus on the people most likely to respond with AI-powered prioritization based on mutual connections, response history, and company hiring trends.",
  },
  {
    title: "Job-network analytics",
    description:
      "Track how outreach converts to conversations, referrals, and offers so you can double down on what is working.",
  },
];

const workflowSteps = [
  {
    title: "Connect your sources",
    description:
      "Securely link Gmail or drop in spreadsheets and CSVs. Import only what you choose—nothing moves without your approval.",
  },
  {
    title: "LinkUp cleans and enriches",
    description:
      "We normalize names, roles, and companies, flag duplicates, and organize contacts into smart segments tailored to your goals.",
  },
  {
    title: "Reach out with confidence",
    description:
      "Use AI-generated summaries and email templates to craft intros, follow-ups, and thank-yous that feel authentic and timely.",
  },
  {
    title: "Manage every relationship",
    description:
      "Track replies, set reminders, and log notes so you always know where each conversation stands.",
  },
];

const dataPractices = [
  {
    title: "Gmail metadata only",
    description:
      "With your consent we read sender and recipient fields to build contact cards—never message bodies or attachments.",
  },
  {
    title: "Selective Drive imports",
    description:
      "Choose the spreadsheets or CSVs you want to upload from Drive. LinkUp ignores everything else.",
  },
  {
    title: "Your profile, your control",
    description:
      "We use your name and email to personalize the workspace. Disconnect access or delete data at any time from settings.",
  },
  {
    title: "Secure processing",
    description:
      "Data stays encrypted in transit and at rest. We follow FERPA-aligned safeguards and never sell or share your information.",
  },
];

export default function HomePage() {
  return (
    <main className="landing" aria-labelledby="landing-title">
      <section className="hero">
        <div className="hero-content">
          <p className="hero-tag">Student networking made simple</p>
          <h1 id="landing-title">Turn every campus connection into career momentum</h1>
          <p className="hero-lead">
            LinkUp is the student networking and career-readiness platform that helps you
            discover relevant professional contacts, organize your relationships, and send
            AI-personalized outreach in seconds.
          </p>
          <div className="hero-actions">
            <Link className="primary-cta" href="/rolodex">
              Get started
            </Link>
            <a className="secondary-cta" href="#how-it-works">
              See how it works
            </a>
          </div>
          <ul className="hero-highlights">
            <li>Automated contact discovery from the tools you already use</li>
            <li>Smart organization and reminders for every conversation</li>
            <li>AI-crafted introductions and follow-ups that sound like you</li>
          </ul>
        </div>
        <div className="hero-visual" role="img" aria-label="Students collaborating on networking opportunities">
          <div className="hero-visual-glow" />
          <div className="hero-card">
            <p className="hero-card-label">Today&apos;s plan</p>
            <ul>
              <li>
                <span className="hero-card-step">1</span>
                <div>
                  <p className="hero-card-title">Import coffee chat emails</p>
                  <p className="hero-card-subtitle">Highlight new contacts from Gmail</p>
                </div>
              </li>
              <li>
                <span className="hero-card-step">2</span>
                <div>
                  <p className="hero-card-title">Send alumni intros</p>
                  <p className="hero-card-subtitle">Use AI templates tailored to your major</p>
                </div>
              </li>
              <li>
                <span className="hero-card-step">3</span>
                <div>
                  <p className="hero-card-title">Track follow-ups</p>
                  <p className="hero-card-subtitle">Set reminders for next conversations</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="features-heading">
        <div className="section-header">
          <h2 id="features-heading">Everything you need to grow your network</h2>
          <p>
            LinkUp automates the busywork of outreach so you can focus on building genuine
            connections with mentors, alumni, and hiring managers.
          </p>
        </div>
        <div className="feature-grid" role="list">
          {coreFeatures.map((feature) => (
            <article className="feature-card" role="listitem" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="enhancements-heading">
        <div className="section-header">
          <h2 id="enhancements-heading">Optional boosts when you need them</h2>
          <p>Unlock advanced insights to supercharge your outreach strategy.</p>
        </div>
        <div className="feature-grid" role="list">
          {optionalEnhancements.map((feature) => (
            <article className="feature-card optional" role="listitem" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="how-it-works" aria-labelledby="workflow-heading">
        <div className="section-header">
          <h2 id="workflow-heading">How LinkUp works</h2>
          <p>
            A guided workflow keeps you organized from first introduction to final follow-up.
          </p>
        </div>
        <ol className="workflow-steps">
          {workflowSteps.map((step, index) => (
            <li key={step.title}>
              <div className="workflow-step-number">{index + 1}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section privacy" aria-labelledby="privacy-heading">
        <div className="section-header">
          <h2 id="privacy-heading">Why we ask for limited access</h2>
          <p>
            LinkUp only requests the minimum data required to keep your contacts accurate and
            your outreach personal. You stay in control at every step.
          </p>
        </div>
        <div className="privacy-grid" role="list">
          {dataPractices.map((item) => (
            <article className="privacy-card" role="listitem" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section final-cta" aria-labelledby="cta-heading">
        <div className="section-header">
          <h2 id="cta-heading">Start building your professional community today</h2>
          <p>
            Join LinkUp to discover new contacts, organize your outreach, and make every
            conversation count.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-cta" href="/rolodex">
            Explore the workspace
          </Link>
          <a className="secondary-cta" href="mailto:hello@linkup.network">
            Talk to our team
          </a>
        </div>
      </section>
    </main>
  );
}
