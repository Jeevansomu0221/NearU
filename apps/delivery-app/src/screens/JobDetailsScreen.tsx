import { View, Text, Button, StyleSheet } from "react-native";
import api from "../api/client";

export default function JobDetailsScreen({ route, navigation }: any) {
  const { job } = route.params;

  const markPicking = async () => {
    await api.post(`/delivery/jobs/${job.jobId}/picking`);
    navigation.goBack();
  };

  const markDelivered = async () => {
    await api.post(`/delivery/jobs/${job.jobId}/delivered`);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pickup Details</Text>

      {job.pickups?.length > 0 ? (
        job.pickups.map((p: any, index: number) => (
          <View key={index} style={styles.card}>
            <Text>Shop: {p.shopName}</Text>
            <Text>Address: {p.address}</Text>
            <Text>Phone: {p.phone}</Text>
          </View>
        ))
      ) : (
        <View style={styles.card}>
          <Text>No shop pickup</Text>
          <Text>Buy items as per order note</Text>
        </View>
      )}

      <Button title="Picked Up" onPress={markPicking} />
      <Button title="Delivered" onPress={markDelivered} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 18, marginBottom: 10 },
  card: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
    borderRadius: 6
  }
});
