export const effectiveDate = 'June 25, 2026';

export const businessName = 'Vyaha';
export const legalEntityName = 'Vyaha Technologies';
export const gstin = '36DABPC4787C1ZW';

export const registeredOffice = {
  line1: 'Bandlaguda Jagir',
  city: 'Hyderabad',
  state: 'Telangana',
};

export const registeredOfficeFormatted = `${registeredOffice.line1}, ${registeredOffice.city}, ${registeredOffice.state}`;

export const operatingCountry = 'India';
export const serviceAreas = ['Hyderabad'];
export const serviceAreasFormatted = 'Hyderabad, Telangana';
export const governingLaw = 'laws of India';
export const websiteUrl = 'https://www.vyaha.com';
/** Partner web onboarding — same flow as mobile app */
export const partnerOnboardingUrl = import.meta.env.DEV
  ? 'http://localhost:5175/business/login?mode=register'
  : '/business/login/?mode=register';

/** Official Android apps on Google Play */
export const playStoreBadgeUrl =
  'https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg';

export const playStoreApps = {
  customer: {
    id: 'com.vyaha.customer',
    name: 'Vyaha',
    label: 'Customer app',
    url: 'https://play.google.com/store/apps/details?id=com.vyaha.customer',
  },
  partner: {
    id: 'com.vyaha.partner',
    name: 'Vyaha Partner',
    label: 'Partner app',
    url: 'https://play.google.com/store/apps/details?id=com.vyaha.partner',
  },
  delivery: {
    id: 'com.vyaha.delivery',
    name: 'Vyaha Delivery',
    label: 'Delivery app',
    url: 'https://play.google.com/store/apps/details?id=com.vyaha.delivery',
  },
};

export const supportEmail = 'support@vyaha.com';
export const privacyEmail = 'privacy@vyaha.com';
export const securityEmail = 'security@vyaha.com';
export const reportEmail = 'report@vyaha.com';
export const grievanceEmail = 'grievance@vyaha.com';
export const apiEmail = 'api@vyaha.com';

export const legalEntity = {
  name: legalEntityName,
  country: operatingCountry,
  registeredOffice: registeredOfficeFormatted,
  website: websiteUrl,
  gstin,
};

export const grievanceOfficer = {
  name: 'Jeevan Somu',
  designation: 'Founder & CEO',
  email: grievanceEmail,
  phone: '+91 6300500275',
  responseWindow: '15 working days',
  acknowledgementWindow: '24 hours',
  postalAddress: `${legalEntityName}, ${registeredOfficeFormatted}`,
  officeHours: 'Monday to Friday, 9:00 am to 6:00 pm IST',
};

export const legalContacts = {
  support: supportEmail,
  privacy: privacyEmail,
  security: securityEmail,
  fraud: reportEmail,
  grievance: grievanceEmail,
  api: apiEmail,
};
