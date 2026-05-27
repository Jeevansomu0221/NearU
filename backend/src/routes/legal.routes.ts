import { Router } from "express";

const router = Router();

const layout = (title: string, body: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} | Vyaha</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; color: #241d17; background: #fffaf5; }
      main { max-width: 860px; margin: 0 auto; padding: 32px 20px; }
      h1, h2 { color: #1f1711; }
      a { color: #c2410c; }
      .card { background: #fff; border: 1px solid #f1dccb; border-radius: 16px; padding: 24px; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        ${body}
        <p><strong>Last updated:</strong> May 22, 2026</p>
      </div>
    </main>
  </body>
</html>`;

router.get("/privacy", (_req, res) => {
  res.type("html").send(layout("Privacy Policy", `
    <h1>Privacy Policy</h1>
    <p>Vyaha respects user privacy and only collects information needed to run the customer app, restaurant partner app, delivery partner app, website, and support tools.</p>
    <h2>Information We Collect</h2>
    <p>We may collect phone number, name, email address, delivery address, order history, payment status, saved preferences, support messages, verification documents, and delivery partner location updates while jobs are active or permissions are enabled.</p>
    <h2>How We Use Information</h2>
    <p>We use this information to authenticate accounts, show nearby restaurants, process and deliver orders, verify partners, complete refunds, prevent fraud, improve service quality, and respond to support requests.</p>
    <h2>Sharing</h2>
    <p>We share only the minimum information needed with restaurants, delivery partners, payment gateways, cloud hosting providers, analytics or crash reporting tools, and support vendors. We do not sell personal information.</p>
    <h2>Retention And Deletion</h2>
    <p>You can request account deletion in the app or via <a href="/legal/delete-account">Delete Account</a>. Some order, tax, payout, fraud prevention, or dispute records may be retained where required by law or legitimate business needs.</p>
    <h2>Contact</h2>
    <p>Email <a href="mailto:privacy@vyaha.com">privacy@vyaha.com</a> or <a href="mailto:support@vyaha.com">support@vyaha.com</a> with privacy questions.</p>
  `));
});

router.get("/terms", (_req, res) => {
  res.type("html").send(layout("Terms of Service", `
    <h1>Terms of Service</h1>
    <p>By using Vyaha, you agree to use the platform lawfully, provide accurate information, and follow the rules that apply to customers, restaurants, delivery partners, and internal platform users.</p>
    <h2>Orders And Payments</h2>
    <p>Customers are responsible for accurate delivery details, accessible contact information, and timely payment of order totals, taxes, delivery fees, and any clearly shown charges. Online payments may be processed through third-party gateways such as Razorpay, and cash-on-delivery orders may be collected at delivery.</p>
    <h2>Partner Responsibilities</h2>
    <p>Restaurants and delivery partners must provide truthful identity, business, address, bank, tax, and operational details. Uploaded content, menu listings, and documents must be accurate and must not violate any law or third-party rights.</p>
    <h2>Account Safety</h2>
    <p>Users must keep OTPs, passwords, devices, and account access secure. Vyaha may limit or suspend accounts for fraud, unsafe behavior, abuse, repeated policy violations, or legal concerns.</p>
    <h2>Service Updates</h2>
    <p>Vyaha may update features, fees, policies, and availability from time to time. Continued use after an update means you accept the revised version.</p>
    <h2>Contact</h2>
    <p>Email <a href="mailto:support@vyaha.com">support@vyaha.com</a> for terms or service questions.</p>
  `));
});

router.get("/delete-account", (_req, res) => {
  res.type("html").send(layout("Delete Account", `
    <h1>Delete Account</h1>
    <p>You can request deletion from the profile or settings area inside the Vyaha app. This page explains what happens when an account deletion request is submitted.</p>
    <h2>What Happens</h2>
    <p>We deactivate the login session, remove or anonymize profile fields where possible, and stop non-essential access to the account. Some linked records may be masked or retained to support payments, disputes, fraud prevention, or legal compliance.</p>
    <h2>Data We May Retain</h2>
    <p>Order, payout, payment, tax, refund, fraud, support, and dispute records may be retained if required by law or operational necessity. We do not delete everything instantly when records must be preserved for legal reasons.</p>
    <h2>Manual Request</h2>
    <p>If you cannot access the app, email <a href="mailto:support@vyaha.com">support@vyaha.com</a> from your registered phone or account context and include your role: customer, partner, or delivery partner.</p>
  `));
});

export default router;
