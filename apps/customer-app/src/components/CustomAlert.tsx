// apps/customer-app/src/components/CustomAlert.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
  BackHandler
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Global pointer to trigger the custom alert modal
let alertTrigger: ((
  title: string,
  message?: string,
  buttons?: Array<{ text?: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }>,
  options?: { cancelable?: boolean; onDismiss?: () => void }
) => void) | null = null;

// Initialize custom alert override
export const initCustomAlert = () => {
  Alert.alert = (title, message, buttons, options) => {
    if (alertTrigger) {
      alertTrigger(title, message, buttons, options);
    } else {
      console.warn("CustomAlert not initialized yet.");
    }
  };
};

type AlertType = "info" | "success" | "error" | "warning" | "confirm" | "destructive";

export default function CustomAlert() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<AlertType>("info");
  const [buttons, setButtons] = useState<Array<{ text?: string; onPress?: () => void; style?: string }>>([]);
  const [options, setOptions] = useState<{ cancelable?: boolean; onDismiss?: () => void }>({});

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    alertTrigger = (titleVal, msgVal, btnVal, optsVal) => {
      const lowerTitle = (titleVal || "").toLowerCase();
      const lowerMsg = (msgVal || "").toLowerCase();
      const hasDestructive = btnVal?.some((b) => b.style === "destructive") || false;
      const hasMultipleButtons = (btnVal?.length || 0) > 1;

      let alertType: AlertType = "info";
      if (lowerTitle.includes("error") || lowerTitle.includes("failed") || lowerMsg.includes("error") || lowerMsg.includes("failed")) {
        alertType = "error";
      } else if (
        lowerTitle.includes("success") ||
        lowerTitle.includes("saved") ||
        lowerTitle.includes("complete") ||
        lowerTitle.includes("done") ||
        lowerMsg.includes("success") ||
        lowerMsg.includes("saved")
      ) {
        alertType = "success";
      } else if (lowerTitle.includes("delete") || lowerTitle.includes("remove") || lowerTitle.includes("logout") || hasDestructive) {
        alertType = "destructive";
      } else if (hasMultipleButtons || lowerTitle.includes("confirm") || lowerTitle.includes("sure")) {
        alertType = "confirm";
      } else if (lowerTitle.includes("warning") || lowerMsg.includes("warning")) {
        alertType = "warning";
      }

      setTitle(titleVal);
      setMessage(msgVal || "");
      setType(alertType);
      setOptions(optsVal || {});

      const finalButtons = btnVal && btnVal.length > 0 ? btnVal : [{ text: "OK", onPress: () => {} }];
      setButtons(finalButtons);

      setVisible(true);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 9,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    };

    const backAction = () => {
      if (visible) {
        if (options.cancelable) {
          handleClose(options.onDismiss);
        }
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => {
      alertTrigger = null;
      backHandler.remove();
    };
  }, [visible, options]);

  const handleClose = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  if (!visible) return null;

  // Icon and Color mapping
  let iconName: keyof typeof MaterialCommunityIcons.glyphMap = "information-outline";
  let iconColor = "#FF6B35";
  let iconBg = "#FFF2EC";

  switch (type) {
    case "success":
      iconName = "check-circle-outline";
      iconColor = "#2B9C4A";
      iconBg = "#EBF8EE";
      break;
    case "error":
      iconName = "close-circle-outline";
      iconColor = "#C7362E";
      iconBg = "#FDEAEA";
      break;
    case "destructive":
      iconName = "delete-outline";
      iconColor = "#C7362E";
      iconBg = "#FDEAEA";
      break;
    case "warning":
      iconName = "alert-outline";
      iconColor = "#D98416";
      iconBg = "#FFF5E6";
      break;
    case "confirm":
      iconName = "help-circle-outline";
      iconColor = "#FF6B35";
      iconBg = "#FFF2EC";
      break;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => options.cancelable && handleClose(options.onDismiss)}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={iconName} size={32} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.buttonsContainer, buttons.length > 2 && styles.buttonsStacked]}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === "cancel" || (btn.text || "").toLowerCase() === "cancel";
              const isDestructive = btn.style === "destructive" || type === "destructive";

              let btnBg = "#FF6B35";
              let textColor = "#FFFFFF";
              let borderColor = "transparent";
              let borderWidth = 0;

              if (isCancel) {
                btnBg = "#F2EBE1";
                textColor = "#5F5046";
              } else if (isDestructive) {
                btnBg = "#C7362E";
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.button,
                    { backgroundColor: btnBg, borderColor, borderWidth },
                    buttons.length > 2 ? styles.buttonStacked : styles.buttonFlex
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleClose(btn.onPress)}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>{btn.text || "OK"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(44, 32, 24, 0.45)"
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    shadowColor: "#2C2018",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2C2018",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: "#7A6F65",
    textAlign: "center",
    marginBottom: 20
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "center"
  },
  buttonsStacked: {
    flexDirection: "column",
    gap: 8
  },
  button: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  buttonFlex: {
    flex: 1
  },
  buttonStacked: {
    width: "100%"
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "800"
  }
});
