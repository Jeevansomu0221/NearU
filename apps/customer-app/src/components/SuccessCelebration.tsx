// apps/customer-app/src/components/SuccessCelebration.tsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Text } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CONFETTI_COLORS = [
  "#FF6B35",
  "#FFB08F",
  "#2B9C4A",
  "#7C3AED",
  "#FFEB3B",
  "#E91E63",
  "#00BCD4",
  "#4CAF50",
  "#FF5722"
];

function ConfettiPiece({ delay, color, xPos }: { delay: number; color: string; xPos: number }) {
  const animY = useRef(new Animated.Value(-60)).current;
  const animX = useRef(new Animated.Value(xPos)).current;
  const animRotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(Math.random() * 0.5 + 0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(animY, {
          toValue: SCREEN_HEIGHT + 60,
          duration: Math.random() * 2000 + 2000,
          useNativeDriver: true
        }),
        Animated.timing(animRotate, {
          toValue: 1,
          duration: Math.random() * 2000 + 2000,
          useNativeDriver: true
        }),
        Animated.sequence([
          Animated.timing(animX, {
            toValue: xPos + (Math.random() * 60 - 30),
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(animX, {
            toValue: xPos + (Math.random() * 60 - 30),
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ])
    ]).start();
  }, []);

  const rotateStr = animRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "720deg"]
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          backgroundColor: color,
          transform: [
            { translateY: animY },
            { translateX: animX },
            { rotate: rotateStr },
            { scale: scale }
          ]
        }
      ]}
    />
  );
}

export default function SuccessCelebration() {
  const checkScale = useRef(new Animated.Value(0.3)).current;
  const rippleScale = useRef(new Animated.Value(1)).current;
  const rippleOpacity = useRef(new Animated.Value(0.6)).current;

  const confettiArray = useRef(
    Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 800,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      xPos: Math.random() * SCREEN_WIDTH
    }))
  ).current;

  useEffect(() => {
    // Spring checkmark up
    Animated.spring(checkScale, {
      toValue: 1,
      tension: 60,
      friction: 6,
      useNativeDriver: true
    }).start();

    // Pulse loops
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rippleScale, {
            toValue: 2.2,
            duration: 1250,
            useNativeDriver: true
          }),
          Animated.timing(rippleOpacity, {
            toValue: 0,
            duration: 1250,
            useNativeDriver: true
          })
        ]),
        Animated.parallel([
          Animated.timing(rippleScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true
          }),
          Animated.timing(rippleOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true
          })
        ])
      ])
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      {confettiArray.map((c) => (
        <ConfettiPiece key={c.id} delay={c.delay} color={c.color} xPos={c.xPos} />
      ))}
      <View style={styles.celebrationWrapper}>
        <View style={styles.checkmarkOuter}>
          <Animated.View
            style={[
              styles.ripple,
              {
                transform: [{ scale: rippleScale }],
                opacity: rippleOpacity
              }
            ]}
          />
          <Animated.View style={[styles.checkmarkCircle, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkmarkSymbol}>✓</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  celebrationWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 10,
    width: "100%",
    height: 86
  },
  root: {
    width: "100%",
    height: 110,
    overflow: "visible"
  },
  checkmarkOuter: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  checkmarkCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#2B9C4A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: "#EAF8EE",
    shadowColor: "#2B9C4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 2
  },
  checkmarkSymbol: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 32
  },
  ripple: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(43, 156, 74, 0.22)",
    zIndex: 1
  },
  confetti: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 9999
  }
});
