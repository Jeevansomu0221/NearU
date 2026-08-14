import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { config } from "../config/env";

const defaultServiceAccountPath = path.resolve(__dirname, "../../config/firebase-service-account.json");

const parseServiceAccountJson = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Firebase service account JSON is empty");
  }

  const candidates = [
    trimmed,
    trimmed.replace(/^['"]|['"]$/g, ""),
    trimmed.replace(/\\n/g, "\n")
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new Error("Firebase service account JSON is invalid");
};

const loadServiceAccountFromFile = (serviceAccountPath: string) => {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: config.firebaseProjectId || serviceAccount.project_id
  });
};

const normalizePhone = (phone?: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

export const getFirebaseApp = () => {
  if (admin.apps.length) {
    return admin.app();
  }

  const serviceAccountPath = config.firebaseServiceAccountPath || defaultServiceAccountPath;

  if (fs.existsSync(serviceAccountPath)) {
    return loadServiceAccountFromFile(serviceAccountPath);
  }

  if (config.firebaseServiceAccountJson) {
    const serviceAccount = parseServiceAccountJson(config.firebaseServiceAccountJson);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: config.firebaseProjectId || serviceAccount.project_id
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: config.firebaseProjectId || undefined
  });
};

export const verifyFirebasePhoneToken = async (idToken: string, expectedPhone: string) => {
  getFirebaseApp();
  const decoded = await admin.auth().verifyIdToken(idToken);
  const tokenPhone = normalizePhone(decoded.phone_number);

  if (!tokenPhone || tokenPhone !== normalizePhone(expectedPhone)) {
    throw new Error("Firebase phone verification did not match this phone number");
  }

  return {
    uid: decoded.uid,
    phone: tokenPhone
  };
};
