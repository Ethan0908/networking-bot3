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
            This Privacy Policy explains how we (&quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;) collect, use, and safeguard your information when you use our
            outreach tools and related services.
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
            authentication, hosting, analytics, or email delivery partners) and
            only when necessary to provide the requested services. These partners
            are bound by confidentiality and data protection commitments.
          </p>
        </section>

        <section className="legal-section">
          <h2>Data Security</h2>
          <ul>
            <li>
              <strong>Encryption in transit and at rest:</strong> All network
              traffic uses HTTPS/TLS. Sensitive data (including tokens) is stored
              using encryption.
            </li>
            <li>
              <strong>Access controls:</strong> Role-based, least-privilege access
              for authorised staff only; access is logged and reviewed.
            </li>
            <li>
              <strong>Secure development:</strong> Regular security reviews,
              dependency updates, and monitoring to protect against unauthorised
              access, alteration, disclosure, or destruction.
            </li>
            <li>
              <strong>Incident response:</strong> If we become aware of a breach,
              we investigate, mitigate, and notify affected users and/or
              authorities when required by law.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>How We Protect Google User Data</h2>
          <ul>
            <li>
              Google user data accessed via OAuth is used only to provide or
              improve the app’s features requested by you.
            </li>
            <li>
              We do not sell Google user data and do not share it with third
              parties except our service providers as needed to operate the app.
            </li>
            <li>
              OAuth tokens and related credentials are stored securely with
              encryption and are accessible only to systems and staff that need
              them.
            </li>
            <li>
              We request the minimum necessary scopes and limit retention to the
              period needed to provide the service (see Data Retention below).
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Data Retention</h2>
          <p>
            We retain personal information only for as long as needed to provide
            the service and to comply with legal obligations. You can request
            deletion of your data at any time by contacting support. Upon
            deletion, associated OAuth tokens are revoked and data is removed or
            anonymised within a reasonable time.
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
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the
            updated version here and update the &quot;Last updated&quot; date. If changes
            materially affect how we use your data, we will provide additional
            notice in-product or by email.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, contact us at{" "}
            <a href="mailto:ethanyubowang@gmail.com">ethanyubowang@gmail.com</a>.
          </p>
        </section>

        <Link href="/rolodex" className="legal-back-link">
          ← Back to the workspace
        </Link>
      </main>
    </div>
  );
}