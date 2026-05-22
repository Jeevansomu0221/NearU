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
    <p>Vyaha collects the information needed to operate customer ordering, restaurant partner, and delivery partner services.</p>
    <h2>Information We Collect</h2>
    <p>We may collect phone number, name, address, order history, payment status, uploaded restaurant or delivery verification documents, location updates for delivery partners, and support messages.</p>
    <h2>How We Use Information</h2>
    <p>We use this data to authenticate users, process orders, verify partners and delivery partners, assign deliveries, support payments and refunds, prevent fraud, and provide customer support.</p>
    <h2>Sharing</h2>
    <p>We share only what is needed with restaurants, delivery partners, payment processors, cloud hosting, storage, analytics, and support providers. We do not sell personal data.</p>
    <h2>Deletion</h2>
    <p>Users can request in-app account deletion or visit <a href="/legal/delete-account">Delete Account</a>. Some transaction records may be retained where required by law, tax, fraud prevention, or dispute handling.</p>
    <h2>Contact</h2>
    <p>Email support at support@vyaha.in with privacy questions.</p>
  `));
});

router.get("/terms", (_req, res) => {
  res.type("html").send(layout("Terms of Service", `
    <h1>Terms of Service</h1>
    <p>By using Vyaha, you agree to use the customer, restaurant partner, and delivery partner apps lawfully and only for their intended services.</p>
    <h2>Orders And Payments</h2>
    <p>Customers are responsible for accurate delivery details. Online payments are processed through Razorpay. Cash-on-delivery payments are collected at delivery.</p>
    <h2>Partner Responsibilities</h2>
    <p>Restaurant and delivery partners must provide accurate identity, business, bank, and operational details and comply with applicable laws.</p>
    <h2>Account Safety</h2>
    <p>Users must keep OTPs and account access secure. Vyaha may suspend accounts for fraud, unsafe behavior, or policy violations.</p>
    <h2>Contact</h2>
    <p>Email support at support@vyaha.in for terms or service questions.</p>
  `));
});

router.get("/delete-account", (_req, res) => {
  res.type("html").send(layout("Delete Account", `
    <h1>Delete Account</h1>
    <p>You can delete your Vyaha account from the profile or settings screen inside the app.</p>
    <h2>What Happens</h2>
    <p>We deactivate your login session, remove or anonymize profile details, and redact address or document fields where possible.</p>
    <h2>Data We May Retain</h2>
    <p>Order, payout, payment, tax, fraud-prevention, and dispute records may be retained if legally or operationally required.</p>
    <h2>Manual Request</h2>
    <p>If you cannot access the app, email support@vyaha.in from your registered phone/account context and include your role: customer, partner, or delivery partner.</p>
  `));
});

export default router;
