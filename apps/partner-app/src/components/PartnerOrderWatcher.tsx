import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { getAccessToken } from "../utils/authStorage";
import { getStoredPartnerUser, isStaffActor } from "../utils/partnerActor";
import api from "../api/client";
import NewOrderBanner from "./NewOrderBanner";

type PartnerOrder = {
  _id: string;
  status: string;
  grandTotal?: number;
  items?: Array<{
    name?: string;
    quantity?: number;
    cookingRequest?: string;
  }>;
};

type QuickOrderStatus = "ACCEPTED" | "REJECTED";
type DetailStatusOverride = QuickOrderStatus | "CANCELLED";

type Props = {
  navigationRef: any;
};

const POLL_INTERVAL_MS = 10000;
const DEFAULT_PREP_TIME_MINUTES = 10;
const PARTNER_ORDER_ROUTES = new Set(["Dashboard", "Orders", "OrderDetails", "Menu", "Profile", "Settings", "WelcomeApproved"]);

const isAwaitingPartnerAction = (status: string) => status === "CONFIRMED";

export default function PartnerOrderWatcher({ navigationRef }: Props) {
  const [newOrderAlert, setNewOrderAlert] = useState<PartnerOrder | null>(null);
  const [defaultPrepTimeMinutes, setDefaultPrepTimeMinutes] = useState(DEFAULT_PREP_TIME_MINUTES);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const latestAlertId = useRef<string | null>(null);

  useEffect(() => {
    latestAlertId.current = newOrderAlert?._id || null;
  }, [newOrderAlert]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [res, actor] = await Promise.all([
          api.get("/partners/profile"),
          getStoredPartnerUser()
        ]);
        const data = res.data?.data;
        const estimated = Number(data?.settings?.estimatedPrepTime);
        if (!cancelled && Number.isFinite(estimated) && estimated > 0) {
          setDefaultPrepTimeMinutes(Math.round(estimated));
        }
        if (!cancelled) {
          const isStaff = isStaffActor(actor);
          const ownerAlertsOff = !isStaff && data?.notifications?.newOrderAlerts === false;
          setAlertsEnabled(!ownerAlertsOff);
        }
      } catch {
        // Keep defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isPartnerOrderRouteActive = useCallback(() => {
    if (!navigationRef?.isReady?.()) return false;

    const routeName = navigationRef.getCurrentRoute?.()?.name;
    return Boolean(routeName && PARTNER_ORDER_ROUTES.has(routeName));
  }, [navigationRef]);

  const loadPendingOrders = useCallback(async () => {
    if (!isPartnerOrderRouteActive()) {
      setNewOrderAlert(null);
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setNewOrderAlert(null);
      return;
    }

    try {
      const res = await api.get("/orders/partner/my");
      const response = res.data as { success: boolean; data?: PartnerOrder[] };
      if (!response.success || !Array.isArray(response.data)) return;

      const incomingOrders = response.data;
      const actionable = incomingOrders.filter((order) => isAwaitingPartnerAction(order.status));
      const newlyActionable = actionable.filter(
        (order) => !knownOrderIds.current.has(order._id) && order._id !== latestAlertId.current
      );

      knownOrderIds.current = new Set(incomingOrders.map((order) => order._id));

      setNewOrderAlert((current) => {
        if (current && !actionable.some((order) => order._id === current._id)) {
          return null;
        }
        return newlyActionable[0] || current;
      });
    } catch (error) {
      console.log("Failed to poll partner orders", error);
    }
  }, [isPartnerOrderRouteActive]);

  useEffect(() => {
    loadPendingOrders();
    const interval = setInterval(loadPendingOrders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadPendingOrders]);

  const refreshAlertsSetting = useCallback(async () => {
    try {
      const [res, actor] = await Promise.all([
        api.get("/partners/profile"),
        getStoredPartnerUser()
      ]);
      const isStaff = isStaffActor(actor);
      const ownerAlertsOff = !isStaff && res.data?.data?.notifications?.newOrderAlerts === false;
      setAlertsEnabled(!ownerAlertsOff);
    } catch {
      // Keep current value.
    }
  }, []);

  useEffect(() => {
    const onStateChange = () => {
      loadPendingOrders();
      refreshAlertsSetting();
    };
    const unsubscribe = navigationRef?.addListener?.("state", onStateChange);
    return () => unsubscribe?.();
  }, [loadPendingOrders, refreshAlertsSetting, navigationRef]);

  const dismissAlert = useCallback(() => {
    setNewOrderAlert(null);
  }, []);

  const openOrder = useCallback(() => {
    if (!newOrderAlert) return;

    const orderId = newOrderAlert._id;
    setNewOrderAlert(null);
    navigationRef?.navigate?.("OrderDetails", { orderId });
  }, [navigationRef, newOrderAlert]);

  const updateOrderStatus = useCallback(
    async (status: QuickOrderStatus, prepTimeMinutes?: number) => {
      if (!newOrderAlert) return;

      const orderId = newOrderAlert._id;

      try {
        const payload: { status: QuickOrderStatus; prepTimeMinutes?: number } = { status };
        if (status === "ACCEPTED" && typeof prepTimeMinutes === "number") {
          payload.prepTimeMinutes = prepTimeMinutes;
        }

        const res = await api.post(`/orders/partner/${orderId}/status`, payload);
        const response = res.data as { success: boolean; message?: string; data?: PartnerOrder };
        if (!response.success) {
          Alert.alert("Order update failed", response.message || "Please try again.");
          return;
        }

        knownOrderIds.current.add(orderId);
        setNewOrderAlert(null);
        await loadPendingOrders();

        const detailStatus: DetailStatusOverride =
          status === "REJECTED" || response.data?.status === "CANCELLED" ? "CANCELLED" : "ACCEPTED";

        navigationRef?.navigate?.("OrderDetails", {
          orderId,
          orderStatus: detailStatus,
          orderStatusUpdatedAt: Date.now()
        });
      } catch (error: any) {
        const message = error.response?.data?.message || "Please try again.";
        if (status === "REJECTED" && String(message).includes("CANCELLED")) {
          knownOrderIds.current.add(orderId);
          setNewOrderAlert(null);
          await loadPendingOrders();
          navigationRef?.navigate?.("OrderDetails", {
            orderId,
            orderStatus: "CANCELLED",
            orderStatusUpdatedAt: Date.now()
          });
          return;
        }

        Alert.alert("Order update failed", message);
      }
    },
    [loadPendingOrders, navigationRef, newOrderAlert]
  );

  const itemCount = newOrderAlert?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  const summaryItems =
    newOrderAlert?.items
      ?.filter((item) => item.name)
      .slice(0, 4)
      .map((item) => ({
        name: item.name || "",
        quantity: item.quantity || 1,
        cookingRequest: item.cookingRequest || ""
      })) || [];

  return (
    <NewOrderBanner
      visible={Boolean(newOrderAlert) && alertsEnabled}
      orderId={newOrderAlert?._id || ""}
      itemCount={itemCount}
      items={summaryItems}
      grandTotal={newOrderAlert?.grandTotal || 0}
      defaultPrepTimeMinutes={defaultPrepTimeMinutes}
      onOpen={openOrder}
      onAccept={(prepTimeMinutes) => updateOrderStatus("ACCEPTED", prepTimeMinutes)}
      onReject={() => {
        Alert.alert(
          "Reject order?",
          "Are you sure you want to reject this order? The customer will see it as cancelled.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Reject Order", style: "destructive", onPress: () => updateOrderStatus("REJECTED") }
          ]
        );
      }}
      onDismiss={dismissAlert}
    />
  );
}
