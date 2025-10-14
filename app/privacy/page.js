import Link from "next/link";
import "../legal/legal.css";

export const metadata = {
  title: "Application Privacy Policy",
  description:
    "Learn how Application collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <main className="legal-container">
        <div className="legal-header">
          <h1>Application Privacy Policy</h1>
          <p className="legal-updated">Last updated: July 1, 2024</p>
          <p>
            This Privacy Policy explains how Application ("we", "us", or "our")
            collects, uses, and safeguards your information when you use the
            Rolodex tools and related services.
          </p>
        </div>

        <section className="legal-section">
          <h2>Information We Collect</h2>
          <p>We collect information in the following ways:</p>
          <ul>
            <li>
              <strong>Account information</strong> provided when you sign in with
              a connected email provider.
            </li>
            <li>
              <strong>Contact records</strong> that you choose to sync or import
              into the Rolodex workspace.
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
            <li>Provide and maintain the Rolodex experience.</li>
            <li>Generate outreach drafts and deliver requested communications.</li>
            <li>Improve reliability, security, and support.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We only share data with
            service providers who help operate the platform (for example,
            authentication or email delivery partners) and only when necessary to
            provide the requested services.
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
              Contact us at <a href="mailto:support@example.com">support@example.com</a> to
              access, correct, or delete your information.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, contact us at{" "}
            <a href="mailto:privacy@example.com">privacy@example.com</a>.
          </p>
        </section>

        <Link href="/rolodex" className="legal-back-link">
          ← Back to Rolodex
        </Link>
      </main>
    </div>
  );
}
