import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import api from "../api/client";

export default function JobsScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<any[]>([]);

  const loadJobs = async () => {
    const res: any = await api.get("/orders/my");
    setJobs(res.data);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={{
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#ddd"
      }}
      onPress={() => navigation.navigate("JobDetails", { order: item })}
    >
      <Text style={{ fontWeight: "600" }}>Order #{item._id.slice(-6)}</Text>
      <Text>Status: {item.status}</Text>
      <Text>Address: {item.deliveryAddress}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={jobs}
        keyExtractor={item => item._id}
        renderItem={renderItem}
      />
    </View>
  );
}
