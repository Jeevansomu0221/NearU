const rawOfficialSiteUrl =
  process.env.EXPO_PUBLIC_VYAHA_OFFICIAL_URL?.trim() || "https://www.vyaha.com";

export const OFFICIAL_SITE_URL = rawOfficialSiteUrl.replace(/\/$/, "");

export const buildLegalUrl = (path: "terms" | "privacy" | "delete-account" | "delivery-policy") =>
  `${OFFICIAL_SITE_URL}/${path}`;
