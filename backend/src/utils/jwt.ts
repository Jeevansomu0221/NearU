import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config/env";

export interface AccessTokenPayload {
  id: string;
  phone: string;
  role: string;
  name: string;
  partnerId?: string | null;
  deliveryPartnerId?: string | null;
  sessionVersion: number;
  type: "access";
}

export interface RefreshTokenPayload {
  id: string;
  sessionVersion: number;
  type: "refresh";
}

export const generateAccessToken = (payload: Omit<AccessTokenPayload, "type">): string =>
  jwt.sign({ ...payload, type: "access" }, config.jwtSecret, { expiresIn: config.jwtExpiry } as SignOptions);

export const generateRefreshToken = (payload: Omit<RefreshTokenPayload, "type">): string =>
  jwt.sign({ ...payload, type: "refresh" }, config.jwtSecret, { expiresIn: config.refreshJwtExpiry } as SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
  if (decoded.type !== "access") {
    throw new Error("Invalid access token");
  }
  return decoded;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, config.jwtSecret) as RefreshTokenPayload;
  if (decoded.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }
  return decoded;
};
