/** Sidebar navigation for legal and policy pages (Zomato-style hub). */
export const policyNavSections = [
  {
    id: 'general',
    title: 'General',
    items: [
      { pageType: 'policies', path: '/policies', label: 'Guidelines and Policies' },
      { pageType: 'privacy', path: '/privacy', label: 'Privacy Policy' },
      { pageType: 'terms', path: '/terms', label: 'Terms of Service' },
      { pageType: 'apiPolicy', path: '/api-policy', label: 'API Policy' },
      { pageType: 'csr', path: '/corporate-social-responsibility', label: 'CSR' },
      { pageType: 'license', path: '/license', label: 'License and Registration' },
      { pageType: 'security', path: '/security', label: 'Security' },
    ],
  },
  {
    id: 'user-policies',
    title: 'User Policies',
    items: [
      { pageType: 'refunds', path: '/refunds', label: 'Cancellation and Refunds' },
      { pageType: 'community', path: '/community-guidelines', label: 'Community Guidelines' },
      { pageType: 'acceptableUse', path: '/acceptable-use', label: 'Acceptable Use' },
      { pageType: 'paymentTerms', path: '/payment-terms', label: 'Payment Terms' },
      { pageType: 'cookie', path: '/cookie-policy', label: 'Cookie Policy' },
      { pageType: 'dataRetention', path: '/data-retention', label: 'Data Retention' },
      { pageType: 'marketingConsent', path: '/marketing-consent', label: 'Marketing and Communications' },
      { pageType: 'deleteAccount', path: '/delete-account', label: 'Delete Account' },
    ],
  },
  {
    id: 'partners',
    title: 'For Partners',
    items: [
      { pageType: 'partnerPolicy', path: '/partner-policy', label: 'Restaurant Partner Policy' },
      { pageType: 'deliveryPolicy', path: '/delivery-policy', label: 'Delivery Partner Policy' },
      { pageType: 'kycVerification', path: '/kyc-verification', label: 'KYC and Verification' },
      { pageType: 'restaurants', path: '/restaurants', label: 'Partner With Us' },
      { pageType: 'delivery', path: '/delivery', label: 'Become a Delivery Partner' },
    ],
  },
  {
    id: 'help',
    title: 'Help',
    items: [
      { pageType: 'support', path: '/support', label: 'Help and Support' },
      { pageType: 'fraud', path: '/fraud', label: 'Report Fraud' },
      { pageType: 'about', path: '/about', label: 'About Vyaha' },
      { pageType: 'apps', path: '/apps', label: 'Apps For You' },
      { pageType: 'partner', path: '/partner', label: 'Work With Us' },
      { pageType: 'consulting', path: '/consulting', label: 'Restaurant Consulting' },
      { pageType: 'blog', path: '/blog', label: 'Blog' },
    ],
  },
];

export const allPolicyNavItems = policyNavSections.flatMap((section) => section.items);

export function findNavItemByPageType(pageType) {
  return allPolicyNavItems.find((item) => item.pageType === pageType);
}
