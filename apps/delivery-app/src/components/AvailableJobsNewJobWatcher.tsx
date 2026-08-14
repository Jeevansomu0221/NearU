import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { acceptJob, DeliveryJob, getAvailableJobs, getMyDeliveryOrders } from "../api/delivery.api";
import {
  detectNewAvailableJobIds,
  isAvailableJobsTabFocused,
  subscribeAvailableJobsFocus
} from "../services/availableJobsRegistry";
import { subscribeNewJobAlertRefresh } from "../services/newJobAlertRefresh";
import NewJobBanner from "./NewJobBanner";

export default function AvailableJobsNewJobWatcher() {
  const navigation = useNavigation<any>();
  const [newJobAlert, setNewJobAlert] = useState<DeliveryJob | null>(null);
  const rejectedJobIds = useRef<Set<string>>(new Set());
  const pollInFlight = useRef(false);

  const checkForNewJobs = useCallback(async () => {
    if (isAvailableJobsTabFocused() || pollInFlight.current) return;

    pollInFlight.current = true;
    try {
      const response = await getAvailableJobs();
      if (!response.success || !response.data) return;

      const visibleJobs = response.data.filter((job) => !rejectedJobIds.current.has(job._id));
      const newlyAddedIds = detectNewAvailableJobIds(visibleJobs.map((job) => job._id));
      if (newlyAddedIds.length > 0 && !isAvailableJobsTabFocused()) {
        const nextJob = visibleJobs.find((job) => job._id === newlyAddedIds[0]);
        if (nextJob) {
          setNewJobAlert(nextJob);
        }
      }
    } catch {
      // silent
    } finally {
      pollInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void checkForNewJobs();
    const intervalId = setInterval(() => {
      void checkForNewJobs();
    }, 10000);

    return subscribeNewJobAlertRefresh(() => {
      void checkForNewJobs();
    });
  }, [checkForNewJobs]);

  useEffect(() => {
    return subscribeAvailableJobsFocus((focused) => {
      if (focused) {
        setNewJobAlert(null);
      }
    });
  }, []);

  const handleDismiss = () => {
    setNewJobAlert(null);
  };

  const handleOpen = () => {
    if (!newJobAlert) return;
    const job = newJobAlert;
    setNewJobAlert(null);
    navigation.getParent()?.navigate("JobDetails", { orderId: job._id, job });
  };

  const handleAccept = async () => {
    if (!newJobAlert) return;
    const job = newJobAlert;
    setNewJobAlert(null);
    const response = await acceptJob(job._id);
    if (response.success) {
      navigation.getParent()?.navigate("JobDetails", { orderId: job._id, job: response.data || job });
      return;
    }

    const message = String(response.message || "").toLowerCase();
    if (response.errors?.code === "ACTIVE_DELIVERY_EXISTS" || message.includes("current delivery")) {
      const activeOrderId = response.errors?.activeOrderId;
      const myOrdersResponse = await getMyDeliveryOrders();
      const activeOrder = myOrdersResponse.success
        ? myOrdersResponse.data?.find((order) => order._id === activeOrderId) ||
          myOrdersResponse.data?.find((order) => ["ASSIGNED", "PICKED_UP"].includes(order.status))
        : null;
      Alert.alert(
        "Finish current delivery",
        "Complete your active delivery before accepting another job.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: activeOrder ? "Continue Delivery" : "Open My Jobs",
            onPress: () => {
              if (activeOrder) {
                navigation.getParent()?.navigate("JobDetails", { orderId: activeOrder._id, job: activeOrder });
                return;
              }
              navigation.navigate("MyJobs", activeOrderId ? { highlightOrderId: activeOrderId } : undefined);
            }
          }
        ]
      );
      return;
    }

    Alert.alert("Could not accept job", response.message || "Please try again.");
  };

  return (
    <NewJobBanner
      visible={Boolean(newJobAlert) && !isAvailableJobsTabFocused()}
      job={newJobAlert}
      onOpen={handleOpen}
      onAccept={handleAccept}
      onDismiss={handleDismiss}
    />
  );
}
