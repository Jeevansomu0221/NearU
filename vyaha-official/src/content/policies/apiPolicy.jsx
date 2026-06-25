import { effectiveDate, businessName, legalEntityName, governingLaw, registeredOffice, legalContacts } from '../legalConfig';
import {
  ContactBlock,
  LegalEntityBlock,
  MailLink,
  PolicyIntro,
  PolicyNote,
} from '../policyComponents';
import { PolicyH2 } from './policyPrimitives';

const apiInquiryEmail = 'api@vyaha.com';

export function ApiPolicyContent() {
  return (
    <>
      <p><strong>Effective date:</strong> {effectiveDate}</p>
      <PolicyIntro>
        This API Policy describes the terms that would apply to authorized access to {businessName} platform data and services through application programming interfaces operated by {legalEntityName}.
      </PolicyIntro>
      <PolicyNote>
        <strong>Important:</strong> {businessName} does <strong>not</strong> currently offer public third-party API access. This policy is published for transparency and will apply if and when an authorized API program is opened. For integration inquiries, contact <MailLink email={apiInquiryEmail} /> or <MailLink email={legalContacts.support} />.
      </PolicyNote>
      <LegalEntityBlock />
      <ContactBlock />

      <PolicyH2>1. Account Creation and Access</PolicyH2>
      <p>
        API access, if offered, will require a separate application, written approval, and issuance of API credentials by {legalEntityName}. You must provide accurate legal entity details, contact information, intended use case, and technical contact details. {legalEntityName} may approve, deny, suspend, or revoke API access at its discretion.
      </p>

      <PolicyH2>2. Purpose and Permitted Use</PolicyH2>
      <p>
        API credentials may be used only for the approved purpose described in your application or agreement. Permitted uses may include displaying restaurant listings, order status for authorized partners, or other use cases expressly approved in writing. You may not use Vyaha APIs to build competing services, scrape protected data, resell raw platform data, or circumvent user consent requirements.
      </p>

      <PolicyH2>3. Grant of License</PolicyH2>
      <p>
        Subject to this policy and any separate API agreement, {legalEntityName} grants you a limited, non-exclusive, non-transferable, revocable license to access approved API endpoints solely for the authorized purpose. No ownership rights in Vyaha software, data, trademarks, or content are transferred to you.
      </p>

      <PolicyH2>4. API Usage Limits</PolicyH2>
      <ul>
        <li>Unless otherwise agreed in writing, authorized API clients will be limited to <strong>1,000 API calls per day</strong> per approved application.</li>
        <li>Rate limits, burst limits, and endpoint-specific quotas may apply and can be changed with reasonable notice.</li>
        <li>Excessive, abusive, or automated traffic that degrades platform performance may result in throttling, suspension, or termination.</li>
      </ul>

      <PolicyH2>5. Attribution and Branding</PolicyH2>
      <p>
        If your approved integration displays Vyaha-sourced data or services to end users, you must include clear <strong>&quot;Powered by Vyaha&quot;</strong> attribution and comply with Vyaha brand guidelines provided at onboarding. You may not imply endorsement, partnership, or agency status beyond what is expressly authorized in writing.
      </p>

      <PolicyH2>6. Developer Obligations</PolicyH2>
      <ul>
        <li>Keep API keys, client secrets, and access tokens confidential and secure.</li>
        <li>Do not embed credentials in public client-side code, repositories, or mobile apps where they can be extracted.</li>
        <li>Implement reasonable security controls, logging, and access restrictions in your systems.</li>
        <li>Comply with applicable data protection, consumer protection, and intermediary laws when handling user or restaurant data obtained through Vyaha.</li>
        <li>Notify {legalEntityName} promptly if credentials are compromised or if you suspect unauthorized API use.</li>
        <li>Do not cache, store, or redistribute personal data beyond what is necessary for the approved use and permitted retention period.</li>
      </ul>

      <PolicyH2>7. Confidentiality</PolicyH2>
      <p>
        Non-public API documentation, credentials, sandbox details, unpublished endpoints, and business information shared by {legalEntityName} are confidential. You must not disclose such information to third parties except to employees or contractors with a need to know and equivalent confidentiality obligations.
      </p>

      <PolicyH2>8. Data Protection and Privacy</PolicyH2>
      <p>
        Any personal data accessed through Vyaha APIs must be handled in accordance with applicable law and Vyaha&apos;s <strong>Privacy Policy</strong>. You are responsible for obtaining and documenting any user consents required for your integration. Do not use API access to collect data for unrelated marketing, profiling, or resale.
      </p>

      <PolicyH2>9. Prohibited Activities</PolicyH2>
      <ul>
        <li>Reverse engineering, decompiling, or attempting to derive source code from Vyaha systems except where permitted by law.</li>
        <li>Security testing of production APIs without prior written authorization.</li>
        <li>Circumventing authentication, rate limits, access controls, or technical restrictions.</li>
        <li>Using APIs to harass users, manipulate ratings, create fake orders, or facilitate fraud.</li>
        <li>Removing or obscuring required Vyaha attribution where applicable.</li>
      </ul>

      <PolicyH2>10. Intellectual Property</PolicyH2>
      <p>
        Vyaha trademarks, logos, software, documentation, and platform content remain the property of {legalEntityName} or its licensors. No rights are granted except as expressly stated in this policy or a separate written agreement.
      </p>

      <PolicyH2>11. Indemnity</PolicyH2>
      <p>
        To the maximum extent permitted by law, you agree to indemnify and hold harmless {legalEntityName}, its affiliates, officers, and employees from claims, losses, damages, and reasonable costs arising from your API integration, misuse of data, breach of this policy, or violation of applicable law, except to the extent caused by Vyaha&apos;s willful misconduct.
      </p>

      <PolicyH2>12. Disclaimer</PolicyH2>
      <p>
        APIs are provided on an &quot;as available&quot; basis. {legalEntityName} does not guarantee uninterrupted access, error-free operation, or continued availability of any endpoint. API fields, schemas, and behavior may change with notice where practicable.
      </p>

      <PolicyH2>13. Termination</PolicyH2>
      <p>
        {legalEntityName} may suspend or terminate API access immediately for breach of this policy, security risk, legal requirement, or business reasons. Upon termination, you must stop using credentials, delete confidential information except where retention is required by law, and remove Vyaha branding from your integration unless otherwise agreed.
      </p>

      <PolicyH2>14. Recognition of Ownership</PolicyH2>
      <p>
        {legalEntityName} owns and retains all right, title, and interest in the API, Licensed Content (as defined in any separate API agreement), Vyaha trademarks, documentation, and platform materials. You recognize that reviews, restaurant listings, and other platform content remain Vyaha or third-party property. You do not acquire ownership rights through API access except in your own independently created application code and confidential internal metrics.
      </p>

      <PolicyH2>15. Independent Parties</PolicyH2>
      <p>
        This policy does not create a partnership, joint venture, employment, franchise, or agency relationship between you and {legalEntityName}. Neither party may bind the other without prior written consent.
      </p>

      <PolicyH2>16. Limitation of Liability</PolicyH2>
      <p>
        To the maximum extent permitted by applicable law, {legalEntityName} is not liable for indirect, incidental, special, consequential, punitive, or loss-of-profit damages arising from API use, unavailability, data inaccuracies, or unauthorized access caused by your failure to secure credentials. Nothing in this policy limits rights that cannot be limited under applicable consumer protection law.
      </p>

      <PolicyH2>17. Force Majeure</PolicyH2>
      <p>
        {legalEntityName} is not responsible for API delays or failures caused by events outside reasonable control, including natural disasters, network outages, payment gateway failures, government actions, or third-party service disruptions.
      </p>

      <PolicyH2>18. Legal Compliance</PolicyH2>
      <p>
        You and {legalEntityName} will each comply with applicable laws in connection with API access and use, including data protection, consumer protection, and intermediary obligations under Indian law where applicable.
      </p>

      <PolicyH2>19. Severability and Assignment</PolicyH2>
      <p>
        If any provision is held invalid, the remaining provisions remain in effect. {legalEntityName} may assign this policy or API program rights as part of a merger, acquisition, or restructuring. You may not assign API rights without prior written consent.
      </p>

      <PolicyH2>20. Governing Law and Jurisdiction</PolicyH2>
      <p>
        This policy is governed by the {governingLaw}. Courts at {registeredOffice.city}, {registeredOffice.state} will have jurisdiction, subject to mandatory rights under applicable law.
      </p>

      <PolicyH2>21. Changes</PolicyH2>
      <p>
        We may update this policy when products, laws, or API offerings change. Updated versions will be posted on vyaha.com with a revised effective date.
      </p>

      <PolicyH2>22. Contact</PolicyH2>
      <p>
        API program inquiries: <MailLink email={apiInquiryEmail} />.
        General support: <MailLink email={legalContacts.support} />.
      </p>
    </>
  );
}
