import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "nearu-secret-key-change-in-production";
const JWT_EXPIRY = "7d";

export interface JwtPayload {
  userId: string;
  role: string;
  phone: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error("Invalid token");
  }
};