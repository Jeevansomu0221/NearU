import React from "react";
import { StyleSheet, View } from "react-native";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

type Props = {
  children: React.ReactNode;
  canvasColor?: string;
};

/** Keeps phone layouts readable on tablets instead of stretching edge-to-edge. */
export default function ResponsiveFrame({ children, canvasColor = "#E8DFD4" }: Props) {
  const { isTablet, contentMaxWidth } = useResponsiveLayout();

  if (!isTablet) {
    return <View style={styles.fill}>{children}</View>;
  }

  return (
    <View style={[styles.stage, { backgroundColor: canvasColor }]}>
      <View style={[styles.canvas, { width: contentMaxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1
  },
  stage: {
    flex: 1,
    alignItems: "center"
  },
  canvas: {
    flex: 1,
    maxWidth: 720,
    width: "100%",
    overflow: "hidden"
  }
});
