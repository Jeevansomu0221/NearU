import { Link } from 'react-router-dom';
import { vyahaLogos } from '../assets/logos';
import {
  businessName,
  grievanceOfficer,
  legalContacts,
  legalEntity,
  operatingCountry,
} from './legalConfig';

export const appBrands = [
  {
    id: 'customer',
    logo: vyahaLogos.customer,
    label: 'Vyaha Customer',
    alt: 'Vyaha customer app logo',
    cardClass: 'vyaha-card',
  },
  {
    id: 'partner',
    logo: vyahaLogos.partner,
    label: 'Vyaha Partner',
    alt: 'Vyaha restaurant partner app logo',
    cardClass: 'partner-card',
  },
  {
    id: 'delivery',
    logo: vyahaLogos.delivery,
    label: 'Vyaha Delivery',
    alt: 'Vyaha delivery partner app logo',
    cardClass: 'delivery-card',
  },
];

export function MailLink({ email }) {
  return <a href={`mailto:${email}`}>{email}</a>;
}

export function PolicyIntro({ children }) {
  return <p className="policy-intro">{children}</p>;
}

export function PolicyNote({ children }) {
  return <p className="policy-note">{children}</p>;
}

export function ContactBlock() {
  return (
    <div className="policy-note">
      <strong>Platform operator:</strong> {businessName} ({operatingCountry})
      <br />
      <strong>Support:</strong> <MailLink email={legalContacts.support} />
      <br />
      <strong>Privacy:</strong> <MailLink email={legalContacts.privacy} />
      <br />
      <strong>Security:</strong> <MailLink email={legalContacts.security} />
      <br />
      <strong>Fraud reports:</strong> <MailLink email={legalContacts.fraud} />
      <br />
      <strong>Grievance officer:</strong> {grievanceOfficer.name} — <MailLink email={grievanceOfficer.email} />
    </div>
  );
}

export function LegalEntityBlock() {
  return (
    <PolicyNote>
      <strong>Platform operator:</strong> {legalEntity.name} ({legalEntity.country})
      <br />
      <strong>Brand:</strong> {businessName}
      <br />
      <strong>Registered office:</strong> {legalEntity.registeredOffice}
      <br />
      <strong>Website:</strong> <a href={legalEntity.website}>{legalEntity.website}</a>
      <br />
      {businessName} operates the Vyaha customer app, restaurant partner app, delivery partner app, website, admin tools, and related APIs. Corporate registration, tax, and statutory details are shared with verified partners, payment providers, and regulators where required. For legal correspondence, write to <MailLink email={legalContacts.support} /> with the subject line Legal Notice.
    </PolicyNote>
  );
}

export function GrievanceOfficerBlock() {
  return (
    <PolicyNote>
      <strong>Grievance officer:</strong> {grievanceOfficer.name}
      <br />
      <strong>Email:</strong> <MailLink email={grievanceOfficer.email} />
      <br />
      <strong>Postal address:</strong> {grievanceOfficer.postalAddress}
      <br />
      We aim to acknowledge grievances within {grievanceOfficer.acknowledgementWindow} and respond within {grievanceOfficer.responseWindow}, subject to complexity and legal requirements.
    </PolicyNote>
  );
}

export function AppBrandGrid({ compact = false }) {
  return (
    <div className={`app-brand-grid${compact ? ' app-brand-grid--compact' : ''}`}>
      {appBrands.map((brand) => (
        <div key={brand.id} className={`app-brand-tile ${brand.cardClass}`}>
          <img src={brand.logo} alt={brand.alt} />
          <span>{brand.label}</span>
        </div>
      ))}
    </div>
  );
}

export function PolicyHubLinks() {
  return (
    <ul className="policy-link-list">
      <li><Link to="/privacy">Privacy Policy</Link></li>
      <li><Link to="/terms">Terms of Service</Link></li>
      <li><Link to="/security">Security Policy</Link></li>
      <li><Link to="/refunds">Cancellation and Refund Policy</Link></li>
      <li><Link to="/partner-policy">Restaurant Partner Policy</Link></li>
      <li><Link to="/delivery-policy">Delivery Partner Policy</Link></li>
      <li><Link to="/community-guidelines">Community and Content Guidelines</Link></li>
      <li><Link to="/acceptable-use">Acceptable Use Policy</Link></li>
      <li><Link to="/payment-terms">Payment Terms</Link></li>
      <li><Link to="/kyc-verification">KYC and Verification Terms</Link></li>
      <li><Link to="/marketing-consent">Marketing and Communications</Link></li>
      <li><Link to="/data-retention">Data Retention Policy</Link></li>
      <li><Link to="/cookie-policy">Cookie Policy</Link></li>
      <li><Link to="/delete-account">Account Deletion</Link></li>
      <li><Link to="/fraud">Report Fraud</Link></li>
    </ul>
  );
}
