import { Response } from "express";
import User from "../models/User.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";
import { NotificationApp } from "../services/notification.service";

const VALID_APPS = new Set<NotificationApp>(["customer", "partner", "delivery"]);
const VALID_PLATFORMS = new Set(["ios", "android", "web", "unknown"]);

const normalizeApp = (value: unknown): NotificationApp | null => {
  const app = String(value || "").trim().toLowerCase() as NotificationApp;
  return VALID_APPS.has(app) ? app : null;
};

const normalizePlatform = (value: unknown) => {
  const platform = String(value || "").trim().toLowerCase();
  return VALID_PLATFORMS.has(platform) ? platform : "unknown";
};

export const registerNotificationToken = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const app = normalizeApp(req.body?.app);
    const platform = normalizePlatform(req.body?.platform);
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : "";

    if (!token) {
      return errorResponse(res, "Notification token is required", 400);
    }

    if (!app) {
      return errorResponse(res, "Valid app is required", 400);
    }

    await User.updateMany(
      { "notificationTokens.token": token },
      { $pull: { notificationTokens: { token } } }
    );

    await User.findByIdAndUpdate(req.user.id, {
      $set: { fcmToken: token },
      $push: {
        notificationTokens: {
          token,
          app,
          platform,
          deviceId,
          enabled: true,
          lastSeenAt: new Date(),
          disabledAt: undefined
        }
      }
    });

    return successResponse(res, { app, platform }, "Notification token registered");
  } catch (error) {
    console.error("registerNotificationToken error:", error);
    return errorResponse(res, "Failed to register notification token");
  }
};

export const unregisterNotificationToken = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const app = normalizeApp(req.body?.app);
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : "";

    if (!token && !app && !deviceId) {
      return errorResponse(res, "Token, app, or deviceId is required", 400);
    }

    const pullFilter: Record<string, unknown> = {};
    if (token) pullFilter.token = token;
    if (app) pullFilter.app = app;
    if (deviceId) pullFilter.deviceId = deviceId;

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { notificationTokens: pullFilter },
      ...(token ? { $unset: { fcmToken: "" } } : {})
    });

    return successResponse(res, null, "Notification token unregistered");
  } catch (error) {
    console.error("unregisterNotificationToken error:", error);
    return errorResponse(res, "Failed to unregister notification token");
  }
};
