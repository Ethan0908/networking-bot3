import Link from "next/link";
import "../legal/legal.css";

export const metadata = {
  title: "Application Terms of Service",
  description: "Read the terms and conditions for using Application.",
};

export default function TermsOfServicePage() {
  return (
    <div className="legal-page">
      <main className="legal-container">
        <div className="legal-header">
          <h1>Application Terms of Service</h1>
          <p className="legal-updated">Last updated: July 1, 2024</p>
          <p>
            These Terms of Service ("Terms") govern your use of Application and
            the Rolodex tools. By accessing or using the service, you agree to be
            bound by these Terms.
          </p>
        </div>

        <section className="legal-section">
          <h2>Using Application</h2>
          <ul>
            <li>You must be at least 18 years old to use the service.</li>
            <li>
              You are responsible for safeguarding your account credentials and
              for all activity that occurs under your account.
            </li>
            <li>
              You agree not to misuse the service, including attempting to access
              systems or data without authorization.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Content and Communications</h2>
          <p>
            You retain ownership of the content you upload or generate. You grant
            us a license to process that content solely for providing the
            services you request, such as drafting and sending communications.
          </p>
        </section>

        <section className="legal-section">
          <h2>Third-Party Services</h2>
          <p>
            Application may integrate with third-party services (such as email
            providers). Your use of those services is governed by their
            respective terms and policies.
          </p>
        </section>

        <section className="legal-section">
          <h2>Termination</h2>
          <p>
            We may suspend or terminate access if you violate these Terms or use
            the service in a way that poses risk to others. You may stop using
            the service at any time.
          </p>
        </section>

        <section className="legal-section">
          <h2>Disclaimer</h2>
          <p>
            The service is provided "as is" without warranties of any kind. We
            do not guarantee that generated content is accurate or appropriate
            for every situation. You are responsible for reviewing all messages
            before sending.
          </p>
        </section>

        <section className="legal-section">
          <h2>Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, our total liability for any
            claims arising out of these Terms is limited to the fees (if any)
            that you paid for the service in the preceding 12 months.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Questions about these Terms can be sent to{" "}
            <a href="mailto:legal@example.com">legal@example.com</a>.
          </p>
        </section>

        <Link href="/rolodex" className="legal-back-link">
          ← Back to Rolodex
        </Link>
      </main>
    </div>
  );
}
