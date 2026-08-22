import React from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "../theme/colors";

type Props = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  backgroundColor?: string;
};

export default function ScreenHeader({
  title,
  showBack = true,
  onBack,
  backgroundColor = colors.canvas
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
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
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
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
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
    backgroundColor: colors.canvas
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
    color: colors.text
  },
  titleSolo: {
    paddingHorizontal: 6
  }
});
