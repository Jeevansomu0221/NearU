import { Link } from 'react-router-dom';
import { vyahaLogos } from '../assets/logos';
import { effectiveDate, businessName, legalContacts, governingLaw, registeredOffice, legalEntityName, gstin, serviceAreasFormatted } from './legalConfig';
import {
  AppBrandGrid,
  ContactBlock,
  GrievanceOfficerBlock,
  LegalEntityBlock,
  MailLink,
  PolicyHubLinks,
  PolicyIntro,
  PolicyNote,
} from './policyComponents';
import { TermsContent } from './policies/terms';
import { PrivacyContent } from './policies/privacy';
import { PoliciesHubContent } from './policies/policiesHub';
import { SecurityContent } from './policies/security';
import { LicenseContent } from './policies/license';
import { ApiPolicyContent } from './policies/apiPolicy';
import { CsrContent } from './policies/csr';

export const pageData = {
  policies: {
    title: 'Guidelines and Policies',
    content: <PoliciesHubContent />,
  },
  about: {
    title: 'About Vyaha',
    content: (
      <>
        <PolicyIntro>
          Vyaha connects nearby customers in Hyderabad with local restaurants and vendors through ordering, delivery coordination, partner operations, and admin tools.
        </PolicyIntro>
        <p>Our focus is affordable local ordering for customers, practical order management for restaurants, and reliable job handling for delivery partners — with lower platform commission than typical aggregators and genuine in-restaurant menu pricing where possible.</p>
        <h3>What Vyaha Covers</h3>
        <ul>
          <li>Customers ordering food and local essentials.</li>
          <li>Restaurant partners managing menus, orders, documents, and payouts.</li>
          <li>Delivery partners accepting jobs, updating status, and tracking earnings.</li>
          <li>Admin teams reviewing partners, assigning deliveries, and handling platform operations.</li>
        </ul>
      </>
    ),
  },
  blog: {
    title: 'Blog',
    content: (
      <>
        <PolicyIntro>Updates and practical notes from Vyaha&apos;s local delivery network.</PolicyIntro>
        <div className="blog-placeholder">
          <h3>Top Restaurants Near You</h3>
          <p>Discover local kitchens, popular dishes, and neighborhood favorites.</p>
        </div>
        <div className="blog-placeholder">
          <h3>How Local Delivery Helps Small Businesses</h3>
          <p>Faster ordering, better visibility, and stronger repeat customer relationships.</p>
        </div>
        <div className="blog-placeholder">
          <h3>Delivery Partner Safety Basics</h3>
          <p>Route safety, cash handling, and customer communication.</p>
        </div>
      </>
    ),
  },
  partner: {
    title: 'Partner With Us',
    content: (
      <>
        <PolicyIntro>Partner with Vyaha to receive online orders, manage your menu, and serve more local customers in Hyderabad.</PolicyIntro>
        <div className="app-brand-showcase">
          <img src={vyahaLogos.partner} alt="Vyaha restaurant partner app logo" />
        </div>
        <h3>Why Partner With Vyaha?</h3>
        <ul>
          <li>Online order management through the restaurant partner app.</li>
          <li>Local customer discovery in Hyderabad neighborhoods.</li>
          <li>Genuine menu pricing without unnecessary markup on listed items.</li>
          <li>Low platform commission agreed at onboarding — designed to keep more revenue with local vendors.</li>
          <li>Menu, pricing, availability, and order status controls.</li>
          <li>Delivery coordination and admin support.</li>
          <li>Transparent business information and payout support.</li>
        </ul>
        <h3>Onboarding Steps</h3>
        <ol>
          <li>Register your restaurant or shop.</li>
          <li>Submit business, owner, bank, and verification documents.</li>
          <li>Upload menu items, prices, images, and service availability.</li>
          <li>Complete verification and begin accepting orders.</li>
        </ol>
        <p>By onboarding, you agree to the <Link to="/partner-policy">Restaurant Partner Policy</Link>, <Link to="/terms">Terms of Service</Link>, and <Link to="/privacy">Privacy Policy</Link>.</p>
        <button type="button" className="cta-button">Start Partnering</button>
      </>
    ),
  },
  fraud: {
    title: 'Report Fraud',
    content: (
      <>
        <PolicyIntro>Vyaha treats fraud, impersonation, payment misuse, document misuse, and unsafe behavior seriously.</PolicyIntro>
        <h3>Reportable Issues</h3>
        <ul>
          <li>Fake delivery calls, OTP requests, account takeover attempts, or phishing messages.</li>
          <li>Unauthorized payments, suspicious refunds, chargeback abuse, or COD misuse.</li>
          <li>Fake restaurants, copied menus, false documents, or impersonated partner accounts.</li>
          <li>Delivery fraud, wrong delivery confirmation, route manipulation, or cash collection disputes.</li>
          <li>Harassment, threats, blackmail, or attempts to force a refund, rating, or benefit.</li>
        </ul>
        <h3>What To Include</h3>
        <p>Share your name, phone number, order ID if available, a clear description, screenshots, call details, payment references, and any other evidence that helps review the issue.</p>
        <h3>Contact</h3>
        <p>Email: <MailLink email={legalContacts.fraud} /></p>
      </>
    ),
  },
  support: {
    title: 'Help and Support',
    content: (
      <>
        <PolicyIntro>Vyaha support helps customers, restaurant partners, delivery partners, and internal platform users resolve account, order, payment, and delivery issues.</PolicyIntro>
        <h3>Customer Support</h3>
        <p>Contact us for order issues, payment failures, delivery delays, refund requests, account access, address updates, incorrect orders, missing items, or safety concerns.</p>
        <h3>Restaurant Partner Support</h3>
        <p>Contact us for onboarding, menu changes, document review, order management, payout questions, app issues, or account access.</p>
        <h3>Delivery Partner Support</h3>
        <p>Contact us for profile verification, available jobs, route issues, delivery status, earnings, COD questions, or app troubleshooting.</p>
        <h3>Contact</h3>
        <p>Email: <MailLink email={legalContacts.support} /></p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy Policy',
    content: <PrivacyContent />,
  },
  security: {
    title: 'Security',
    content: <SecurityContent />,
  },
  terms: {
    title: 'Terms of Service',
    content: <TermsContent />,
  },
  refunds: {
    title: 'Cancellation and Refund Policy',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          This policy explains how Vyaha reviews cancellations, refunds, payment failures, missing items, incorrect orders, delayed deliveries, food quality complaints, and delivery disputes.
        </PolicyIntro>
        <ContactBlock />
        <h3>1. Customer Cancellations</h3>
        <p>
          You may cancel before the restaurant accepts or begins preparing the order. Once preparation, packing, or delivery assignment has started, cancellation may be declined or limited to partial refund after review. Repeated last-minute cancellations may lead to account restrictions.
        </p>
        <h3>2. Restaurant or Platform Cancellations</h3>
        <p>
          Vyaha or the restaurant may cancel an order if items are unavailable, payment fails, the address is outside service range, the customer is unreachable, fraud is suspected, or delivery cannot be completed safely.
        </p>
        <h3>3. Refund Eligibility</h3>
        <ul>
          <li><strong>Generally eligible:</strong> duplicate payment, failed payment with amount debited, cancelled order before preparation, missing major items, clearly incorrect order, confirmed non-delivery, or unsafe/unusable food confirmed after review.</li>
          <li><strong>May be partially eligible:</strong> late delivery, minor item mismatch, packaging issue, spillage, or quality complaint supported by reasonable evidence.</li>
          <li><strong>Generally not eligible:</strong> wrong address entered by customer, unreachable customer, refusal to accept a valid COD order, repeated misuse, preference-based complaints without a service failure, or requests made long after delivery without valid reason.</li>
        </ul>
        <h3>4. Incorrect Orders, Missing Items, and Delays</h3>
        <p>
          Report incorrect orders, missing items, or significant delays through the app or support within a reasonable time after delivery. Vyaha may request photos, packaging images, order ID, payment reference, and delivery status before deciding the outcome.
        </p>
        <h3>5. Food Quality Complaints</h3>
        <p>
          Food quality issues are reviewed based on restaurant records, delivery timing, customer evidence, prior complaint history, and platform rules. Refunds or credits for taste or preference alone are not guaranteed.
        </p>
        <h3>6. Refund Method and Timing</h3>
        <p>
          Approved refunds are usually returned to the original payment method, Vyaha wallet, or another method permitted by Vyaha and the payment provider. Online refunds typically take 5 to 10 business days depending on bank or payment provider timelines. Wallet credits may be applied faster where supported.
        </p>
        <h3>7. COD Orders</h3>
        <p>
          For cash on delivery orders, disputes are reviewed against delivery status, amount collected, customer confirmation, delivery partner records, and restaurant records. Cash already paid may be adjusted through wallet credit or another approved method rather than cash return.
        </p>
        <h3>8. Promotions, Coupons, and Chargebacks</h3>
        <p>
          Refunds may exclude non-refundable promotional discounts unless required by law. Initiating a chargeback without contacting support first may lead to account review, reversal of benefits, or suspension pending investigation.
        </p>
        <h3>9. Evidence and Review</h3>
        <p>
          Vyaha may request photos, order IDs, payment references, delivery status, restaurant confirmation, delivery partner notes, call logs, or other evidence before deciding a refund request. Support decisions are based on available records and platform rules.
        </p>
        <h3>10. Contact</h3>
        <p>
          Refund requests: <MailLink email={legalContacts.support} /> with the order ID and details.
        </p>
      </>
    ),
  },
  community: {
    title: 'Community and Content Guidelines',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          Vyaha allows users and partners to submit names, images, menu details, reviews, support messages, delivery notes, profile details, and other content. These guidelines keep that content useful and safe.
        </PolicyIntro>
        <h3>Keep It Accurate</h3>
        <p>Share truthful order feedback, restaurant details, menu information, prices, images, addresses, and document information. Do not exaggerate, fabricate, impersonate, or mislead.</p>
        <h3>Keep It Relevant</h3>
        <p>Reviews, notes, images, and messages should relate to the order, restaurant, delivery, support issue, or platform feature being used.</p>
        <h3>Keep It Respectful</h3>
        <p>Do not post abusive, hateful, discriminatory, obscene, threatening, harassing, or sexually explicit content. Do not target people based on protected characteristics.</p>
        <h3>No Solicitation or Manipulation</h3>
        <p>Do not offer or demand money, free items, discounts, refunds, ratings, review edits, or special treatment in exchange for positive or negative content.</p>
        <h3>No Personal or Sensitive Data In Public Content</h3>
        <p>Do not post phone numbers, exact addresses, OTPs, bank details, payment credentials, identity documents, or private information in reviews, comments, or visible public fields.</p>
        <h3>Photo and Menu Guidelines</h3>
        <ul>
          <li>Use clear, relevant, non-misleading images of menu items, packaging, restaurant spaces, or order issues.</li>
          <li>Do not upload stolen images, watermarked images, unrelated photos, offensive content, or photos of people without permission.</li>
          <li>Restaurant partners must keep item names, prices, availability, taxes, allergens where applicable, and descriptions accurate.</li>
        </ul>
        <h3>Enforcement</h3>
        <p>Vyaha may remove content, restrict features, reduce visibility, suspend accounts, reject documents, or terminate access when these guidelines are violated.</p>
      </>
    ),
  },
  partnerPolicy: {
    title: 'Restaurant Partner Policy',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          This policy applies to restaurants, shops, owners, managers, and staff using Vyaha partner tools. By onboarding or continuing to use Vyaha, restaurant partners agree to this policy and the <Link to="/terms">Terms of Service</Link>.
        </PolicyIntro>
        <ContactBlock />
        <h3>1. Onboarding and Verification</h3>
        <p>
          Partners must provide accurate business, owner, address, bank, GST where applicable, FSSAI license or other required food business registration, and verification information. Vyaha may approve, reject, pause, or request updated documents at any time.
        </p>
        <h3>2. Food Safety and Legal Compliance</h3>
        <ul>
          <li>Partners must comply with applicable food safety, hygiene, labeling, and local municipal laws.</li>
          <li>Valid FSSAI registration or license must be maintained where required by law and shared with Vyaha when requested.</li>
          <li>Partners must not sell expired, unsafe, adulterated, or mislabeled food items.</li>
          <li>Allergen and ingredient disclosures must be kept accurate where provided on the menu.</li>
        </ul>
        <h3>3. Menu and Pricing</h3>
        <p>
          Partners are responsible for accurate item names, descriptions, prices, availability, packaging charges, taxes, images, preparation times, and required food or safety disclosures. Menu prices shown on Vyaha should match the partner&apos;s approved in-restaurant pricing unless a permitted campaign states otherwise.
        </p>
        <h3>4. Order Handling and Service Levels</h3>
        <ul>
          <li>Accept only orders that can be prepared and handed over properly within a reasonable time.</li>
          <li>Respond to new orders promptly and update item availability and order status without undue delay.</li>
          <li>Pack items safely and include correct items, quantities, utensils where applicable, and invoices or tax details where required.</li>
          <li>Do not substitute items without customer or platform approval where required.</li>
        </ul>
        <h3>5. Customer and Delivery Partner Conduct</h3>
        <p>
          Partners must treat customers, delivery partners, and Vyaha teams respectfully. Harassment, discrimination, threats, unsafe handover, or refusal based on improper reasons may lead to action.
        </p>
        <h3>6. Tax and Invoice Responsibility</h3>
        <p>
          Partners are responsible for applicable taxes, invoices, GST compliance, and statutory filings related to their sales, except where Vyaha expressly handles a specific tax collection role under a separate written arrangement.
        </p>
        <h3>7. Commission, Payouts, and Deductions</h3>
        <p>
          Vyaha uses a low-commission, local-vendor-first model. Commission rates, delivery fee sharing, and payout terms are agreed during onboarding or shown in partner dashboards. Rates may vary by restaurant category, order volume, and location within Hyderabad. Payouts may be adjusted for agreed commissions, taxes, refunds, cancellations, penalties, COD reconciliation, promotions, payment gateway charges, and other agreed fees. Vyaha may hold or review payouts for fraud, disputes, chargebacks, or verification issues.
        </p>
        <h3>8. Intellectual Property</h3>
        <p>
          Partners grant Vyaha a limited license to use restaurant names, logos, menu content, and images for platform listing, marketing of the restaurant on Vyaha, and order fulfillment. Partners confirm they have rights to all uploaded materials.
        </p>
        <h3>9. Restricted Items</h3>
        <p>
          Partners must not list illegal, unsafe, restricted, counterfeit, expired, or misleading items. Alcohol, tobacco, medicines, and regulated goods must not be listed unless Vyaha expressly supports them in writing and all laws are followed.
        </p>
        <h3>10. Suspension and Termination</h3>
        <p>
          Vyaha may warn, restrict, suspend, or terminate partner access for policy violations, poor service levels, repeated cancellations, fraud, document issues, food safety concerns, or legal risk. Partners may request review through <MailLink email={legalContacts.support} />.
        </p>
      </>
    ),
  },
  deliveryPolicy: {
    title: 'Delivery Partner Policy',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          This policy applies to delivery partners using Vyaha to receive, accept, and complete delivery jobs. Delivery partners use Vyaha as independent contractors, not employees, agents, or franchisees of Vyaha unless expressly agreed otherwise in writing.
        </PolicyIntro>
        <ContactBlock />
        <h3>1. Independent Contractor Status</h3>
        <p>
          Delivery partners choose when to go online, which jobs to accept where applicable, and how to perform lawful deliveries. Vyaha does not control work hours, uniforms, or employment benefits unless required by law. Partners are responsible for their own taxes, vehicle compliance, and insurance where applicable.
        </p>
        <h3>2. Verification and KYC</h3>
        <p>
          Delivery partners must provide accurate identity, phone, vehicle, bank, driving license where applicable, and other verification details. Vyaha may approve, reject, pause, or re-verify accounts. See our <Link to="/kyc-verification">KYC and Verification Terms</Link>.
        </p>
        <h3>3. Vehicle, License, and Insurance</h3>
        <ul>
          <li>Partners must use a roadworthy vehicle suitable for the assigned delivery type.</li>
          <li>A valid driving license and vehicle documents must be maintained where required by law.</li>
          <li>Partners should maintain appropriate insurance coverage for themselves and their vehicle as required by local law.</li>
        </ul>
        <h3>4. Availability and Job Acceptance</h3>
        <p>
          Delivery partners should go online only when ready to accept jobs. Once a job is accepted, it must be handled promptly unless there is a safety issue, emergency, or approved reason.
        </p>
        <h3>5. Delivery Conduct and Safety</h3>
        <ul>
          <li>Pick up the correct order and verify restaurant handover details.</li>
          <li>Follow lawful road safety practices and local traffic rules.</li>
          <li>Use customer contact information only for delivery-related communication.</li>
          <li>Do not mark orders delivered until they are actually delivered to the customer or valid drop instructions are followed.</li>
          <li>Handle COD orders honestly and reconcile collected amounts as required.</li>
        </ul>
        <h3>6. Location, GPS Tracking, and Status Updates</h3>
        <p>
          Vyaha may collect live or recent location data while a delivery partner is online, available, or handling an active job to show jobs, calculate distance, track active delivery, support safety, and investigate disputes. Turning off required permissions may limit access to delivery jobs. Location data use is further described in our <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <h3>7. Earnings, Incentives, and Payouts</h3>
        <p>
          Earnings are calculated based on current Vyaha rates, delivery fee rules, distance rules, incentives, peak pay where applicable, deductions, cancellations, COD reconciliation, and dispute outcomes. Incentive terms may change and are shown in the app or partner communications. Payouts are typically processed on a weekly or biweekly cycle after reconciliation, subject to minimum payout thresholds, bank verification, and fraud review. Vyaha may hold payouts during active investigations.
        </p>
        <h3>8. Fraud Prevention and Deactivation</h3>
        <p>
          Unsafe driving, harassment, fraud, cash misuse, repeated cancellations, route manipulation, fake delivery confirmation, document fraud, or policy violations may lead to warnings, temporary restrictions, payout holds, suspension, or termination. Partners may request review through <MailLink email={legalContacts.support} /> with supporting details.
        </p>
      </>
    ),
  },
  cookie: {
    title: 'Cookie Policy',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          Vyaha&apos;s website and web tools may use cookies, local storage, pixels, SDKs, and similar technologies to run the service, remember preferences, improve performance, and understand usage.
        </PolicyIntro>
        <ContactBlock />
        <h3>Types We May Use</h3>
        <ul>
          <li><strong>Essential:</strong> login sessions, security, routing, fraud prevention, and service availability.</li>
          <li><strong>Functional:</strong> preferences, language, location hints, and saved choices.</li>
          <li><strong>Analytics:</strong> page usage, feature engagement, errors, crashes, and performance.</li>
          <li><strong>Marketing:</strong> campaign measurement and promotional effectiveness where permitted.</li>
        </ul>
        <h3>Mobile App SDKs</h3>
        <p>
          Mobile apps may use SDKs for authentication, notifications, maps, analytics, and crash reporting. App permission controls and device settings may limit some SDK functions.
        </p>
        <h3>Your Choices</h3>
        <p>
          You can control cookies through browser settings. Blocking essential cookies may affect login, checkout, support, or partner tools. For app permissions, use device settings or in-app controls where available.
        </p>
        <h3>Contact</h3>
        <p>
          Questions: <MailLink email={legalContacts.privacy} />.
        </p>
      </>
    ),
  },
  deleteAccount: {
    title: 'Delete Your Vyaha Account',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          Vyaha users can request deletion of their account and personal data. This page applies to Vyaha Customer, Vyaha Partner, Vyaha Delivery, the Vyaha website, and related services.
        </PolicyIntro>
        <PolicyNote>
          Some records may be retained where required for legal, tax, payment, fraud prevention, safety, dispute, or regulatory reasons.
        </PolicyNote>
        <h3>How To Request Account Deletion</h3>
        <ol>
          <li>Email us from your registered phone number or email address at <MailLink email={legalContacts.privacy} />.</li>
          <li>Use the subject line: Delete My Vyaha Account.</li>
          <li>Include your full name, registered phone number, app used, and account role.</li>
          <li>If you are a restaurant or delivery partner, include your restaurant name or delivery partner profile details so we can verify ownership.</li>
        </ol>
        <h3>Account Roles</h3>
        <ul>
          <li><strong>Customer accounts:</strong> order profile, saved address, order history, support messages, and related customer data.</li>
          <li><strong>Restaurant partner accounts:</strong> business profile, menu data, verification documents, payout details, order records, and partner support data.</li>
          <li><strong>Delivery partner accounts:</strong> profile details, verification documents, vehicle details, location and job records, payout details, earnings records, and support data.</li>
        </ul>
        <h3>What We Delete</h3>
        <p>
          After verifying your request, we will delete or anonymize personal data that is no longer needed to provide services, meet legal obligations, prevent fraud, resolve disputes, or maintain necessary business records.
        </p>
        <h3>What We May Retain</h3>
        <ul>
          <li>Order, payment, refund, payout, tax, invoice, and settlement records required for business or legal compliance.</li>
          <li>Fraud prevention, safety, abuse, security, and dispute records where retention is necessary.</li>
          <li>Restaurant and delivery partner documents or records required for verification, audit, payout, or legal purposes.</li>
          <li>Backups for a limited period until they are overwritten or securely removed according to our retention practices.</li>
        </ul>
        <h3>Processing Time</h3>
        <p>
          We aim to acknowledge account deletion requests within 7 working days. Completion time may vary depending on verification, pending orders, payouts, refunds, disputes, legal requirements, or active investigations.
        </p>
        <h3>Before You Request Deletion</h3>
        <ul>
          <li>Complete or cancel active orders where possible.</li>
          <li>Resolve pending refunds, COD issues, payouts, or support tickets.</li>
          <li>Download or save any information you may need later, because account access may be removed after deletion.</li>
        </ul>
        <h3>Contact</h3>
        <p>
          Deletion requests: <MailLink email={legalContacts.privacy} />. General account help: <MailLink email={legalContacts.support} />.
        </p>
      </>
    ),
  },
  acceptableUse: {
    title: 'Acceptable Use Policy',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          This policy sets out prohibited uses of Vyaha&apos;s website, apps, APIs, admin tools, and related services.
        </PolicyIntro>
        <ContactBlock />
        <h3>Prohibited Conduct</h3>
        <ul>
          <li>Fraud, impersonation, fake orders, fake restaurants, forged documents, or payment misuse.</li>
          <li>Harassment, threats, hate speech, blackmail, unsafe conduct, or abuse of support teams.</li>
          <li>Reverse engineering, unauthorized scraping, security testing without permission, or disruption of services.</li>
          <li>Using Vyaha to sell illegal, unsafe, restricted, counterfeit, or misleading items.</li>
          <li>Manipulating ratings, promotions, payouts, delivery status, GPS data, or refund systems.</li>
          <li>Creating multiple accounts to abuse coupons, referral benefits, or new-user offers.</li>
          <li>Using bots or automated tools to place orders, capture inventory, or interfere with partner operations without authorization.</li>
        </ul>
        <h3>Account and Access Restrictions</h3>
        <p>
          Vyaha may remove content, restrict features, suspend accounts, withhold payouts, or terminate access when this policy is violated. Serious or repeated violations may be reported to payment providers, platforms, or authorities where appropriate.
        </p>
        <h3>Reporting Violations</h3>
        <p>
          Report misuse to <MailLink email={legalContacts.fraud} /> or <MailLink email={legalContacts.support} />.
        </p>
      </>
    ),
  },
  paymentTerms: {
    title: 'Payment Terms',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          These Payment Terms apply to customers, restaurant partners, and delivery partners using Vyaha payment features.
        </PolicyIntro>
        <ContactBlock />
        <h3>1. Customer Payments</h3>
        <ul>
          <li>Supported methods may include UPI, cards, net banking, wallets, COD, or other methods shown at checkout.</li>
          <li>You must pay the total shown before or at delivery, including item price, taxes, delivery fee, platform fee, packing fee, and any applicable surcharges.</li>
          <li>Payment authorization failures, bank declines, or suspected fraud may cancel or hold an order.</li>
        </ul>
        <h3>2. Online Payment Processing</h3>
        <p>
          Online payments are processed by third-party payment providers such as Razorpay. By paying online, you also agree to the payment provider&apos;s applicable terms and privacy notices.
        </p>
        <h3>3. Cash on Delivery</h3>
        <p>
          COD orders must be paid in full at delivery unless the app shows a different approved amount. Refusal to pay a valid COD order may lead to account restrictions.
        </p>
        <h3>4. Wallet Credits and Promotions</h3>
        <p>
          Vyaha may issue wallet credits, coupons, or promotional balances subject to expiry dates, usage limits, and anti-abuse rules. Credits have no cash value unless required by law and may be reversed if obtained through misuse.
        </p>
        <h3>5. Chargebacks and Payment Disputes</h3>
        <p>
          Contact Vyaha support before initiating a chargeback. Unverified chargebacks may lead to account suspension, recovery of promotional benefits, and reporting to payment partners.
        </p>
        <h3>6. Restaurant Partner Payouts</h3>
        <p>
          Restaurant payouts are processed after order completion, applicable deductions, and reconciliation. Incorrect bank details, tax document issues, or active disputes may delay payout.
        </p>
        <h3>7. Delivery Partner Payouts</h3>
        <p>
          Delivery partner payouts are processed after job completion, COD reconciliation, incentive review, and bank verification. Minimum payout thresholds may apply.
        </p>
        <h3>8. Contact</h3>
        <p>
          Payment questions: <MailLink email={legalContacts.support} />.
        </p>
      </>
    ),
  },
  kycVerification: {
    title: 'KYC and Verification Terms',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          Vyaha verifies restaurant partners and delivery partners before or during platform use to reduce fraud, protect users, and meet legal and payment requirements.
        </PolicyIntro>
        <ContactBlock />
        <h3>1. Documents We May Request</h3>
        <ul>
          <li>Identity proof such as Aadhaar, PAN, or other government ID.</li>
          <li>Business proof, GST certificate, FSSAI license, shop establishment documents, or bank proof for restaurant partners.</li>
          <li>Driving license, vehicle details, and bank proof for delivery partners.</li>
        </ul>
        <h3>2. How Verification Data Is Used</h3>
        <p>
          Verification data is used to confirm identity, enable payouts, review eligibility, prevent duplicate or fraudulent accounts, and comply with legal obligations. See our <Link to="/privacy">Privacy Policy</Link> for retention details.
        </p>
        <h3>3. Accuracy and Updates</h3>
        <p>
          You must provide genuine, current documents. Vyaha may suspend access if documents expire, appear altered, do not match account details, or create legal or payment risk.
        </p>
        <h3>4. Background and Safety Checks</h3>
        <p>
          Vyaha may use internal review, third-party verification tools, or manual checks where permitted by law. Passing verification does not guarantee continued access if later misconduct or safety issues arise.
        </p>
        <h3>5. Contact</h3>
        <p>
          Verification questions: <MailLink email={legalContacts.support} />.
        </p>
      </>
    ),
  },
  marketingConsent: {
    title: 'Marketing and Communications',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          This page explains how Vyaha sends service messages, promotional communications, and notification-based marketing.
        </PolicyIntro>
        <ContactBlock />
        <h3>1. Service Communications</h3>
        <p>
          Vyaha may send order updates, OTP messages, delivery alerts, payout notices, security warnings, policy changes, and support replies by SMS, push notification, email, or in-app message. These service communications are part of platform use and may not be fully opt-outable while an account remains active.
        </p>
        <h3>2. Promotional Communications</h3>
        <p>
          With consent or where permitted by law, Vyaha may send offers, restaurant promotions, referral updates, and campaign messages. You can opt out of promotional SMS or email through app settings where available or by emailing <MailLink email={legalContacts.privacy} /> with the subject Marketing Opt-Out.
        </p>
        <h3>3. Push Notifications</h3>
        <p>
          You can disable promotional push notifications in device or app settings. Disabling all notifications may affect order tracking and delivery alerts.
        </p>
        <h3>4. Contact</h3>
        <p>
          Marketing preference requests: <MailLink email={legalContacts.privacy} />.
        </p>
      </>
    ),
  },
  dataRetention: {
    title: 'Data Retention Policy',
    content: (
      <>
        <p><strong>Effective date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          This policy explains how long Vyaha keeps different categories of data and why some data may remain after account closure.
        </PolicyIntro>
        <ContactBlock />
        <h3>Retention Periods</h3>
        <ul>
          <li><strong>Active account profile data:</strong> kept while the account is active and for a short period after closure for operational wrap-up.</li>
          <li><strong>Order, payment, refund, and invoice records:</strong> typically retained for up to 8 years for tax, accounting, and dispute needs, unless a longer period is required by law.</li>
          <li><strong>Partner verification documents:</strong> retained while the partner account is active and for a reasonable period after termination for audit, payout, and legal purposes.</li>
          <li><strong>Delivery location and job logs:</strong> retained for operational, dispute, and safety review periods, usually up to 24 months unless needed longer for an active investigation.</li>
          <li><strong>Support tickets and fraud investigation records:</strong> retained while the issue is open and for up to 3 years after closure unless legal action requires longer retention.</li>
          <li><strong>Marketing consent records:</strong> retained while consent is active and for a reasonable period after withdrawal to prove compliance.</li>
          <li><strong>Backups:</strong> may persist for a limited rolling period before overwrite or secure deletion.</li>
        </ul>
        <h3>Deletion Requests</h3>
        <p>
          You may request deletion under our <Link to="/delete-account">Account Deletion</Link> process. Data required by law or necessary for unresolved disputes, payouts, or fraud prevention may be retained in masked or restricted form.
        </p>
        <h3>Contact</h3>
        <p>
          Retention questions: <MailLink email={legalContacts.privacy} />.
        </p>
      </>
    ),
  },
  restaurants: {
    title: 'For Restaurants',
    content: (
      <>
        <PolicyIntro>Vyaha helps restaurants and shops grow with local ordering, delivery coordination, and operational tools.</PolicyIntro>
        <div className="app-brand-showcase">
          <img src={vyahaLogos.partner} alt="Vyaha restaurant partner app logo" />
        </div>
        <h3>Benefits</h3>
        <ul>
          <li>Customer ordering through the Vyaha customer app.</li>
          <li>Partner app tools for menu, order, and status management.</li>
          <li>Delivery coordination with local delivery partners.</li>
          <li>Admin support for onboarding, verification, and issue handling.</li>
          <li>Business insights, promotions, and payout support as features become available.</li>
        </ul>
        <Link className="cta-button" to="/partner">Register Your Restaurant</Link>
      </>
    ),
  },
  apps: {
    title: 'Apps For You',
    content: (
      <>
        <PolicyIntro>Vyaha includes separate experiences for customers, restaurants, delivery partners, and administrators.</PolicyIntro>
        <AppBrandGrid />
        <h3>Customer App</h3>
        <p>Order from nearby restaurants, manage profile and address details, track orders, choose COD or supported online payments, and contact support.</p>
        <Link className="cta-button" to="/apps">View Customer App Access</Link>
        <h3>Restaurant Partner App</h3>
        <p>Manage onboarding, documents, menu items, order status, customer orders, and restaurant operations.</p>
        <Link className="cta-button" to="/restaurants">View Partner App Access</Link>
        <h3>Delivery Partner App</h3>
        <p>Complete verification, go available, view jobs, accept deliveries, update status, manage profile, and track earnings.</p>
        <Link className="cta-button" to="/delivery">View Delivery App Access</Link>
        <p style={{ marginTop: '24px' }}>
          By using any Vyaha app, you agree to the <Link to="/terms">Terms of Service</Link>, <Link to="/privacy">Privacy Policy</Link>, and role-specific policies linked in the app and on this website.
        </p>
      </>
    ),
  },
  consulting: {
    title: 'Restaurant Consulting',
    content: (
      <>
        <PolicyIntro>Vyaha can help restaurants improve online ordering readiness, delivery operations, and local customer growth.</PolicyIntro>
        <h3>Services May Include</h3>
        <ul>
          <li>Menu structure and pricing review.</li>
          <li>Digital storefront setup.</li>
          <li>Packaging and delivery readiness guidance.</li>
          <li>Order workflow and staff process recommendations.</li>
          <li>Local promotion and customer retention ideas.</li>
        </ul>
        <Link className="cta-button" to="/support">Book a Consultation</Link>
      </>
    ),
  },
  delivery: {
    title: 'For Delivery Partners',
    content: (
      <>
        <PolicyIntro>Join Vyaha as a delivery partner and earn by completing local delivery jobs in Hyderabad.</PolicyIntro>
        <div className="app-brand-showcase">
          <img src={vyahaLogos.delivery} alt="Vyaha delivery partner app logo" />
        </div>
        <h3>Benefits</h3>
        <ul>
          <li>Local delivery opportunities.</li>
          <li>Flexible availability controls.</li>
          <li>Delivery status and route support.</li>
          <li>Earnings tracking and payout support.</li>
        </ul>
        <h3>Requirements</h3>
        <ul>
          <li>Smartphone with required app permissions.</li>
          <li>Valid ID proof and phone number.</li>
          <li>Vehicle and driving license where applicable.</li>
          <li>Bank account details for payouts.</li>
          <li>Agreement to the <Link to="/delivery-policy">Delivery Partner Policy</Link>, <Link to="/kyc-verification">KYC terms</Link>, and <Link to="/terms">Terms of Service</Link>.</li>
        </ul>
        <Link className="cta-button" to="/delivery-policy">Become a Delivery Partner</Link>
      </>
    ),
  },
  license: {
    title: 'License, Registration and Certificate',
    content: <LicenseContent />,
  },
  apiPolicy: {
    title: 'API Policy',
    content: <ApiPolicyContent />,
  },
  csr: {
    title: 'Corporate Social Responsibility',
    content: <CsrContent />,
  },
};
