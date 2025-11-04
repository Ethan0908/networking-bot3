import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Linkmation | Automate and manage your links",
  description:
    "Linkmation helps you organize, automate, and track links with verified Google data practices and a streamlined dashboard.",
};

const features = [
  {
    title: "Automated Link Management",
    description:
      "Create, edit, and organize every link from one dashboard with workflows that update in real time.",
  },
  {
    title: "Real-Time Analytics",
    description:
      "Monitor clicks, engagement, and traffic sources across every platform at a glance.",
  },
  {
    title: "Smart Integrations",
    description:
      "Connect Linkmation to the tools you already rely on—scheduling updates takes seconds.",
  },
  {
    title: "Privacy First",
    description:
      "We only collect the data required to deliver automations and protect your account.",
  },
];

const howItWorks = [
  {
    title: "Sign in with Google",
    description: "Verify your account securely to sync existing links instantly.",
  },
  {
    title: "Set up automations",
    description: "Build link workflows that update, tag, and route traffic without manual work.",
  },
  {
    title: "Track performance",
    description: "Review analytics and tune campaigns using clear, actionable insights.",
  },
];

export default function HomePage() {
  return (
    <>
      <header className="lm-header">
        <nav className="lm-nav" aria-label="Main">
          <Link href="/" className="lm-logo" aria-label="Linkmation home">
            <Image
  src="/app-logo.svg"
  alt="Linkmation"
  width={28}
  height={28}
  priority
  className="lm-logo-icon"
/>
            <span className="lm-logo-wordmark">Linkmation</span>
          </Link>
          <ul className="lm-nav-links">
            <li>
              <a href="#hero">Home</a>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#how-it-works">How it Works</a>
            </li>
            <li>
              <a href="https://linkmation.me/privacy" target="_blank" rel="noreferrer">
                Privacy
              </a>
            </li>
            <li>
              <a href="https://linkmation.me/terms" target="_blank" rel="noreferrer">
                Terms
              </a>
            </li>
          </ul>
          <Link className="lm-nav-cta" href="/rolodex">
            Get Started
          </Link>
        </nav>
      </header>

      <main className="lm-main">
        <section id="hero" className="lm-hero" aria-labelledby="hero-title">
          <div className="lm-hero-copy">
            <h1 id="hero-title">Automate and manage your links with ease.</h1>
            <p>
              Linkmation helps you organize, automate, and track all your links from one intuitive dashboard so you can launch
              campaigns faster, automate your emailing and networking, and stay confident in your analytics.
            </p>
            <div className="lm-hero-actions">
              <Link className="lm-button lm-button-primary" href="/rolodex">
                Try Linkmation Free
              </Link>
              <a className="lm-button lm-button-outline" href="#features">
                Learn More
              </a>
            </div>
            <ul className="lm-hero-highlights">
              <li>Unified dashboard for every link you manage</li>
              <li>Analytics that update in real time</li>
              <li>Automations that keep your workflows current</li>
            </ul>
          </div>
          <div className="lm-hero-visual" role="img" aria-label="Linkmation dashboard preview with analytics and automations">
            <div className="lm-hero-card">
              <header>
                <span className="lm-hero-card-title">Campaign Overview</span>
                <span className="lm-hero-status">Live</span>
              </header>
              <dl>
                <div>
                  <dt>Active Links</dt>
                  <dd>128</dd>
                </div>
                <div>
                  <dt>24h Clicks</dt>
                  <dd>14,502</dd>
                </div>
                <div>
                  <dt>Automation Runs</dt>
                  <dd>342</dd>
                </div>
              </dl>
              <footer>
                <p>Next workflow triggers in 2 minutes</p>
              </footer>
            </div>
          </div>
        </section>

        <section id="features" className="lm-section" aria-labelledby="features-title">
          <div className="lm-section-heading">
            <h2 id="features-title">Built for high-performing link teams</h2>
            <p>Everything you need to automate, monitor, and optimize your links without lifting a finger.</p>
          </div>
          <div className="lm-card-grid">
            {features.map((feature) => (
              <article key={feature.title} className="lm-card" aria-label={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="privacy" className="lm-section lm-privacy" aria-labelledby="privacy-title">
          <div className="lm-section-heading">
            <h2 id="privacy-title">Data transparency you can trust</h2>
            <p>
              Linkmation uses Google user data only to identify your account, sync your links, and keep automations running
              smoothly. We never sell or share your information.
            </p>
          </div>
          <div className="lm-privacy-details">
            <p>
              Your Google profile (name and email) establishes your workspace. When you connect Google Drive or Sheets, we only
              read the files you select for import. Linkmation does not store message content—just the metadata required to make
              your links work. Disconnect access or delete your data whenever you choose.
            </p>
            <a className="lm-inline-link" href="https://linkmation.me/privacy" target="_blank" rel="noreferrer">
              View our Privacy Policy
            </a>
          </div>
        </section>

        <section id="how-it-works" className="lm-section" aria-labelledby="how-title">
          <div className="lm-section-heading">
            <h2 id="how-title">How it works</h2>
            <p>Three simple steps to automate your links and monitor performance like a pro.</p>
          </div>
          <ol className="lm-steps">
            {howItWorks.map((step, index) => (
              <li key={step.title}>
                <div className="lm-step-index" aria-hidden="true">
                  {index + 1}
                </div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="lm-section" aria-labelledby="testimonial-title">
          <div className="lm-section-heading">
            <h2 id="testimonial-title">Loved by teams that ship fast</h2>
            <p>Hear from early adopters using Linkmation to power client campaigns.</p>
          </div>
          <figure className="lm-testimonial">
            <blockquote>
              “Linkmation saved us hours every week managing client links. Automations keep everything current while analytics
              show exactly where to optimize.”
            </blockquote>
            <figcaption>
              — Beta user, Toronto
            </figcaption>
          </figure>
        </section>
      </main>

      <footer className="lm-footer">
        <div className="lm-footer-inner">
          <Link href="/" className="lm-logo" aria-label="Linkmation home">
            <Image
              src="/linkmation-logo.svg"
              alt=""
              width={40}
              height={40}
              className="lm-logo-icon"
            />
            <span className="lm-logo-wordmark">Linkmation</span>
          </Link>
          <div className="lm-footer-links">
            <a href="https://linkmation.me/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            <a href="https://linkmation.me/terms" target="_blank" rel="noreferrer">
              Terms of Service
            </a>
            <a href="mailto:support@linkmation.me">support@linkmation.me</a>
          </div>
          <p className="lm-footer-copy">© 2025 Linkmation. All rights reserved. Proudly built in Canada.</p>
        </div>
      </footer>
    </>
  );
}
