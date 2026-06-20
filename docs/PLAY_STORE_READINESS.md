# Play Store Readiness

Use this checklist before uploading customer, delivery, or partner builds to internal testing.

## Public URLs

Use these canonical URLs in Play Console (backend `/legal/*` routes redirect here):

- Privacy Policy: `https://www.vyaha.com/privacy`
- Terms of Service: `https://www.vyaha.com/terms`
- Account Deletion: `https://www.vyaha.com/delete-account`
- Delivery Partner Policy: `https://www.vyaha.com/delivery-policy`
- Restaurant Partner Policy: `https://www.vyaha.com/partner-policy`

## Data Safety Inputs

Declare the following data categories for the relevant app listings.

### Customer App

- Phone number: used for OTP login and account identity.
- Name and delivery address: used for order delivery.
- Optional email: used for profile, invoices, and support.
- Foreground location: used while browsing to show nearby restaurants and shops within 3 km.
- Order history and payment status: used for fulfilment, support, refunds, fraud prevention, and legal/tax records.
- Payment processor data: online payments are handled by Razorpay; do not claim Vyaha stores full card or UPI credentials.
- Crash logs/diagnostics: Firebase Crashlytics for stability monitoring.

### Delivery App

- Phone number, name, email, address: used for account identity and operations.
- Foreground location: used while working to show nearby jobs, calculate distance, assign delivery work, and update delivery progress.
- Identity, vehicle, bank, and document uploads: used for delivery partner verification and payout operations.
- Delivery history and earnings: used for operations, payouts, disputes, and support.
- Photos/camera: used for identity and vehicle verification uploads.
- Crash logs/diagnostics: Firebase Crashlytics for stability monitoring.

### Partner App

- Phone number, owner name, restaurant details, address, maps link: used for onboarding and customer discovery.
- Business, identity, menu, restaurant photo, bank, and payout documents: used for partner verification and payout operations.
- Menu items, shop status, order history, and payout metadata: used for operations, customer ordering, support, fraud prevention, and legal/tax records.
- Photos: used for menu and business verification uploads.
- Crash logs/diagnostics: Firebase Crashlytics for stability monitoring.

## Account Deletion Disclosure

All apps must expose account deletion in-app:

- Customer: Profile -> Account Actions -> Delete Account.
- Delivery: Account/Profile -> Account Actions -> Delete Account.
- Partner: Settings -> Delete Account.

Deletion deactivates login, invalidates sessions, and anonymizes profile/document fields where possible. Keep the Play Console deletion URL pointed to `https://www.vyaha.com/delete-account`.

## Store Listing Checklist

- App name, short description, and full description are final for each app.
- Screenshots are captured from a Play internal build, not a local dev client.
- Feature graphic is uploaded.
- Content rating questionnaire is completed.
- Target audience is set for adult users unless the business explicitly supports minors.
- App access instructions document Firebase test phone numbers for reviewers.
- Data Safety form matches the categories above.
- Location permission declarations explain customer nearby-shop discovery and delivery-partner foreground location use.
- Production Android builds target API 35 and include Firebase Crashlytics.
