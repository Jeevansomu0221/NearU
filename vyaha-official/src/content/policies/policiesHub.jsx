import { Link } from 'react-router-dom';
import { effectiveDate, businessName } from '../legalConfig';
import {
  ContactBlock,
  LegalEntityBlock,
  PolicyHubLinks,
  PolicyIntro,
  PolicyNote,
} from '../policyComponents';
import { PolicyH2, PolicyH3 } from './policyPrimitives';

export function PoliciesHubContent() {
  return (
    <>
      <p><strong>Effective date:</strong> {effectiveDate}</p>
      <PolicyIntro>
        {businessName} is a hyperlocal food ordering and delivery platform for Hyderabad. We connect customers with local restaurants and vendors at genuine menu prices, with transparent delivery fees and a low-commission model designed to support neighborhood businesses.
      </PolicyIntro>

      <PolicyH2>Our Mission</PolicyH2>
      <PolicyNote>
        Vyaha is built on a local-vendor-first approach. We prioritize affordable food access for customers, fair economics for neighborhood restaurants, and reliable earning opportunities for delivery partners in Hyderabad. We aim to keep more revenue with local kitchens, reduce unnecessary markup on listed items, and make everyday ordering practical for families and small businesses in our service area.
      </PolicyNote>

      <LegalEntityBlock />
      <ContactBlock />

      <PolicyH2>Guidelines for Customers</PolicyH2>
      <PolicyH3>Reviews and Feedback</PolicyH3>
      <ul>
        <li>Share honest, relevant feedback about your order, food quality, packaging, and delivery experience.</li>
        <li>Do not post fake, incentivized, retaliatory, or misleading reviews.</li>
        <li>Do not offer or demand money, discounts, refunds, or special treatment in exchange for ratings or review edits.</li>
        <li>Reviews should relate to the order or restaurant experience — not unrelated disputes or personal grievances.</li>
      </ul>
      <PolicyH3>Photos and Public Content</PolicyH3>
      <ul>
        <li>Upload clear, relevant photos of menu items, packaging, or order issues when reporting a problem.</li>
        <li>Do not upload stolen images, unrelated photos, offensive content, or images of people without permission.</li>
        <li>Do not post phone numbers, exact addresses, OTPs, bank details, payment credentials, identity documents, or other sensitive information in reviews, comments, or visible public fields.</li>
      </ul>
      <PolicyH3>Account and Order Conduct</PolicyH3>
      <ul>
        <li>Use accurate delivery addresses, contact details, and order instructions.</li>
        <li>Treat restaurant staff, delivery partners, and support teams with respect.</li>
        <li>Do not misuse promotions, refunds, chargebacks, or multiple accounts to obtain unfair benefits.</li>
      </ul>
      <p>
        Full content rules are in our <Link to="/community-guidelines">Community and Content Guidelines</Link>.
      </p>

      <PolicyH2>Guidelines for Restaurants and Partners</PolicyH2>
      <PolicyH3>Neutral Platform</PolicyH3>
      <p>
        Vyaha operates as a technology intermediary connecting customers, restaurants, and delivery partners. We do not prepare food, own restaurant inventory, or control day-to-day kitchen operations unless expressly stated in a separate written agreement.
      </p>
      <PolicyH3>Reviews and Ratings</PolicyH3>
      <ul>
        <li>Do not solicit fake reviews, offer incentives for positive ratings, or pressure customers to change feedback.</li>
        <li>Do not post fake customer reviews or impersonate diners.</li>
        <li>Respond to legitimate customer concerns through proper support channels rather than public harassment.</li>
      </ul>
      <PolicyH3>Food Safety and Compliance</PolicyH3>
      <ul>
        <li>Restaurant partners are responsible for maintaining valid FSSAI registration or license where required by law.</li>
        <li>Partners must comply with applicable food safety, hygiene, labeling, and local municipal requirements.</li>
        <li>Menu details, prices, allergens where applicable, and item availability must be kept accurate.</li>
      </ul>
      <p>
        See the <Link to="/partner-policy">Restaurant Partner Policy</Link> for full partner obligations.
      </p>

      <PolicyH2>Guidelines for Delivery Partners</PolicyH2>
      <ul>
        <li>Complete verification honestly and keep identity, vehicle, and bank details current.</li>
        <li>Accept jobs only when ready to pick up and deliver promptly and safely.</li>
        <li>Follow road safety rules and use customer contact information only for delivery-related communication.</li>
        <li>Do not mark orders delivered until they are actually delivered or valid drop instructions are followed.</li>
        <li>Handle cash on delivery orders honestly and reconcile collected amounts as required.</li>
        <li>Do not manipulate GPS data, delivery status, or job records for unfair earnings.</li>
      </ul>
      <p>
        See the <Link to="/delivery-policy">Delivery Partner Policy</Link> for full delivery partner rules.
      </p>

      <PolicyH2>Core Principles</PolicyH2>
      <ul>
        <li>Use accurate account, order, restaurant, payout, and delivery information.</li>
        <li>Treat customers, restaurant staff, delivery partners, and Vyaha teams with respect.</li>
        <li>Do not misuse orders, payments, promotions, ratings, documents, or app access.</li>
        <li>Share only content, images, documents, and business information you have the right to use.</li>
        <li>Report fraud, safety concerns, and security issues promptly.</li>
      </ul>

      <PolicyH2>Key Policies</PolicyH2>
      <ul className="policy-link-list">
        <li><Link to="/community-guidelines">Community and Content Guidelines</Link></li>
        <li><Link to="/terms">Terms of Service</Link></li>
        <li><Link to="/privacy">Privacy Policy</Link></li>
      </ul>

      <PolicyH2>Policy Hub</PolicyH2>
      <PolicyHubLinks />
    </>
  );
}
