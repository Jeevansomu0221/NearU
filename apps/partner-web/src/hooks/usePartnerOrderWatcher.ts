import { useEffect, useRef } from "react";
import { getPartnerOrders, updatePartnerOrderStatus } from "@vyaha/api-client";

export function usePartnerOrderWatcher(enabled: boolean) {
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const res = await getPartnerOrders();
        const orders = res.data || [];
        for (const order of orders) {
          if (order.status === "CONFIRMED" && !seen.current.has(order._id)) {
            seen.current.add(order._id);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("New Vyaha order", {
                body: `Order ${order._id.slice(-6)} needs your action`
              });
            }
          }
        }
      } catch {
        // ignore polling errors
      }
    };

    poll();
    const timer = setInterval(poll, 10000);
    return () => clearInterval(timer);
  }, [enabled]);
}

export async function acceptOrder(orderId: string) {
  return updatePartnerOrderStatus(orderId, "PREPARING");
}

export async function rejectOrder(orderId: string) {
  return updatePartnerOrderStatus(orderId, "REJECTED");
}
