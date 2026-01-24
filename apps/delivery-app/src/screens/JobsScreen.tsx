import { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import api from "../api/client";

type DeliveryJobResponse = {
  jobId?: string;
  status?: string;
  customer?: {
    name: string;
    phone: string;
    address: string;
  };
  pickups?: any[];
};

export default function JobsScreen({ navigation }: any) {
  const [job, setJob] = useState<DeliveryJobResponse | null>(null);

  const loadJob = async () => {
    const res = await api.get<DeliveryJobResponse>("/delivery/jobs");

    if (res.data.jobId) {
      setJob(res.data);
    } else {
      setJob(null);
    }
  };

  useEffect(() => {
    loadJob();
  }, []);

  if (!job) {
    return (
      <View style={styles.center}>
        <Text>No active delivery jobs</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Delivery</Text>

      <Text>Status: {job.status}</Text>
      <Text>Customer: {job.customer?.name}</Text>
      <Text>Phone: {job.customer?.phone}</Text>
      <Text>Address: {job.customer?.address}</Text>

      <Button
        title="View Job Details"
        onPress={() => navigation.navigate("JobDetails", { job })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 10 }
});
