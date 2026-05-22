# Play Store Readiness

Use this checklist before uploading customer, delivery, or partner builds to internal testing.

## Public URLs

- Privacy Policy: `https://vyaha-app-backend.onrender.com/legal/privacy`
- Terms of Service: `https://vyaha-app-backend.onrender.com/legal/terms`
- Account Deletion: `https://vyaha-app-backend.onrender.com/legal/delete-account`

## Data Safety Inputs

Declare the following data categories for the relevant app listings.

### Customer App

- Phone number: used for OTP login and account identity.
- Name and delivery address: used for order delivery.
- Optional email: used for profile, invoices, and support.
- Foreground location: used while browsing to show nearby restaurants and shops within 3 km.
- Order history and payment status: used for fulfilment, support, refunds, fraud prevention, and legal/tax records.
- Payment processor data: online payments are handled by Razorpay; do not claim Vyaha stores full card or UPI credentials.

### Delivery App

- Phone number, name, email, address: used for account identity and operations.
- Foreground location: used while working to show nearby jobs, calculate distance, assign delivery work, and update delivery progress.
- Identity, vehicle, bank, and document uploads: used for delivery partner verification and payout operations.
- Delivery history and earnings: used for operations, payouts, disputes, and support.

### Partner App

- Phone number, owner name, restaurant details, address, maps link: used for onboarding and customer discovery.
- Business, identity, menu, restaurant photo, bank, and payout documents: used for partner verification and payout operations.
- Menu items, shop status, order history, and payout metadata: used for operations, customer ordering, support, fraud prevention, and legal/tax records.

## Account Deletion Disclosure

All apps must expose account deletion in-app:

- Customer: Profile -> Account Actions -> Delete Account.
- Delivery: Account/Profile -> Account Actions -> Delete Account.
- Partner: Settings -> Delete Account.

Deletion deactivates login, invalidates sessions, and anonymizes profile/document fields where possible. Keep the Play Console deletion URL pointed to `/legal/delete-account`.

## Store Listing Checklist

- App name, short description, and full description are final for each app.
- Screenshots are captured from a Play internal build, not a local dev client.
- Feature graphic is uploaded.
- Content rating questionnaire is completed.
- Target audience is set for adult users unless the business explicitly supports minors.
- Test account instructions explain OTP/Firebase test numbers or provide reviewer credentials.
- Data Safety form matches the categories above.
- Location permission declarations explain customer nearby-shop discovery and delivery-partner foreground location use.
