import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";
import NewOrderBanner from "./NewOrderBanner";

type PartnerOrder = {
  _id: string;
  status: string;
  grandTotal?: number;
  items?: Array<{
    name?: string;
    quantity?: number;
  }>;
};

type QuickOrderStatus = "ACCEPTED" | "REJECTED";
type DetailStatusOverride = QuickOrderStatus | "CANCELLED";

type Props = {
  navigationRef: any;
};

const POLL_INTERVAL_MS = 10000;
const PARTNER_ORDER_ROUTES = new Set(["Dashboard", "Orders", "OrderDetails", "Menu", "Profile", "Settings", "WelcomeApproved"]);

const isAwaitingPartnerAction = (status: string) => status === "CONFIRMED";

export default function PartnerOrderWatcher({ navigationRef }: Props) {
  const [newOrderAlert, setNewOrderAlert] = useState<PartnerOrder | null>(null);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const latestAlertId = useRef<string | null>(null);

  useEffect(() => {
    latestAlertId.current = newOrderAlert?._id || null;
  }, [newOrderAlert]);

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

    const token = await AsyncStorage.getItem("token");
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

  useEffect(() => {
    const unsubscribe = navigationRef?.addListener?.("state", loadPendingOrders);
    return () => unsubscribe?.();
  }, [loadPendingOrders, navigationRef]);

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
    async (status: QuickOrderStatus) => {
      if (!newOrderAlert) return;

      const orderId = newOrderAlert._id;

      try {
        const res = await api.post(`/orders/partner/${orderId}/status`, { status });
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
      .map((item) => ({ name: item.name || "", quantity: item.quantity || 1 })) || [];

  return (
    <NewOrderBanner
      visible={Boolean(newOrderAlert)}
      orderId={newOrderAlert?._id || ""}
      itemCount={itemCount}
      items={summaryItems}
      grandTotal={newOrderAlert?.grandTotal || 0}
      onOpen={openOrder}
      onAccept={() => updateOrderStatus("ACCEPTED")}
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
