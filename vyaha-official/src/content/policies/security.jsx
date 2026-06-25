import { Link } from 'react-router-dom';
import { effectiveDate, businessName, legalContacts } from '../legalConfig';
import {
  ContactBlock,
  MailLink,
  PolicyIntro,
  PolicyNote,
} from '../policyComponents';
import { PolicyH2, PolicyH3 } from './policyPrimitives';

export function SecurityContent() {
  return (
    <>
      <p><strong>Effective date:</strong> {effectiveDate}</p>
      <PolicyH2>Security at Vyaha</PolicyH2>
      <PolicyIntro>
        {businessName} works to protect customer accounts, restaurant operations, delivery activity, payments, documents, and admin tools through reasonable security practices. Security is a shared responsibility between Vyaha, our partners, payment providers, and every user of the platform.
      </PolicyIntro>
      <ContactBlock />

      <PolicyH2>1. Account Protection</PolicyH2>
      <ul>
        <li>OTP-based authentication and token-based sessions are used for platform access.</li>
        <li>Users must keep phones, devices, app sessions, and account credentials secure.</li>
        <li><strong>Never share OTPs</strong> with anyone — including people claiming to be Vyaha staff, delivery partners, restaurant staff, or support agents.</li>
        <li>Never share payment passwords, UPI PINs, card CVV values, or remote-access permissions with third parties.</li>
        <li>Use a device lock, updated operating system, and official Vyaha apps from trusted sources.</li>
        <li>Report suspected account takeover, phishing, or impersonation immediately to <MailLink email={legalContacts.security} />.</li>
      </ul>

      <PolicyH2>2. Data Protection</PolicyH2>
      <p>
        We use encrypted communication channels where appropriate, access controls, role-based authorization, secure cloud storage practices, monitoring, backups, and limited internal access based on operational need. Personal data handling is further described in our <Link to="/privacy">Privacy Policy</Link> and <Link to="/data-retention">Data Retention Policy</Link>.
      </p>
      <ul>
        <li>Sensitive partner documents and payout information are restricted to authorized processes and teams.</li>
        <li>Admin tools are protected through role-based access and must be used only for legitimate platform operations.</li>
        <li>We review access periodically and restrict permissions when no longer required.</li>
      </ul>

      <PolicyH2>3. Payments and Payouts</PolicyH2>
      <p>
        Online payments are processed through trusted payment providers. Card and UPI processing for Vyaha is handled through PCI-DSS compliant infrastructure provided by payment partners such as <strong>Razorpay</strong>. Vyaha does not store full card numbers, CVV values, UPI PINs, or other sensitive payment authentication credentials on its own servers.
      </p>
      <ul>
        <li>Bank and payout information is restricted to authorized reconciliation, fraud review, and payout workflows.</li>
        <li>COD activity, refunds, and payout records may be reviewed for fraud prevention and settlement accuracy.</li>
        <li>Report unauthorized transactions, duplicate debits, or suspicious refund requests through support promptly.</li>
      </ul>
      <p>See our <Link to="/payment-terms">Payment Terms</Link> for additional payment rules.</p>

      <PolicyH2>4. Incident Response</PolicyH2>
      <p>
        If we become aware of a security incident affecting user data or platform integrity, we investigate promptly, take containment steps, preserve relevant logs, and notify affected users or authorities where required by law. We may temporarily restrict accounts, payouts, or features while investigating credible security or fraud risks.
      </p>

      <PolicyH2>5. Responsible Disclosure Program</PolicyH2>
      <PolicyIntro>
        We welcome good-faith reports from security researchers, developers, and users who discover vulnerabilities in Vyaha services.
      </PolicyIntro>
      <PolicyH3>How to Report</PolicyH3>
      <p>
        Email <MailLink email={legalContacts.security} /> with a clear description of the issue, affected URL or app screen, steps to reproduce, impact assessment, and your contact details. Include screenshots or proof-of-concept only if they do not expose other users&apos; personal data.
      </p>
      <PolicyH3>Rules for Researchers</PolicyH3>
      <ul>
        <li>Do not exploit the vulnerability beyond what is necessary to demonstrate the issue.</li>
        <li>Do not access, modify, or exfiltrate another person&apos;s data.</li>
        <li>Do not disrupt services, launch denial-of-service attacks, or use social engineering against users or staff.</li>
        <li>Do not publicly disclose the issue before we have had a reasonable opportunity to investigate and remediate.</li>
        <li>Good-faith reports that follow these rules will not be pursued as unauthorized access.</li>
      </ul>
      <PolicyNote>
        Vyaha does not currently operate a public bug bounty program on HackerOne or similar platforms. We may use a third-party bug bounty or coordinated disclosure platform in the future if we launch a formal program. Until then, please report issues directly to <MailLink email={legalContacts.security} />.
      </PolicyNote>

      <PolicyH2>6. Reporting Steps</PolicyH2>
      <ol>
        <li>Stop using the affected account or device if you suspect compromise.</li>
        <li>Change your device lock and review active sessions where possible.</li>
        <li>Email <MailLink email={legalContacts.security} /> for security issues or <MailLink email={legalContacts.fraud} /> for fraud, impersonation, or payment misuse.</li>
        <li>Include your registered phone number or email, order ID if relevant, timestamps, screenshots, and a clear description of what happened.</li>
        <li>Do not share OTPs, passwords, or full payment credentials in your report — describe the incident instead.</li>
        <li>We aim to acknowledge credible security reports promptly and follow up with remediation or guidance where appropriate.</li>
      </ol>

      <PolicyH2>7. Contact</PolicyH2>
      <p>
        Security questions or vulnerability reports: <MailLink email={legalContacts.security} />.
        Fraud or impersonation: <MailLink email={legalContacts.fraud} />.
        General support: <MailLink email={legalContacts.support} />.
      </p>
    </>
  );
}
