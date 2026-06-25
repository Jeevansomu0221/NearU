export const effectiveDate = 'June 25, 2026';

export const businessName = 'Vyaha';
export const legalEntityName = 'Vyaha Technologies';
export const gstin = '36DABPC4787C1ZW';

export const registeredOffice = {
  line1: '302, Balaji Abode, Westend Colony',
  line2: 'Bandlaguda Jagir',
  city: 'Hyderabad',
  state: 'Telangana',
  pincode: '500091',
  country: 'India',
};

export const registeredOfficeFormatted = `${registeredOffice.line1}, ${registeredOffice.line2}, ${registeredOffice.city}, ${registeredOffice.state} ${registeredOffice.pincode}, ${registeredOffice.country}`;

export const operatingCountry = 'India';
export const serviceAreas = ['Hyderabad'];
export const serviceAreasFormatted = 'Hyderabad, Telangana';
export const governingLaw = 'laws of India';
export const websiteUrl = 'https://www.vyaha.com';
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
