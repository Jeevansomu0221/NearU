// apps/partner-app/src/screens/WelcomeApprovedScreen.tsx
import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  SafeAreaView,
  ScrollView 
} from "react-native";

export default function WelcomeApprovedScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          {/* Celebration emoji instead of image to avoid file issues */}
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>🎉</Text>
          </View>
          
          <Text style={styles.title}>Congratulations!</Text>
          <Text style={styles.subtitle}>Your shop has been approved!</Text>
          
          <Text style={styles.message}>
            Now you can set up your menu, manage products, and start receiving orders.
          </Text>
          
          <View style={styles.stepsCard}>
            <Text style={styles.stepTitle}>Next Steps:</Text>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.step}>Set up your menu with prices</Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.step}>Add product images</Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.step}>Set shop opening hours</Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.step}>Start receiving orders!</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Menu")}
          >
            <Text style={styles.primaryButtonText}>Setup Menu Now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Dashboard")}
          >
            <Text style={styles.secondaryButtonText}>
              Go to Dashboard
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.note}>
            Tip: Complete your menu setup first to start receiving orders from customers.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff"
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
  },
  emojiContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25
  },
  emoji: {
    fontSize: 60
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#4CAF50",
    textAlign: "center"
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    color: "#333",
    textAlign: "center"
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
    lineHeight: 24,
    paddingHorizontal: 10
  },
  stepsCard: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e9ecef"
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333"
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
    marginRight: 10,
    minWidth: 20
  },
  step: {
    fontSize: 15,
    color: "#555",
    flex: 1,
    lineHeight: 22
  },
  primaryButton: {
    backgroundColor: "#2196F3",
    padding: 18,
    borderRadius: 10,
    width: "100%",
    marginBottom: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold"
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#2196F3",
    padding: 18,
    borderRadius: 10,
    width: "100%",
    marginBottom: 20,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#2196F3",
    fontSize: 18,
    fontWeight: "bold"
  },
  note: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 10,
    lineHeight: 20
  }
});