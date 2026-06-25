import { effectiveDate, businessName, legalEntityName, gstin, registeredOffice, serviceAreasFormatted, legalContacts } from '../legalConfig';
import {
  ContactBlock,
  LegalEntityBlock,
  MailLink,
  PolicyIntro,
  PolicyNote,
} from '../policyComponents';
import { PolicyH2, PolicyH3 } from './policyPrimitives';

export function LicenseContent() {
  return (
    <>
      <p><strong>Effective date:</strong> {effectiveDate}</p>
      <PolicyIntro>
        This page lists key registration and disclosure details for {legalEntityName}, the operator of the {businessName} platform.
      </PolicyIntro>
      <LegalEntityBlock />

      <PolicyH2>Goods and Services Tax (GST)</PolicyH2>
      <PolicyNote>
        <strong>Legal entity:</strong> {legalEntityName}
        <br />
        <strong>GSTIN:</strong> {gstin}
        <br />
        <strong>State:</strong> Telangana
        <br />
        <strong>Registered office:</strong> {registeredOffice.line1}, {registeredOffice.line2}, {registeredOffice.city}, {registeredOffice.state} {registeredOffice.pincode}, {registeredOffice.country}
      </PolicyNote>

      <PolicyH2>Service Area</PolicyH2>
      <p>
        {businessName} currently operates in <strong>{serviceAreasFormatted}</strong>. Service availability may vary by neighborhood, restaurant coverage, delivery partner availability, and operational constraints.
      </p>

      <PolicyH2>Platform Operator Disclosures</PolicyH2>
      <PolicyH3>Intermediary Role</PolicyH3>
      <p>
        {legalEntityName} provides a technology platform connecting customers, local restaurants and vendors, and delivery partners. {businessName} does not prepare food, own restaurant inventory, or employ delivery partners unless expressly stated in a separate written agreement.
      </p>
      <PolicyH3>Restaurant Partner Licenses</PolicyH3>
      <p>
        Restaurant and food business partners are responsible for maintaining their own valid <strong>FSSAI registration or license</strong>, food safety compliance, hygiene standards, labeling requirements, and any applicable local shop, trade, or municipal licenses. Vyaha may collect and review partner license details during onboarding but does not replace a partner&apos;s statutory obligations.
      </p>
      <PolicyH3>Third-Party APIs</PolicyH3>
      <p>
        {businessName} does not offer a public third-party API at this time. Platform integrations are internal and limited to authorized Vyaha apps, partners, and service providers.
      </p>

      <PolicyH2>Certifications and Registrations</PolicyH2>
      <PolicyNote>
        {legalEntityName} publishes only registrations and certifications that are valid and verifiable. At this time, the primary published statutory identifier is our <strong>GSTIN: {gstin}</strong>. Additional certifications such as ISO standards will be published on this page when obtained and applicable to Vyaha platform operations. We do not claim certifications we have not earned.
      </PolicyNote>

      <ContactBlock />

      <PolicyH2>Contact</PolicyH2>
      <p>
        Registration or legal questions: <MailLink email={legalContacts.support} />.
      </p>
    </>
  );
}
