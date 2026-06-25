import { Link } from 'react-router-dom';
import {
  businessName,
  effectiveDate,
  legalContacts,
  legalEntityName,
  operatingCountry,
  privacyEmail,
  serviceAreasFormatted,
  websiteUrl,
} from '../legalConfig';
import {
  ContactBlock,
  GrievanceOfficerBlock,
  LegalEntityBlock,
  MailLink,
  PolicyIntro,
  PolicyNote,
} from '../policyComponents';
import { PolicyH2, PolicyH3 } from './policyPrimitives';

export function PrivacyContent() {
  return (
    <>
      <p>
        <strong>Effective date:</strong> {effectiveDate}
      </p>

      <PolicyIntro>
        This Privacy Policy (&quot;Policy&quot;) describes how {legalEntityName} (&quot;Vyaha,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, stores, shares, transfers, and protects personal data and other information when you access or use the Vyaha website at{' '}
        <a href={websiteUrl}>{websiteUrl}</a>, the Vyaha customer mobile application, the Vyaha restaurant partner mobile application, the Vyaha delivery partner mobile application, internal admin and operations tools, application programming interfaces, customer support channels, and any related products, features, or services that link to this Policy (collectively, the &quot;Platform&quot;).
      </PolicyIntro>

      <PolicyNote>
        <strong>Your consent:</strong> By creating an account, placing an order, onboarding as a restaurant partner or delivery partner, using admin tools with authorization, or otherwise accessing or using the Platform, you acknowledge that you have read and understood this Policy and consent to the collection, use, disclosure, and processing of your information as described here, subject to applicable law. If you do not agree with this Policy, please do not use the Platform.
      </PolicyNote>

      <LegalEntityBlock />
      <ContactBlock />

      <PolicyH2>1. Applicability and Scope</PolicyH2>

      <PolicyH3>1.1 Who This Policy Applies To</PolicyH3>
      <p>
        This Policy applies to all individuals and entities whose personal data or information is processed through the Platform, including but not limited to:
      </p>
      <ul>
        <li>
          <strong>Customers</strong> who browse restaurants, place food orders, save delivery addresses, make payments, receive deliveries, contact support, submit ratings or reviews, or otherwise use the Vyaha customer app or website in Hyderabad and surrounding service areas covered by Vyaha.
        </li>
        <li>
          <strong>Restaurant partners</strong> (merchants), including owners, authorized managers, staff, and representatives who register businesses, upload menus, manage orders, receive payouts, submit verification documents, and interact with Vyaha partner tools.
        </li>
        <li>
          <strong>Delivery partners</strong> who register for delivery jobs, complete identity and vehicle verification, go online to receive assignments, navigate to restaurants and customers, update delivery status, collect cash on delivery where applicable, and receive earnings payouts.
        </li>
        <li>
          <strong>Admin and operations users</strong> who are authorized by Vyaha to access internal dashboards, review partner onboarding, assign or monitor deliveries, investigate fraud or safety issues, manage support tickets, and perform platform administration.
        </li>
        <li>
          <strong>Website visitors</strong> who browse public pages, policy pages, partner registration flows, or support content without creating a full account.
        </li>
        <li>
          <strong>Individuals who contact Vyaha</strong> by email, phone, in-app chat, support forms, grievance channels, fraud reporting, or other communication methods.
        </li>
      </ul>

      <PolicyH3>1.2 What This Policy Covers</PolicyH3>
      <p>
        This Policy covers personal data and related information that Vyaha processes in connection with hyperlocal food ordering, restaurant partner operations, delivery coordination, payments, customer support, fraud prevention, analytics, marketing where permitted, and compliance with legal obligations. It does not govern the independent privacy practices of restaurants, delivery partners, payment gateways, map providers, cloud vendors, or other third parties, except where Vyaha processes data on their behalf or shares data with them as described below.
      </p>

      <PolicyH3>1.3 Legal Framework</PolicyH3>
      <p>
        Vyaha processes personal data in accordance with applicable laws in India, including the Digital Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;), the Information Technology Act, 2000 (&quot;IT Act&quot;), and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (&quot;SPDI Rules&quot;), where applicable. Where Vyaha acts as a data fiduciary under the DPDP Act, this Policy describes our obligations and your rights. Where Vyaha acts as an intermediary under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, certain content and account-related processes may also be governed by those rules and our Terms of Service.
      </p>

      <PolicyH3>1.4 Relationship With Other Policies</PolicyH3>
      <p>
        This Policy should be read together with our <Link to="/terms">Terms of Service</Link>, <Link to="/cookie-policy">Cookie Policy</Link>, <Link to="/security">Security Policy</Link>, <Link to="/data-retention">Data Retention Policy</Link>, <Link to="/payment-terms">Payment Terms</Link>, <Link to="/partner-policy">Restaurant Partner Policy</Link>, <Link to="/delivery-policy">Delivery Partner Policy</Link>, <Link to="/kyc-verification">KYC and Verification Terms</Link>, <Link to="/marketing-consent">Marketing and Communications</Link>, and <Link to="/delete-account">Account Deletion</Link> page. If there is a conflict between this Policy and a role-specific policy on a privacy matter, this Policy will generally control unless the role-specific policy provides greater protection or applicable law requires otherwise.
      </p>

      <PolicyH2>2. Categories of Information We Collect</PolicyH2>

      <p>
        The information we collect depends on how you use the Platform, your role, the permissions you grant, and the features you access. We may collect information directly from you, automatically from your device or browser, from restaurants and delivery partners involved in your order, from payment providers, from support interactions, and from authorized third-party service providers.
      </p>

      <PolicyH3>2.1 Account and Identity Information</PolicyH3>
      <ul>
        <li>Full name, display name, or business contact name.</li>
        <li>Mobile phone number used for OTP-based login, verification, and service communications.</li>
        <li>Email address, where provided.</li>
        <li>Account role (customer, restaurant partner, delivery partner, admin, or other authorized role).</li>
        <li>Account status, registration date, login timestamps, session identifiers, and authentication tokens.</li>
        <li>OTP request logs, verification status, failed login attempts, and account recovery activity.</li>
        <li>Profile photo or avatar, where uploaded.</li>
        <li>Language, notification, and in-app preference settings.</li>
      </ul>

      <PolicyH3>2.2 Customer Order and Profile Information</PolicyH3>
      <ul>
        <li>Saved and one-time delivery addresses, including apartment or flat details, landmarks, geolocation coordinates, pin codes, and address labels such as Home or Work.</li>
        <li>Cart contents, selected restaurant, menu items, quantities, customizations, special instructions, and order notes.</li>
        <li>Order history, order IDs, order status, estimated and actual delivery times, cancellation records, and refund requests.</li>
        <li>Ratings, reviews, complaint descriptions, photos uploaded in support flows, and feedback about restaurants or deliveries.</li>
        <li>Contact preferences for order-related calls or messages.</li>
        <li>Wallet balance, promotional credits, coupon usage, and referral activity where applicable.</li>
        <li>Customer support messages, call records or notes, chat transcripts, and dispute evidence.</li>
      </ul>

      <PolicyH3>2.3 Restaurant Partner and Merchant Information</PolicyH3>
      <ul>
        <li>Restaurant or shop name, brand name, cuisine or category, description, and public listing details.</li>
        <li>Business address, serviceable areas, operating hours, holiday schedules, and contact numbers.</li>
        <li>Owner, proprietor, authorized signatory, or manager name and contact details.</li>
        <li>Menu items, descriptions, prices, taxes, packaging charges, images, availability flags, and modifier options.</li>
        <li>GSTIN, PAN, FSSAI license or registration number, shop establishment details, and other business registration information where applicable.</li>
        <li>Bank account details, UPI details, beneficiary name, cancelled cheque or bank proof, and payout preferences.</li>
        <li>Identity documents, address proof, business proof, and photographs submitted during onboarding or reverification.</li>
        <li>Order acceptance records, preparation status updates, handover confirmations, cancellation reasons, and operational performance metrics.</li>
        <li>Commission, payout, settlement, invoice, refund adjustment, and tax-related records.</li>
        <li>Support tickets, compliance notices, and enforcement actions relating to the partner account.</li>
      </ul>

      <PolicyH3>2.4 Delivery Partner Information</PolicyH3>
      <ul>
        <li>Name, phone number, emergency contact where collected, and profile details.</li>
        <li>Identity proof such as Aadhaar, PAN, or other government-issued identification submitted for verification.</li>
        <li>Driving license number, expiry date, vehicle registration details, vehicle type, and vehicle photographs where applicable.</li>
        <li>Bank account or UPI details for payout processing.</li>
        <li>Online, offline, available, or busy status; shift or session activity; accepted, rejected, cancelled, or completed job records.</li>
        <li>Live, recent, or historical GPS location data while online, available, en route, or completing an active delivery, depending on app permissions and platform settings.</li>
        <li>Route information, distance travelled, delivery timestamps, proof of delivery, and customer contact attempts related to assigned jobs.</li>
        <li>Cash on delivery collection amounts, remittance records, shortfall or excess reconciliation, and earnings statements.</li>
        <li>Incentive eligibility, performance metrics, safety incidents, and policy violation records.</li>
      </ul>

      <PolicyH3>2.5 Payment and Financial Information</PolicyH3>
      <ul>
        <li>Payment method selected at checkout, such as UPI, card, net banking, wallet, or cash on delivery.</li>
        <li>Transaction IDs, payment gateway references, authorization status, failure codes, refund IDs, and settlement records processed through Razorpay or other authorized payment partners.</li>
        <li>Masked card details, card network, card type, issuing bank name, or last four digits as returned by the payment provider.</li>
        <li>Invoice amounts, taxes, delivery fees, platform fees, packing fees, tips where applicable, and promotional discounts applied.</li>
        <li>Chargeback notices, dispute records, and fraud review outcomes.</li>
      </ul>
      <p>
        <strong>Important:</strong> Vyaha does not store full card numbers, CVV values, UPI PINs, or other sensitive payment authentication credentials on its own servers. Payment card and UPI credential entry occurs on secure pages or interfaces provided by the payment gateway.
      </p>

      <PolicyH3>2.6 Device, Technical, and Usage Information</PolicyH3>
      <ul>
        <li>Device type, manufacturer, model, operating system, and operating system version.</li>
        <li>App version, build number, installation source, and crash or error reports.</li>
        <li>IP address, network type, carrier information, and approximate region derived from IP or device settings.</li>
        <li>Push notification tokens, device identifiers permitted by your platform, and advertising identifiers where applicable and allowed.</li>
        <li>Log files, session duration, screen views, button taps, search queries, feature usage, referral source, and in-app navigation patterns.</li>
        <li>Performance metrics, latency data, API response errors, and diagnostic events.</li>
      </ul>

      <PolicyH3>2.7 Location Information</PolicyH3>
      <p>
        Vyaha uses location information to enable hyperlocal discovery, address accuracy, delivery fee calculation, restaurant serviceability checks, delivery partner assignment, live order tracking, route guidance, safety monitoring, and fraud investigation. Depending on your role and permissions, location data may include:
      </p>
      <ul>
        <li>GPS coordinates from your device when you search for restaurants, confirm an address, or place an order.</li>
        <li>Map pin adjustments, geocoded address results, and saved location labels.</li>
        <li>Real-time or recent delivery partner location while online or during active deliveries.</li>
        <li>Approximate location inferred from IP address on web sessions.</li>
      </ul>
      <p>
        You may control certain location permissions through your device settings. Disabling required location permissions may limit restaurant discovery, address accuracy, delivery assignment, live tracking, or delivery partner job access.
      </p>

      <PolicyH3>2.8 Communications and Support Information</PolicyH3>
      <ul>
        <li>SMS messages, including OTP codes, order alerts, delivery updates, and promotional messages where permitted.</li>
        <li>Push notifications, in-app messages, and email communications.</li>
        <li>Recorded or logged support calls, voicemail, chat transcripts, and helpdesk ticket metadata.</li>
        <li>Content you submit in grievance, fraud, safety, or privacy requests.</li>
      </ul>

      <PolicyH3>2.9 Admin and Internal Operations Information</PolicyH3>
      <ul>
        <li>Authorized admin user identity, role, access logs, and actions taken on partner accounts, orders, payouts, or enforcement cases.</li>
        <li>Internal notes, audit trails, assignment records, and investigation documentation created by Vyaha teams.</li>
        <li>System-generated alerts relating to fraud, policy violations, payment anomalies, or service disruptions.</li>
      </ul>

      <PolicyH3>2.10 Information From Third Parties</PolicyH3>
      <p>We may receive information from:</p>
      <ul>
        <li>Payment partners such as Razorpay regarding transaction status and risk signals.</li>
        <li>Map and geolocation providers used for address lookup, routing, and distance estimation.</li>
        <li>SMS, voice, and notification delivery providers.</li>
        <li>Cloud hosting, analytics, and crash reporting providers such as Google Firebase Analytics and Firebase Crashlytics.</li>
        <li>Identity verification, OCR, or document validation tools used during partner onboarding.</li>
        <li>Restaurants and delivery partners involved in fulfilling your order.</li>
        <li>Law enforcement, regulators, courts, or dispute resolution bodies where legally required.</li>
      </ul>

      <PolicyH3>2.11 Sensitive Personal Data or Information</PolicyH3>
      <p>
        Under the SPDI Rules, certain categories such as passwords, financial information, biometric information, physical or mental health information, and sexual orientation may be treated as sensitive personal data or information. Vyaha generally does not require customers to provide health information to place a standard food order. Restaurant and delivery partner onboarding may involve government identity documents and bank details, which we protect using access controls and security measures described in this Policy and our Security Policy. We process such information only for legitimate platform purposes and legal compliance.
      </p>

      <PolicyH2>3. How We Use Your Information</PolicyH2>

      <p>We use the information described above for the following purposes, depending on your relationship with Vyaha and applicable law:</p>

      <PolicyH3>3.1 Providing and Operating the Platform</PolicyH3>
      <ul>
        <li>Create, authenticate, and manage user accounts using OTP login and secure sessions.</li>
        <li>Display nearby restaurants, menus, prices, and estimated delivery times in Hyderabad service areas.</li>
        <li>Process orders, route them to restaurant partners, assign delivery partners, and provide live status updates.</li>
        <li>Enable cash on delivery, online payments, refunds, wallet credits, and payout settlements.</li>
        <li>Facilitate communication between customers, restaurants, delivery partners, and Vyaha support teams for order fulfillment.</li>
        <li>Operate admin tools for onboarding, verification, order management, delivery assignment, and dispute resolution.</li>
      </ul>

      <PolicyH3>3.2 Verification, Trust, and Safety</PolicyH3>
      <ul>
        <li>Verify restaurant partner and delivery partner identities, licenses, bank details, and eligibility.</li>
        <li>Detect and investigate fraud, account takeover, fake orders, payment abuse, document forgery, route manipulation, and policy violations.</li>
        <li>Monitor delivery conduct, COD reconciliation, and suspicious activity patterns.</li>
        <li>Protect users, partners, and Vyaha personnel from harassment, impersonation, and unsafe behavior.</li>
        <li>Enforce our Terms of Service, partner policies, acceptable use rules, and community guidelines.</li>
      </ul>

      <PolicyH3>3.3 Customer Support and Dispute Handling</PolicyH3>
      <ul>
        <li>Respond to questions, complaints, refund requests, missing item reports, and delivery issues.</li>
        <li>Review evidence such as photos, call logs, GPS records, and payment references to resolve disputes.</li>
        <li>Contact you by phone, SMS, push notification, or email regarding your account or active orders.</li>
      </ul>

      <PolicyH3>3.4 Product Improvement and Analytics</PolicyH3>
      <ul>
        <li>Understand how users interact with our apps and website to improve usability, reliability, and performance.</li>
        <li>Measure feature adoption, conversion, order completion rates, and service quality in local neighborhoods.</li>
        <li>Diagnose crashes, bugs, and API failures using tools such as Firebase Crashlytics.</li>
        <li>Conduct internal research, testing, and product development for the Vyaha platform.</li>
      </ul>

      <PolicyH3>3.5 Marketing and Promotions</PolicyH3>
      <ul>
        <li>Send promotional offers, restaurant campaigns, referral invitations, and re-engagement messages where permitted by law and your choices.</li>
        <li>Personalize offers based on order history, location, and app activity where allowed.</li>
        <li>Measure campaign effectiveness and prevent promotional abuse.</li>
      </ul>
      <p>
        You may opt out of non-essential promotional communications by emailing <MailLink email={privacyEmail} /> with the subject line Marketing Opt-Out, or through in-app settings where available. Service-critical messages about orders, OTPs, security, payouts, and account activity may continue even if you opt out of marketing.
      </p>

      <PolicyH3>3.6 Legal, Tax, and Regulatory Compliance</PolicyH3>
      <ul>
        <li>Maintain books of account, invoices, tax records, and audit trails as required by law.</li>
        <li>Respond to lawful requests from government authorities, courts, regulators, and law enforcement.</li>
        <li>Establish, exercise, or defend legal claims.</li>
        <li>Comply with consumer protection, food business, payment, and data protection obligations applicable to our operations in India.</li>
      </ul>

      <PolicyH3>3.7 Legal Bases for Processing</PolicyH3>
      <p>
        We process personal data where necessary to perform our contract with you, comply with legal obligations, pursue legitimate interests such as fraud prevention and service improvement, or based on your consent where required by law. Where the DPDP Act applies, we rely on lawful grounds recognized under that statute, including consent, certain legitimate uses, and compliance with law. You may withdraw consent for consent-based processing without affecting the lawfulness of prior processing, subject to contractual and legal constraints.
      </p>

      <PolicyH2>4. How We Share Your Information</PolicyH2>

      <p>
        Vyaha does not sell your personal data. We share information only as needed to operate the Platform, fulfill orders, comply with law, and protect users and partners. The categories of recipients below may process data under their own privacy terms when they act as independent controllers.
      </p>

      <PolicyH3>4.1 Restaurant Partners (Merchants)</PolicyH3>
      <p>
        When you place an order, we share limited customer information with the restaurant partner responsible for preparing your food, such as your first name or display name, order items, quantities, customization instructions, allergy or delivery notes you provide, contact phone number for preparation queries, and delivery address or handover details needed to complete the order. Restaurants may also see order timestamps, payment method type, and order IDs. Restaurant partners must use this information only for order fulfillment, customer communication related to the order, and lawful business record-keeping. They must not use Vyaha-provided customer contact details for unsolicited marketing outside the scope of the order unless you have separately consented or applicable law permits.
      </p>

      <PolicyH3>4.2 Delivery Partners (Service Partners)</PolicyH3>
      <p>
        When a delivery is assigned, we share information necessary for pickup and drop-off, which may include customer name, delivery address, landmark details, contact phone number, order ID, restaurant name and address, COD amount to collect if applicable, delivery instructions, and live or recent location data needed for navigation and tracking. Delivery partners must use this information only to perform the assigned delivery, contact you for delivery-related issues, and comply with Vyaha policies. See Section 8 for additional details on service partners.
      </p>

      <PolicyH3>4.3 Payment Service Providers</PolicyH3>
      <p>
        Online payments are processed by authorized payment gateways such as Razorpay. We share transaction details required to initiate, authenticate, settle, or refund payments, including order amount, customer contact information where needed for receipts or risk checks, and device or IP metadata permitted by the payment provider. Payment partners process card, UPI, and banking data under their own security standards and regulatory obligations.
      </p>

      <PolicyH3>4.4 Cloud Infrastructure and Technology Vendors</PolicyH3>
      <p>
        We use cloud hosting, database, storage, content delivery, backup, and infrastructure providers to run the Platform. These providers may process personal data on our behalf under contractual confidentiality and security obligations. Primary data storage and processing are intended to occur in India, but some providers may process or replicate data in other countries as described in Section 10.
      </p>

      <PolicyH3>4.5 Maps, Location, and Routing Providers</PolicyH3>
      <p>
        We may share address queries, coordinates, and route-related data with map services to geocode addresses, estimate distance and delivery fees, display maps, and support navigation features in customer and delivery partner apps.
      </p>

      <PolicyH3>4.6 Communications Providers</PolicyH3>
      <p>
        We use SMS gateways, push notification services, email delivery tools, and telephony or call-management systems to send OTPs, order updates, support messages, and permitted promotional communications. These providers receive phone numbers, message content, delivery status metadata, and device tokens as needed to deliver communications.
      </p>

      <PolicyH3>4.7 Analytics, Crash Reporting, and Performance Tools</PolicyH3>
      <p>
        We use analytics and diagnostic tools, including Google Firebase Analytics and Firebase Crashlytics, to understand app usage, measure performance, and fix crashes. These tools may collect device identifiers, event logs, crash stack traces, and usage statistics. See our <Link to="/cookie-policy">Cookie Policy</Link> for more information about cookies, SDKs, and similar technologies.
      </p>

      <PolicyH3>4.8 Professional Advisors and Business Transfers</PolicyH3>
      <p>
        We may share information with lawyers, accountants, auditors, insurers, and consultants who are bound by confidentiality duties, strictly for advising Vyaha, handling disputes, or meeting compliance requirements. If Vyaha undergoes a merger, acquisition, restructuring, or sale of assets, personal data may be transferred to the successor entity subject to applicable law and notice where required.
      </p>

      <PolicyH3>4.9 Legal and Regulatory Disclosures</PolicyH3>
      <p>
        We may disclose information to law enforcement, government agencies, courts, tribunals, consumer forums, or regulators when we believe disclosure is required by law, legal process, or governmental request, or when necessary to protect the rights, property, or safety of Vyaha, our users, partners, or the public.
      </p>

      <PolicyH3>4.10 Aggregated and De-Identified Information</PolicyH3>
      <p>
        We may share aggregated or de-identified information that does not reasonably identify an individual for analytics, benchmarking, research, or business reporting.
      </p>

      <PolicyH2>5. Merchant Data Sharing and Partner Responsibilities</PolicyH2>

      <PolicyH3>5.1 Data Vyaha Shares With Restaurant Partners</PolicyH3>
      <p>
        Restaurant partners receive customer and order information strictly necessary to accept, prepare, pack, and hand over orders placed through Vyaha. This may include item-level details, customer contact information for the active order, delivery or pickup instructions, and payment method indicators such as prepaid or COD. Partners may retain order records for their own accounting, tax, and food safety obligations, but must protect customer information and use it only for lawful purposes connected to the order or their legal duties.
      </p>

      <PolicyH3>5.2 Data Restaurant Partners Provide to Vyaha</PolicyH3>
      <p>
        Restaurant partners submit business, menu, pricing, tax, license, bank, and identity information to list on the Platform and receive payouts. By onboarding, partners represent that they have the right to share this information with Vyaha and that menu images, logos, and descriptions do not infringe third-party rights. Vyaha may display certain partner information publicly on the Platform, including restaurant name, address, menu, ratings, and operating hours.
      </p>

      <PolicyH3>5.3 Partner Use Restrictions</PolicyH3>
      <p>
        Restaurant and delivery partners must not misuse Vyaha user data by selling it, using it for unrelated telemarketing, combining it with external databases for unsolicited outreach, harassing customers, or retaining it longer than necessary for order fulfillment and lawful record-keeping. Vyaha may suspend or terminate partners who misuse customer or platform data and may report serious violations to authorities where appropriate.
      </p>

      <PolicyH3>5.4 Public and Semi-Public Content</PolicyH3>
      <p>
        Restaurant listings, menu content, ratings, and reviews may be visible to other users on the Platform. Partners should avoid uploading personal data of staff or customers in public menu fields unless necessary and lawful.
      </p>

      <PolicyH2>6. Service Partners — Delivery Partners</PolicyH2>

      <p>
        Delivery partners are independent service partners who use the Vyaha delivery partner app to accept and complete delivery jobs in Hyderabad. This section explains how their data is handled and what customer data they receive.
      </p>

      <PolicyH3>6.1 Information We Collect From Delivery Partners</PolicyH3>
      <p>
        We collect the delivery partner information described in Section 2.4, including identity and vehicle documents, bank details, availability status, GPS location during online or active delivery sessions, job history, earnings, COD collections, and support interactions. This information is used to verify eligibility, assign jobs, calculate payouts, monitor service quality, investigate disputes, and ensure safety.
      </p>

      <PolicyH3>6.2 Information Shared With Delivery Partners</PolicyH3>
      <p>
        For each assigned job, delivery partners may receive the restaurant name and address, customer name, delivery address, contact number, order ID, items summary, special instructions, prepaid or COD indicator, and COD amount where applicable. They may also see map routes and live tracking interfaces. Delivery partners must not share customer phone numbers, addresses, or order details with unauthorized persons, use them for personal benefit, or retain them after the delivery is complete except as required for lawful dispute resolution or Vyaha-directed investigations.
      </p>

      <PolicyH3>6.3 Location Tracking of Delivery Partners</PolicyH3>
      <p>
        Vyaha may collect precise location data from delivery partners while they are marked online, available, travelling to a restaurant, waiting for pickup, en route to the customer, or otherwise handling an active job. Customers may see approximate live location for active deliveries. Location data may also be used after delivery for limited periods to investigate fraud claims, delivery disputes, or safety incidents. Delivery partners can control certain permissions through device settings, but disabling required permissions may prevent access to jobs or live tracking features.
      </p>

      <PolicyH3>6.4 Delivery Partner Payout and Tax Data</PolicyH3>
      <p>
        We use bank account details and earnings records to process payouts. Vyaha may share necessary payout and identity information with banking partners, payment aggregators, or tax reporting systems where required by law. Delivery partners are responsible for their own statutory tax obligations unless Vyaha is legally required to deduct or report taxes.
      </p>

      <PolicyH3>6.5 Enforcement Against Misuse</PolicyH3>
      <p>
        Misuse of customer data, fake delivery confirmation, route manipulation, harassment, cash misappropriation, or document fraud may result in warnings, temporary holds on payouts, suspension, permanent deactivation, and reporting to authorities or payment partners where appropriate.
      </p>

      <PolicyH2>7. Automatic Data Collection, Cookies, and Similar Technologies</PolicyH2>

      <p>
        When you use our website or mobile applications, we and authorized third parties may automatically collect certain information through cookies, local storage, software development kits (SDKs), pixels, web beacons, server logs, and similar technologies.
      </p>

      <PolicyH3>7.1 What These Technologies Do</PolicyH3>
      <ul>
        <li>Keep you signed in and maintain secure sessions after OTP verification.</li>
        <li>Remember preferences such as language, recent searches, or saved addresses on web sessions.</li>
        <li>Measure page views, feature usage, campaign performance, and referral sources.</li>
        <li>Detect bugs, crashes, and performance issues through Firebase Crashlytics and related diagnostic tools.</li>
        <li>Help prevent fraud, bot activity, and abusive automated access.</li>
        <li>Support map loading, notifications, and payment SDK functionality in mobile apps.</li>
      </ul>

      <PolicyH3>7.2 Your Choices</PolicyH3>
      <p>
        You can manage cookies through your browser settings. Blocking essential cookies may affect login, checkout, or partner dashboard functionality. On mobile devices, you can manage app permissions, reset advertising identifiers where available, and disable non-essential notifications. For detailed descriptions of cookie categories and SDKs, please read our <Link to="/cookie-policy">Cookie Policy</Link>.
      </p>

      <PolicyH3>7.3 Do Not Track</PolicyH3>
      <p>
        Some browsers transmit &quot;Do Not Track&quot; signals. Because there is no uniform industry standard for responding to such signals, Vyaha does not currently respond to Do Not Track signals in a standardized way. You can still use the privacy choices described in this Policy and our Cookie Policy.
      </p>

      <PolicyH2>8. Data Storage, Retention, and Deletion</PolicyH2>

      <PolicyH3>8.1 Where We Store Data</PolicyH3>
      <p>
        Personal data collected through the Vyaha Platform is primarily stored and processed in {operatingCountry}, using data centers and cloud infrastructure selected to support our operations in {serviceAreasFormatted}. We implement access controls, encryption in transit where appropriate, role-based permissions, logging, and backup practices designed to protect stored data.
      </p>

      <PolicyH3>8.2 Retention Periods</PolicyH3>
      <p>
        We retain personal data only for as long as necessary to fulfill the purposes described in this Policy, including providing services, resolving disputes, enforcing agreements, and meeting legal, tax, audit, and regulatory requirements. Retention periods vary by data category. For example, active account profile data is kept while your account remains open; order and payment records may be retained for several years for accounting and legal compliance; delivery location logs may be retained for operational and safety review periods; and fraud investigation records may be kept while an investigation is active and for a reasonable period thereafter. See our <Link to="/data-retention">Data Retention Policy</Link> for category-wise guidance.
      </p>

      <PolicyH3>8.3 Account Deletion</PolicyH3>
      <p>
        You may request deletion of your Vyaha account and associated personal data by following the process on our <Link to="/delete-account">Account Deletion</Link> page or by emailing <MailLink email={privacyEmail} /> from your registered contact details. After verifying your request, we will delete or anonymize personal data that is no longer required, subject to legal retention obligations, unresolved orders, pending refunds or payouts, fraud investigations, and backup overwrite cycles. Deletion may limit your ability to access order history, support, or partner payouts until outstanding matters are resolved.
      </p>

      <PolicyH3>8.4 Backups</PolicyH3>
      <p>
        Deleted data may persist in encrypted backups for a limited rolling period before being overwritten or securely purged according to our backup retention schedule.
      </p>

      <PolicyH2>9. Cross-Border Processing and International Transfers</PolicyH2>

      <p>
        Although Vyaha&apos;s primary operations and intended data storage location are in India, some technology service providers used by Vyaha — including cloud hosting providers, Google Firebase services, map providers, payment gateways, and communications vendors — may process, store, or route data on servers located outside India as part of their global infrastructure.
      </p>
      <p>
        Where personal data is transferred outside India, Vyaha takes reasonable steps to ensure that appropriate contractual, technical, and organizational safeguards are in place consistent with applicable Indian law, including requirements under the DPDP Act and SPDI Rules where relevant. By using the Platform, you understand that certain processing by third-party providers may occur in jurisdictions with different data protection laws than India, and you consent to such transfers where required for the services described in this Policy.
      </p>

      <PolicyH2>10. Your Rights Under Applicable Law</PolicyH2>

      <p>
        Subject to applicable Indian law, including the DPDP Act where it applies to Vyaha&apos;s processing activities, you may have some or all of the following rights regarding your personal data:
      </p>

      <PolicyH3>10.1 Right to Access and Confirmation</PolicyH3>
      <p>
        You may request information about the personal data we hold about you and the purposes for which it is being processed, subject to verification of your identity and lawful exceptions.
      </p>

      <PolicyH3>10.2 Right to Correction and Updating</PolicyH3>
      <p>
        You may request correction or updating of inaccurate, incomplete, or outdated personal data. You can also update certain profile, address, and business details directly in the app where the feature is available.
      </p>

      <PolicyH3>10.3 Right to Erasure</PolicyH3>
      <p>
        You may request erasure of personal data through our <Link to="/delete-account">account deletion process</Link>, subject to retention required by law, unresolved transactions, tax records, fraud prevention, and active disputes.
      </p>

      <PolicyH3>10.4 Right to Withdraw Consent</PolicyH3>
      <p>
        Where processing is based on consent, such as certain marketing communications or optional permissions, you may withdraw consent at any time by adjusting app settings, revoking device permissions, or emailing <MailLink email={privacyEmail} />. Withdrawal does not affect the lawfulness of processing before withdrawal or processing that does not rely on consent.
      </p>

      <PolicyH3>10.5 Right to Nominate</PolicyH3>
      <p>
        Where applicable under the DPDP Act, you may nominate another individual to exercise your rights in the event of your death or incapacity, in accordance with the procedures prescribed under applicable law.
      </p>

      <PolicyH3>10.6 Grievance Redressal</PolicyH3>
      <p>
        You may raise privacy-related complaints with our grievance officer as described in Section 14. If you are not satisfied with our response, you may have the right to approach the Data Protection Board of India or other competent authority once operational under the DPDP Act, or other remedies available under applicable law.
      </p>

      <PolicyH3>10.7 How to Exercise Your Rights</PolicyH3>
      <p>
        To exercise applicable rights, email <MailLink email={privacyEmail} /> or <MailLink email={legalContacts.grievance} /> with sufficient detail to verify your identity, describe your request, and specify the app or account role involved. We may ask for additional information to prevent unauthorized access to another person&apos;s data. We will respond within timelines required by applicable law, subject to complexity and legal exceptions.
      </p>

      <PolicyH2>11. Security Measures</PolicyH2>

      <p>
        Vyaha implements reasonable technical and organizational security measures designed to protect personal data against unauthorized access, alteration, disclosure, loss, or destruction. These measures may include encrypted communications for sensitive flows, access controls based on job role, secure authentication using OTP and tokens, logging and monitoring, vendor security reviews, employee confidentiality obligations, and incident response procedures.
      </p>
      <p>
        No method of transmission over the internet or electronic storage is completely secure. While we strive to protect your information, we cannot guarantee absolute security. You are responsible for safeguarding your phone, OTP messages, device unlock credentials, and app sessions. Report suspected unauthorized access immediately to <MailLink email={legalContacts.security} />. Additional detail is available in our <Link to="/security">Security Policy</Link>.
      </p>

      <PolicyH2>12. Minors and Children&apos;s Privacy</PolicyH2>

      <p>
        The Vyaha Platform is intended for users who are at least 18 years of age and legally competent to enter into a binding contract under applicable Indian law, or for use by minors only with the knowledge, supervision, and consent of a parent or legal guardian where placing an order or creating an account is permitted.
      </p>
      <p>
        Vyaha does not knowingly collect personal data from children under 18 without appropriate guardian involvement. If you are a parent or guardian and believe that your child has provided personal data to Vyaha without your consent, please contact <MailLink email={privacyEmail} /> with sufficient details so we can review and take appropriate action, which may include deletion of the account or restriction of access, subject to legal retention requirements.
      </p>
      <p>
        Parents and guardians are responsible for monitoring minors&apos; use of the Platform, payment methods, delivery addresses, and communications with restaurants and delivery partners.
      </p>

      <PolicyH2>13. Marketing Communications and Opt-Out</PolicyH2>

      <p>
        Vyaha may send promotional SMS, push notifications, emails, or in-app messages about offers, new restaurants, discounts, referral programs, and seasonal campaigns where permitted by law and your preferences. These communications are separate from essential service messages such as OTP codes, order confirmations, delivery alerts, payout notices, security warnings, and support replies.
      </p>
      <p>
        You can opt out of non-essential marketing by:
      </p>
      <ul>
        <li>Using in-app notification or marketing preference settings where available.</li>
        <li>Following unsubscribe instructions in promotional emails, where provided.</li>
        <li>Emailing <MailLink email={privacyEmail} /> with the subject line Marketing Opt-Out and your registered phone number or email address.</li>
      </ul>
      <p>
        Opting out of marketing does not affect service communications necessary to operate your account or complete active orders. Additional information is available on our <Link to="/marketing-consent">Marketing and Communications</Link> page.
      </p>

      <PolicyH2>14. Grievance Officer</PolicyH2>

      <p>
        In accordance with applicable provisions of the IT Act, SPDI Rules, and the DPDP Act, {legalEntityName} has appointed a grievance officer to address privacy-related complaints, data principal requests, and concerns about our processing practices.
      </p>
      <p>
        If you have a question, concern, or complaint regarding this Policy or our handling of your personal data, please contact our grievance officer using the details below. Include your name, registered phone number or email, account role, a clear description of the issue, and any supporting documents or order IDs.
      </p>
      <GrievanceOfficerBlock />

      <PolicyH2>15. Miscellaneous</PolicyH2>

      <PolicyH3>15.1 Third-Party Links and Services</PolicyH3>
      <p>
        The Platform may contain links to third-party websites, payment pages, app stores, social media pages, restaurant websites, or external support tools. This Policy does not apply to third-party services, and Vyaha is not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party service before providing personal data to them.
      </p>

      <PolicyH3>15.2 Admin Access</PolicyH3>
      <p>
        Authorized Vyaha admin users may access personal data strictly on a need-to-know basis for onboarding, order management, delivery coordination, support, fraud investigation, payout processing, and legal compliance. Admin access is logged and subject to internal policies and role-based permissions.
      </p>

      <PolicyH3>15.3 Automated Decision-Making</PolicyH3>
      <p>
        Vyaha may use automated systems to assign delivery partners, detect fraud, flag suspicious orders, recommend restaurants, or enforce account restrictions. These systems support human review in significant cases such as payout holds, partner deactivation, or refund denials, where feasible. If you believe an automated decision has adversely affected you, you may contact support or our grievance officer for review.
      </p>

      <PolicyH3>15.4 Business Changes</PolicyH3>
      <p>
        If Vyaha reorganizes, merges, or transfers its business or platform assets, your personal data may be transferred to a successor entity that agrees to handle the data in a manner consistent with this Policy, subject to applicable law and notice requirements.
      </p>

      <PolicyH3>15.5 Changes to This Policy</PolicyH3>
      <p>
        We may update this Policy from time to time to reflect changes in our products, legal requirements, or operational practices. The updated version will be posted on this page with a revised effective date. Where changes are material, we may also notify you through the app, by email, or by other appropriate means. Continued use of the Platform after the effective date of an updated Policy constitutes acknowledgment of the changes, except where applicable law requires explicit renewed consent.
      </p>

      <PolicyH3>15.6 Severability</PolicyH3>
      <p>
        If any provision of this Policy is found invalid or unenforceable, the remaining provisions will continue in full force and effect to the extent permitted by law.
      </p>

      <PolicyH3>15.7 Governing Law and Jurisdiction</PolicyH3>
      <p>
        This Policy is governed by the laws of India. Subject to mandatory rights available under consumer protection or data protection law, courts at Hyderabad, Telangana shall have jurisdiction over disputes relating to this Policy, without prejudice to your right to approach competent forums where applicable law grants you that right.
      </p>

      <PolicyH2>16. Contact Us</PolicyH2>

      <p>
        For privacy questions, data access requests, marketing opt-out, or general account support related to privacy, contact us at:
      </p>
      <ul>
        <li>
          <strong>Privacy:</strong> <MailLink email={legalContacts.privacy} />
        </li>
        <li>
          <strong>Support:</strong> <MailLink email={legalContacts.support} />
        </li>
        <li>
          <strong>Security:</strong> <MailLink email={legalContacts.security} />
        </li>
        <li>
          <strong>Fraud reports:</strong> <MailLink email={legalContacts.fraud} />
        </li>
      </ul>
      <p>
        For account deletion, visit <Link to="/delete-account">Account Deletion</Link> or email <MailLink email={privacyEmail} /> from your registered contact details.
      </p>
      <p>
        Platform operator: {legalEntityName}, operating the {businessName} brand for hyperlocal food ordering and delivery in {serviceAreasFormatted}.
      </p>
      <ContactBlock />
    </>
  );
}
