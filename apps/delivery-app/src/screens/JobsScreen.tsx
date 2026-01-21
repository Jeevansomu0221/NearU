import React, { useEffect, useState } from "react";
import { View, Text, Button, Linking, Alert } from "react-native";
import { getMyJobs, markPicking, markDelivered } from "../api/delivery.api";

export default function JobsScreen() {
  const [job, setJob] = useState<any | null>(null);

  const load = async () => {
    try {
      const res = await getMyJobs();
      setJob((res.data as any) || null);
    } catch {
      Alert.alert("Error", "Failed to load jobs");
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (!job || job.message === "No active delivery jobs") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>No active delivery jobs</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontWeight: "600" }}>Customer</Text>
      <Text>{job.customer.name}</Text>
      <Text>{job.customer.phone}</Text>
      <Text>{job.customer.address}</Text>

      <Button
        title="Open Drop Location"
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              job.customer.address
            )}`
          )
        }
      />

      <Text style={{ marginTop: 20, fontWeight: "600" }}>Pickups</Text>
      {job.pickups.map((p: any, i: number) => (
        <View key={i} style={{ marginBottom: 10 }}>
          <Text>{p.shopName}</Text>
          <Text>{p.address}</Text>
          <Text>{p.phone}</Text>
        </View>
      ))}

      {job.status === "ASSIGNED" && (
        <Button title="Picked Up" onPress={() => markPicking(job.jobId)} />
      )}
      {job.status === "PICKING" && (
        <Button title="Delivered" onPress={() => markDelivered(job.jobId)} />
      )}
    </View>
  );
}
