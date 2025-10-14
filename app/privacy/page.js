import Link from "next/link";
import "../legal/legal.css";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <main className="legal-container">
        <div className="legal-header">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: October 10, 2025</p>
          <p>
            This Privacy Policy explains how we ("we", "us", or "our") collect,
            use, and safeguard your information when you use our outreach tools
            and related services.
          </p>
        </div>

        <section className="legal-section">
          <h2>Information We Collect</h2>
          <p>We collect information in the following ways:</p>
          <ul>
            <li>
              <strong>Account information</strong> provided when you sign in
              with a connected email provider.
            </li>
            <li>
              <strong>Contact records</strong> that you choose to sync or import
              into your workspace.
            </li>
            <li>
              <strong>Usage data</strong> that helps us understand how features
              are performing so we can improve the experience.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>How We Use Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain the service.</li>
            <li>
              Generate outreach drafts and deliver requested communications.
            </li>
            <li>Improve reliability, security, and support.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We only share data with
            service providers who help operate the platform (for example,
            authentication or email delivery partners) and only when necessary
            to provide the requested services.
          </p>
        </section>

        <section className="legal-section">
          <h2>Data Retention</h2>
          <p>
            We retain personal information only for as long as needed to provide
            the service and to comply with legal obligations. You can request
            deletion of your data at any time by contacting support.
          </p>
        </section>

        <section className="legal-section">
          <h2>Your Choices</h2>
          <ul>
            <li>Update or delete saved templates and contact records.</li>
            <li>Disconnect connected email accounts at any time.</li>
            <li>
              Contact us at{" "}
              <a href="mailto:ethanyubowang@gmail.com">
                ethanyubowang@gmail.com
              </a>{" "}
              to access, correct, or delete your information.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, contact us at{" "}
            <a href="mailto:ethanyubowang@gmail.com">ethanyubowang@gmail.com</a>
            .
          </p>
        </section>

        <Link href="/rolodex" className="legal-back-link">
          ← Back to the workspace
        </Link>
      </main>
    </div>
  );
}
