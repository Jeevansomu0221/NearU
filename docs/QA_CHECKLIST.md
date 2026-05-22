# Production QA Checklist

Run this checklist on Play internal testing builds before promoting any app.

## Customer App

- Fresh install opens login and sends OTP.
- OTP verification works with the configured Firebase test/reviewer phone.
- New customer must complete name and full delivery address before reaching home.
- Shop list loads from production API.
- Menu loads, cart updates quantities, and checkout totals are correct.
- Cash-on-delivery order creates a confirmed order.
- Online payment opens Razorpay, verifies payment, and confirms the order.
- Payment cancellation or failed verification does not show a successful order.
- Order status screen reflects partner and delivery status changes.
- Logout clears session and returns to login.
- Delete account clears session and prevents token reuse.

## Partner App

- Fresh install opens login and OTP verification.
- Onboarding validates required identity, restaurant, address, document, and bank fields.
- Pending, rejected, and approved states show the correct screens.
- Approved partner can update profile, shop hours, shop image, and shop open status.
- Menu item create, image upload, edit, availability toggle, and delete work.
- Partner can accept/reject orders and move accepted orders through preparing and ready states.
- Logout clears session and returns to login.
- Delete account clears session and prevents token reuse.

## Delivery App

- Fresh install opens login and OTP verification.
- Profile/document onboarding uploads required files.
- Location permission denial shows a helpful message and does not crash.
- Location permission approval shows nearby available jobs.
- Job details request foreground location permission before accessing location.
- Delivery partner can accept a job, mark picked up, and mark delivered.
- COD delivery prompts for collected amount.
- Logout clears session and returns to login.
- Delete account clears session and prevents token reuse.

## Admin Panel

- Production build loads with `VITE_API_URL`.
- Admin login fails if backend admin env is missing or password is wrong.
- Dashboard stats load.
- Partner approval/rejection works.
- Delivery partner verification/rejection works.
- Order list and detail pages load.
- Admin status updates use only backend-supported order statuses.
- Unauthorized/expired token redirects to login.

## Backend

- `/health` works without exposing secrets.
- `/legal/privacy`, `/legal/terms`, and `/legal/delete-account` are publicly reachable.
- Production rejects wildcard CORS and only accepts configured origins.
- Admin password login requires `ADMIN_PANEL_PHONE` and `ADMIN_PANEL_PASSWORD`.
- Razorpay create, verify, and webhook flows are signature-verified.
- Upload deletion rejects public IDs outside the authenticated user's upload folder.
- Account deletion anonymizes user data and invalidates active sessions.
