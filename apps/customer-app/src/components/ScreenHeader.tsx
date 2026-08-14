import React from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BackIcon = "chevron-left" | "home-outline";

type Props = {
  title: string;
  showBack?: boolean;
  backIcon?: BackIcon;
  onBack?: () => void;
  backgroundColor?: string;
};

export default function ScreenHeader({
  title,
  showBack = true,
  backIcon = "chevron-left",
  onBack,
  backgroundColor = "#F6F2EC"
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            style={styles.back}
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={backIcon === "home-outline" ? "Go home" : "Go back"}
          >
            <MaterialCommunityIcons
              name={backIcon}
              size={backIcon === "home-outline" ? 22 : 28}
              color="#2C2018"
            />
          </TouchableOpacity>
        ) : null}
        <Text style={[styles.title, !showBack && styles.titleSolo]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#F6F2EC"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    minHeight: 48
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 24,
    fontWeight: "800",
    color: "#2C2018"
  },
  titleSolo: {
    paddingHorizontal: 6
  }
});
