import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LegalPage.css';

const effectiveDate = 'May 5, 2026';
const supportEmail = 'support@vyaha.com';
const privacyEmail = 'privacy@vyaha.com';
const securityEmail = 'security@vyaha.com';
const reportEmail = 'report@vyaha.com';

function MailLink({ email }) {
  return <a href={`mailto:${email}`}>{email}</a>;
}

function PolicyIntro({ children }) {
  return <p className="policy-intro">{children}</p>;
}

function PolicyNote({ children }) {
  return <p className="policy-note">{children}</p>;
}

const pageData = {
  policies: {
    title: 'Guidelines and Policies',
    content: (
      <>
        <PolicyIntro>
          Vyaha is a local commerce and delivery platform for customers, restaurants, delivery partners, and internal operations teams. These policies explain how our platform should be used, how we protect information, and what standards we expect from everyone in the Vyaha ecosystem.
        </PolicyIntro>
        <PolicyNote>
          These pages are written for Vyaha's current customer app, restaurant partner app, delivery partner app, admin panel, website, APIs, and related services. They should be reviewed by a qualified legal advisor before launch.
        </PolicyNote>
        <h3>Policy Hub</h3>
        <ul className="policy-link-list">
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="/terms">Terms of Service</Link></li>
          <li><Link to="/security">Security Policy</Link></li>
          <li><Link to="/community-guidelines">Community and Content Guidelines</Link></li>
          <li><Link to="/refunds">Cancellation and Refund Policy</Link></li>
          <li><Link to="/partner-policy">Restaurant Partner Policy</Link></li>
          <li><Link to="/delivery-policy">Delivery Partner Policy</Link></li>
          <li><Link to="/cookie-policy">Cookie Policy</Link></li>
          <li><Link to="/delete-account">Account Deletion</Link></li>
          <li><Link to="/fraud">Report Fraud</Link></li>
        </ul>
        <h3>Core Principles</h3>
        <ul>
          <li>Use accurate account, order, restaurant, payout, and delivery information.</li>
          <li>Treat customers, restaurant staff, delivery partners, and Vyaha teams with respect.</li>
          <li>Do not misuse orders, payments, promotions, ratings, documents, or app access.</li>
          <li>Share only content, images, documents, and business information you have the right to use.</li>
          <li>Report fraud, safety concerns, and security issues quickly so we can act.</li>
        </ul>
      </>
    )
  },
  about: {
    title: 'About Vyaha',
    content: (
      <>
        <PolicyIntro>
          Vyaha connects nearby customers with local restaurants and businesses through ordering, delivery, partner operations, and admin tools.
        </PolicyIntro>
        <p>Our goal is to make local ordering simpler for customers, easier to manage for restaurants, and more reliable for delivery partners.</p>
        <h3>Vyaha Supports</h3>
        <ul>
          <li>Customers ordering food, groceries, and local essentials.</li>
          <li>Restaurant and shop partners managing menus, orders, documents, and payouts.</li>
          <li>Delivery partners accepting jobs, updating status, and tracking earnings.</li>
          <li>Admin teams reviewing partners, assigning deliveries, and handling platform operations.</li>
        </ul>
      </>
    )
  },
  blog: {
    title: 'Blog',
    content: (
      <>
        <PolicyIntro>Stories, updates, and useful notes from Vyaha's local delivery network.</PolicyIntro>
        <div className="blog-placeholder">
          <h3>Top Restaurants Near You</h3>
          <p>Discover local kitchens, popular dishes, and neighborhood favorites.</p>
        </div>
        <div className="blog-placeholder">
          <h3>How Local Delivery Helps Small Businesses</h3>
          <p>Read about faster ordering, better visibility, and stronger repeat customer relationships.</p>
        </div>
        <div className="blog-placeholder">
          <h3>Delivery Partner Safety Basics</h3>
          <p>Practical guidance for route safety, cash handling, and customer communication.</p>
        </div>
      </>
    )
  },
  partner: {
    title: 'Partner With Us',
    content: (
      <>
        <PolicyIntro>Partner with Vyaha to receive online orders, manage your menu, and serve more local customers.</PolicyIntro>
        <h3>Why Partner With Vyaha?</h3>
        <ul>
          <li>Online order management through the restaurant partner app.</li>
          <li>Local customer discovery and marketing opportunities.</li>
          <li>Menu, pricing, availability, and order status controls.</li>
          <li>Delivery coordination and admin support.</li>
          <li>Transparent business information and payout support.</li>
        </ul>
        <h3>Typical Onboarding Steps</h3>
        <ol>
          <li>Register your restaurant or shop.</li>
          <li>Submit business, owner, bank, and document details.</li>
          <li>Upload menu items, prices, images, and service availability.</li>
          <li>Complete verification and begin accepting orders.</li>
        </ol>
        <button className="cta-button">Start Partnering</button>
      </>
    )
  },
  fraud: {
    title: 'Report Fraud',
    content: (
      <>
        <PolicyIntro>Vyaha takes fraud, impersonation, payment misuse, document misuse, and unsafe behavior seriously.</PolicyIntro>
        <h3>Reportable Issues</h3>
        <ul>
          <li>Fake delivery calls, OTP requests, account takeover attempts, or phishing messages.</li>
          <li>Unauthorized payments, suspicious refunds, chargeback abuse, or COD misuse.</li>
          <li>Fake restaurants, copied menus, false documents, or impersonated partner accounts.</li>
          <li>Delivery fraud, wrong delivery confirmation, route manipulation, or cash collection disputes.</li>
          <li>Harassment, threats, blackmail, or attempts to force a refund, rating, or benefit.</li>
        </ul>
        <h3>What To Include</h3>
        <p>Please share your name, phone number, order ID if available, a clear description, screenshots, call details, payment references, and any other evidence that can help us review the issue.</p>
        <h3>Contact</h3>
        <p>Email: <MailLink email={reportEmail} /></p>
      </>
    )
  },
  support: {
    title: 'Help and Support',
    content: (
      <>
        <PolicyIntro>Vyaha support helps customers, restaurant partners, delivery partners, and internal platform users resolve account, order, payment, and delivery issues.</PolicyIntro>
        <h3>Customer Support</h3>
        <p>Contact us for order issues, payment failures, delivery delays, refund requests, account access, address updates, or safety concerns.</p>
        <h3>Restaurant Partner Support</h3>
        <p>Contact us for onboarding, menu changes, document review, order management, payout questions, app issues, or account access.</p>
        <h3>Delivery Partner Support</h3>
        <p>Contact us for profile verification, available jobs, route issues, delivery status, earnings, COD questions, or app troubleshooting.</p>
        <h3>Contact</h3>
        <p>Email: <MailLink email={supportEmail} /></p>
      </>
    )
  },
  privacy: {
    title: 'Privacy Policy',
    content: (
      <>
        <p><strong>Effective Date:</strong> {effectiveDate}</p>
        <PolicyIntro>Vyaha respects your privacy. This policy explains what information we collect, how we use it, when we share it, and the choices available to users of our website, customer app, restaurant partner app, delivery partner app, admin panel, APIs, and related services.</PolicyIntro>
        <h3>1. Information We Collect</h3>
        <p><strong>Account information:</strong> name, phone number, email address, role, login status, OTP verification details, and account preferences.</p>
        <p><strong>Customer information:</strong> delivery address, saved profile details, cart items, order history, delivery notes, payment method, support messages, and refund requests.</p>
        <p><strong>Restaurant partner information:</strong> restaurant name, owner or manager details, address, menu items, pricing, images, GST details where applicable, bank details, licenses, verification documents, and order activity.</p>
        <p><strong>Delivery partner information:</strong> name, phone number, vehicle type, driving license where applicable, identity documents, bank details, availability status, assigned jobs, current or recent location, delivery status, and earnings details.</p>
        <p><strong>Device and usage information:</strong> device type, operating system, app version, IP address, crash logs, session data, approximate region, and interactions with our apps or website.</p>
        <h3>2. How We Use Information</h3>
        <ul>
          <li>Create, verify, secure, and manage user accounts.</li>
          <li>Process orders, assign restaurants and delivery partners, provide live status updates, and complete deliveries.</li>
          <li>Process payments, COD records, refunds, payouts, invoices, and reconciliation.</li>
          <li>Review restaurant and delivery partner onboarding documents.</li>
          <li>Provide customer support, fraud prevention, safety checks, dispute handling, and platform enforcement.</li>
          <li>Improve app performance, user experience, delivery accuracy, analytics, and reliability.</li>
          <li>Send service updates, order alerts, security messages, support replies, and promotional communications where permitted.</li>
        </ul>
        <h3>3. Location Data</h3>
        <p>We use location data to improve address accuracy, show nearby restaurants or jobs, calculate delivery distance, assign available delivery partners, track active deliveries, and support safety or fraud investigations. Delivery partner location may be collected while they are available or handling an active job, depending on app permissions and platform requirements.</p>
        <h3>4. Sharing of Information</h3>
        <p>Vyaha does not sell personal information. We may share limited information with restaurants, delivery partners, payment gateways such as Razorpay, cloud and notification providers, map providers, analytics and crash reporting tools, support vendors, professional advisors, and law enforcement or government authorities where legally required.</p>
        <h3>5. Payment Information</h3>
        <p>Payments may be processed through third-party payment providers. Vyaha does not intentionally store full card numbers, CVV values, or sensitive payment authentication credentials on its own servers. Payment references, order IDs, method labels, and status information may be stored for support, reconciliation, and legal compliance.</p>
        <h3>6. Data Retention</h3>
        <p>We keep information for as long as needed to provide services, comply with law, resolve disputes, enforce agreements, prevent fraud, and maintain business records. Some records may be retained after account closure where required for tax, payment, safety, audit, or legal reasons.</p>
        <h3>7. Your Choices</h3>
        <ul>
          <li>You can update profile details and app permissions through your device or app settings where available.</li>
          <li>You can request access, correction, deletion, or restriction of personal information by contacting us.</li>
          <li>You can opt out of non-essential promotional communications where such controls are provided.</li>
          <li>You can disable location permissions, but some ordering, delivery, or job assignment features may stop working correctly.</li>
        </ul>
        <h3>8. Children</h3>
        <p>Vyaha is intended for users who can lawfully use ordering and delivery services. Minors should use Vyaha only with parental or guardian supervision.</p>
        <h3>9. Changes To This Policy</h3>
        <p>We may update this policy as our products, laws, or operations change. Updated policies will be posted on this page with a revised effective date.</p>
        <h3>10. Contact</h3>
        <p>For privacy concerns, contact <MailLink email={privacyEmail} /> or <MailLink email={supportEmail} />.</p>
      </>
    )
  },
  security: {
    title: 'Security Policy',
    content: (
      <>
        <p><strong>Effective Date:</strong> {effectiveDate}</p>
        <PolicyIntro>Vyaha works to keep customer accounts, restaurant operations, delivery activity, payments, documents, and admin tools secure.</PolicyIntro>
        <h3>1. Account Protection</h3>
        <ul>
          <li>We use OTP-based authentication and token-based sessions for platform access.</li>
          <li>Users should keep phones, OTPs, devices, and app sessions secure.</li>
          <li>Never share OTPs, payment passwords, or account access with anyone claiming to represent Vyaha.</li>
        </ul>
        <h3>2. Data Protection</h3>
        <p>We use security controls such as encrypted communication channels, access controls, role-based authorization, secure cloud storage practices, monitoring, backups, and limited internal access based on operational need.</p>
        <h3>3. Payments and Payouts</h3>
        <p>Online payments are handled through trusted payment providers. Bank and payout information is restricted to authorized processes and teams. COD activity, refunds, and payout records may be reviewed for fraud prevention and reconciliation.</p>
        <h3>4. Admin and Partner Controls</h3>
        <p>Restaurant partner approvals, delivery partner verification, order assignment, and admin actions are protected through role-based access. Admin tools should be used only by authorized personnel for legitimate platform operations.</p>
        <h3>5. Responsible Disclosure</h3>
        <p>If you discover a vulnerability, do not exploit it, access another person's data, disrupt services, or publicly disclose the issue before we have had a reasonable opportunity to investigate.</p>
        <h3>6. Report A Security Issue</h3>
        <p>Email <MailLink email={securityEmail} /> with a clear description, affected URL or app screen, steps to reproduce, screenshots if safe, and your contact details. We appreciate good-faith reports.</p>
      </>
    )
  },
  terms: {
    title: 'Terms of Service',
    content: (
      <>
        <p><strong>Effective Date:</strong> {effectiveDate}</p>
        <PolicyIntro>These Terms govern your use of Vyaha's website, customer app, restaurant partner app, delivery partner app, admin panel, APIs, and related services. By using Vyaha, you agree to these Terms.</PolicyIntro>
        <h3>1. Eligibility</h3>
        <p>You must be legally capable of entering into a binding agreement or use Vyaha under appropriate parental or guardian supervision. Restaurant and delivery partners must provide truthful registration, verification, tax, payout, and operational details.</p>
        <h3>2. Platform Role</h3>
        <p>Vyaha operates as a technology platform connecting customers, restaurants, shops, delivery partners, payment providers, and support teams. Restaurants are responsible for the items they prepare or list. Delivery partners are responsible for following delivery instructions, safety rules, and applicable laws.</p>
        <h3>3. User Accounts</h3>
        <p>You are responsible for accurate information, account activity, device security, OTP confidentiality, and immediate reporting of unauthorized access. Vyaha may suspend or terminate accounts involved in fraud, abuse, safety risks, policy violations, or legal issues.</p>
        <h3>4. Orders and Delivery</h3>
        <p>Order acceptance, preparation, availability, pricing, delivery estimates, fees, and item substitutions may vary. Delivery times are estimates and can be affected by restaurant load, distance, weather, traffic, partner availability, and operational constraints.</p>
        <h3>5. Payments</h3>
        <p>Vyaha may support cash on delivery, UPI, online payment, or other methods. You agree to pay item prices, taxes, delivery fees, platform fees, packing fees, and any applicable charges shown before order confirmation. Payment failures, mismatches, or suspected fraud may delay or cancel orders.</p>
        <h3>6. Cancellations and Refunds</h3>
        <p>Cancellations and refunds are handled under our <Link to="/refunds">Cancellation and Refund Policy</Link>. Vyaha may review order status, restaurant preparation, delivery assignment, payment records, and evidence before approving a refund.</p>
        <h3>7. Prohibited Activities</h3>
        <ul>
          <li>Fraud, impersonation, fake orders, fake restaurants, fake documents, or payment misuse.</li>
          <li>Harassment, threats, hate speech, blackmail, unsafe conduct, or abuse of support teams.</li>
          <li>Reverse engineering, unauthorized scraping, security testing without permission, or disruption of services.</li>
          <li>Using Vyaha to sell illegal, unsafe, restricted, counterfeit, or misleading items.</li>
          <li>Manipulating ratings, promotions, payouts, delivery status, or refund systems.</li>
        </ul>
        <h3>8. Intellectual Property</h3>
        <p>Vyaha's brand, software, designs, content, and platform materials belong to Vyaha or its licensors. Partners remain responsible for ensuring they have rights to uploaded restaurant names, menu images, logos, descriptions, and business materials.</p>
        <h3>9. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, Vyaha is not liable for indirect, incidental, special, consequential, punitive, or loss-of-profit damages arising from use of the platform. Nothing in these Terms limits rights that cannot be limited under applicable law.</p>
        <h3>10. Changes</h3>
        <p>We may update these Terms from time to time. Continued use of Vyaha after updates means you accept the revised Terms.</p>
        <h3>11. Contact</h3>
        <p>Questions about these Terms can be sent to <MailLink email={supportEmail} />.</p>
      </>
    )
  },
  refunds: {
    title: 'Cancellation and Refund Policy',
    content: (
      <>
        <p><strong>Effective Date:</strong> {effectiveDate}</p>
        <PolicyIntro>This policy explains how Vyaha reviews cancellations, refunds, payment failures, missing items, delays, and delivery disputes.</PolicyIntro>
        <h3>1. Customer Cancellations</h3>
        <p>You may request cancellation before the restaurant accepts or begins preparing the order. Once preparation, packing, or delivery assignment has started, cancellation may be declined or charges may apply.</p>
        <h3>2. Restaurant or Platform Cancellations</h3>
        <p>Vyaha or the restaurant may cancel an order if items are unavailable, payment fails, the address is outside service range, the customer is unreachable, fraud is suspected, or delivery cannot be completed safely.</p>
        <h3>3. Refund Eligibility</h3>
        <ul>
          <li>Eligible cases may include duplicate payment, failed payment with amount debited, cancelled order before preparation, missing major items, incorrect order, or confirmed non-delivery.</li>
          <li>Partially eligible cases may include late delivery, minor item mismatch, packaging issue, or quality complaint after review.</li>
          <li>Ineligible cases may include wrong address, unreachable customer, refusal to accept COD order, repeated misuse, or preference-based complaints after delivery.</li>
        </ul>
        <h3>4. Refund Method and Timing</h3>
        <p>Approved refunds are usually returned to the original payment method or another method permitted by Vyaha and the payment provider. Bank and payment provider timelines may vary.</p>
        <h3>5. Evidence and Review</h3>
        <p>Vyaha may request photos, order IDs, payment references, delivery status, restaurant confirmation, delivery partner notes, call logs, or other evidence before deciding a refund request.</p>
        <h3>6. COD Orders</h3>
        <p>For cash on delivery orders, disputes may be reviewed against delivery status, amount collected, customer confirmation, delivery partner records, and restaurant records.</p>
        <h3>7. Contact</h3>
        <p>Refund requests can be sent to <MailLink email={supportEmail} /> with the order ID and details.</p>
      </>
    )
  },
  community: {
    title: 'Community and Content Guidelines',
    content: (
      <>
        <PolicyIntro>Vyaha may allow users and partners to submit names, images, menu details, reviews, support messages, delivery notes, profile details, and other content. These guidelines keep that content useful and safe.</PolicyIntro>
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
    )
  },
  partnerPolicy: {
    title: 'Restaurant Partner Policy',
    content: (
      <>
        <PolicyIntro>This policy applies to restaurants, shops, owners, managers, and staff using Vyaha's partner tools.</PolicyIntro>
        <h3>1. Onboarding and Verification</h3>
        <p>Partners must provide accurate business, owner, address, bank, GST where applicable, license, and verification information. Vyaha may approve, reject, pause, or request more information at any time.</p>
        <h3>2. Menu and Pricing</h3>
        <p>Partners are responsible for accurate item names, descriptions, prices, availability, packaging charges, taxes, images, preparation times, and any required food or safety disclosures.</p>
        <h3>3. Order Handling</h3>
        <ul>
          <li>Accept only orders that can be prepared and handed over properly.</li>
          <li>Update item availability and order status promptly.</li>
          <li>Pack items safely and include correct items, quantities, and invoices where applicable.</li>
          <li>Do not substitute items without customer or platform approval where required.</li>
        </ul>
        <h3>4. Customer and Delivery Partner Conduct</h3>
        <p>Partners must treat customers, delivery partners, and Vyaha teams respectfully. Harassment, discrimination, threats, unsafe handover, or refusal based on improper reasons may lead to action.</p>
        <h3>5. Payouts and Deductions</h3>
        <p>Payouts may be adjusted for commissions, taxes, refunds, cancellations, penalties, COD reconciliation, promotions, payment gateway charges, and other agreed fees. Vyaha may hold or review payouts for fraud, disputes, or verification issues.</p>
        <h3>6. Restricted Items</h3>
        <p>Partners must not list illegal, unsafe, restricted, counterfeit, expired, or misleading items. Alcohol, tobacco, medicines, and regulated goods must not be listed unless Vyaha expressly supports them and all laws are followed.</p>
      </>
    )
  },
  deliveryPolicy: {
    title: 'Delivery Partner Policy',
    content: (
      <>
        <PolicyIntro>This policy applies to delivery partners using Vyaha to receive, accept, and complete delivery jobs.</PolicyIntro>
        <h3>1. Verification</h3>
        <p>Delivery partners must provide accurate identity, phone, vehicle, bank, license where applicable, and other verification details. Vyaha may approve, reject, pause, or re-verify accounts.</p>
        <h3>2. Availability and Job Acceptance</h3>
        <p>Delivery partners should go online only when ready to accept jobs. Once accepted, jobs must be handled promptly unless there is a safety issue, emergency, or approved reason.</p>
        <h3>3. Delivery Conduct</h3>
        <ul>
          <li>Pick up the correct order and verify restaurant handover details.</li>
          <li>Follow lawful road safety practices and local traffic rules.</li>
          <li>Use customer contact information only for delivery-related communication.</li>
          <li>Do not mark orders delivered until they are actually delivered.</li>
          <li>Handle COD orders honestly and return or reconcile collected amounts as required.</li>
        </ul>
        <h3>4. Location and Status Updates</h3>
        <p>Vyaha may use location and status data to show jobs, calculate distance, track active delivery, support safety, and investigate disputes. Turning off required permissions may limit access to delivery jobs.</p>
        <h3>5. Earnings</h3>
        <p>Earnings are calculated based on Vyaha's current rates, delivery fee rules, distance rules, incentives, deductions, cancellations, COD reconciliation, and dispute outcomes. Vyaha may review earnings in suspected fraud or misuse cases.</p>
        <h3>6. Safety and Account Action</h3>
        <p>Unsafe driving, harassment, fraud, cash misuse, repeated cancellations, route manipulation, document fraud, or policy violations may lead to warnings, temporary restrictions, payout holds, suspension, or termination.</p>
      </>
    )
  },
  cookie: {
    title: 'Cookie Policy',
    content: (
      <>
        <p><strong>Effective Date:</strong> {effectiveDate}</p>
        <PolicyIntro>Vyaha's website and web tools may use cookies, local storage, pixels, SDKs, and similar technologies to run the service, remember preferences, improve performance, and understand usage.</PolicyIntro>
        <h3>Types We May Use</h3>
        <ul>
          <li><strong>Essential:</strong> login sessions, security, routing, fraud prevention, and service availability.</li>
          <li><strong>Functional:</strong> preferences, language, location hints, and saved choices.</li>
          <li><strong>Analytics:</strong> page usage, feature engagement, errors, crashes, and performance.</li>
          <li><strong>Marketing:</strong> campaign measurement and promotional effectiveness where permitted.</li>
        </ul>
        <h3>Your Choices</h3>
        <p>You can control cookies through your browser settings. Blocking essential cookies may affect login, checkout, support, or partner tools.</p>
        <h3>Contact</h3>
        <p>Questions about this policy can be sent to <MailLink email={privacyEmail} />.</p>
      </>
    )
  },
  deleteAccount: {
    title: 'Delete Your Vyaha Account',
    content: (
      <>
        <p><strong>Effective Date:</strong> {effectiveDate}</p>
        <PolicyIntro>
          Vyaha users can request deletion of their account and personal information. This page applies to Vyaha Customer, Vyaha Partner, Vyaha Delivery, the Vyaha website, and related services.
        </PolicyIntro>
        <PolicyNote>
          Some records may be retained where required for legal, tax, payment, fraud prevention, safety, dispute, or regulatory reasons.
        </PolicyNote>
        <h3>How To Request Account Deletion</h3>
        <ol>
          <li>Email us from your registered phone number or email address at <MailLink email={privacyEmail} />.</li>
          <li>Use the subject line: Delete My Vyaha Account.</li>
          <li>Include your full name, registered phone number, app used, and account role.</li>
          <li>If you are a restaurant or delivery partner, include your restaurant name or delivery partner profile details so we can verify ownership.</li>
        </ol>
        <h3>Account Roles</h3>
        <ul>
          <li><strong>Customer accounts:</strong> order profile, saved address, order history, support messages, and related customer data.</li>
          <li><strong>Restaurant partner accounts:</strong> business profile, menu data, verification documents, payout details, order records, and partner support data.</li>
          <li><strong>Delivery partner accounts:</strong> profile details, verification documents, vehicle details, location/job records, payout details, earnings records, and support data.</li>
        </ul>
        <h3>What We Delete</h3>
        <p>After verifying your request, we will delete or anonymize personal information that is no longer needed to provide services, meet legal obligations, prevent fraud, resolve disputes, or maintain necessary business records.</p>
        <h3>What We May Retain</h3>
        <ul>
          <li>Order, payment, refund, payout, tax, invoice, and settlement records required for business or legal compliance.</li>
          <li>Fraud prevention, safety, abuse, security, and dispute records where retention is necessary.</li>
          <li>Restaurant and delivery partner documents or records required for verification, audit, payout, or legal purposes.</li>
          <li>Backups for a limited period until they are overwritten or securely removed according to our retention practices.</li>
        </ul>
        <h3>Processing Time</h3>
        <p>We aim to acknowledge account deletion requests within 7 working days. Completion time may vary depending on verification, pending orders, payouts, refunds, disputes, legal requirements, or active investigations.</p>
        <h3>Before You Request Deletion</h3>
        <ul>
          <li>Complete or cancel active orders where possible.</li>
          <li>Resolve pending refunds, COD issues, payouts, or support tickets.</li>
          <li>Download or save any information you may need later, because account access may be removed after deletion.</li>
        </ul>
        <h3>Contact</h3>
        <p>To request deletion, email <MailLink email={privacyEmail} />. For general account help, contact <MailLink email={supportEmail} />.</p>
      </>
    )
  },
  restaurants: {
    title: 'For Restaurants',
    content: (
      <>
        <PolicyIntro>Vyaha helps restaurants and shops grow with local ordering, delivery coordination, and operational tools.</PolicyIntro>
        <h3>Benefits</h3>
        <ul>
          <li>Customer ordering through the Vyaha customer app.</li>
          <li>Partner app tools for menu, order, and status management.</li>
          <li>Delivery coordination with local delivery partners.</li>
          <li>Admin support for onboarding, verification, and issue handling.</li>
          <li>Business insights, promotions, and payout support as features become available.</li>
        </ul>
        <button className="cta-button">Register Your Restaurant</button>
      </>
    )
  },
  apps: {
    title: 'Apps For You',
    content: (
      <>
        <PolicyIntro>Vyaha includes separate experiences for customers, restaurants, delivery partners, and administrators.</PolicyIntro>
        <h3>Customer App</h3>
        <p>Order from nearby restaurants, manage profile and address details, track orders, choose COD or supported online payments, and contact support.</p>
        <button className="cta-button">Download Customer App</button>
        <h3>Restaurant Partner App</h3>
        <p>Manage onboarding, documents, menu items, order status, customer orders, and restaurant operations.</p>
        <button className="cta-button">Download Partner App</button>
        <h3>Delivery Partner App</h3>
        <p>Complete verification, go available, view jobs, accept deliveries, update status, manage profile, and track earnings.</p>
        <button className="cta-button">Download Delivery App</button>
      </>
    )
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
        <button className="cta-button">Book a Consultation</button>
      </>
    )
  },
  delivery: {
    title: 'For Delivery Partners',
    content: (
      <>
        <PolicyIntro>Join Vyaha as a delivery partner and earn by completing local delivery jobs.</PolicyIntro>
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
          <li>Agreement to Vyaha's delivery partner policies and safety standards.</li>
        </ul>
        <button className="cta-button">Become a Delivery Partner</button>
      </>
    )
  }
};

function LegalPage({ pageType }) {
  const data = pageData[pageType] || {
    title: 'Page Not Found',
    content: <p>The content you are looking for does not exist.</p>
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pageType]);

  return (
    <div className="legal-page-container">
      <div className="legal-brand-row">
        <Link className="legal-brand" to="/">
          <img src="/vyaha-logo.png" alt="Vyaha" />
          <span>Vyaha</span>
        </Link>
      </div>
      <div className="legal-header">
        <Link className="policy-back-link" to="/policies">Guidelines and Policies</Link>
        <h1>{data.title}</h1>
        <p>Last updated: {effectiveDate}</p>
      </div>
      <div className="legal-content">
        {data.content}
      </div>
    </div>
  );
}

export default LegalPage;
