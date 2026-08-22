// apps/customer-app/src/components/CustomAlert.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
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

const HARSH_TITLES = new Set([
  "error",
  "failed",
  "payment failed",
  "order failed",
  "pricing error",
  "address error",
  "location save failed"
]);

const KEEP_AS_IS_PREFIXES = ["delete", "logout", "clear cart", "remove item", "cancel order"];

const sentenceCase = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
};

const isConfirmationAlert = (title: string, buttons?: Array<{ style?: string }>) => {
  const lower = title.toLowerCase();
  if (buttons && buttons.length > 1) return true;
  return KEEP_AS_IS_PREFIXES.some((prefix) => lower.startsWith(prefix)) || lower.includes("are you sure");
};

const isSuccessAlert = (title: string, message: string) => {
  const combined = `${title} ${message}`.toLowerCase();
  return (
    combined.includes("success") ||
    combined.includes(" saved") ||
    combined.includes("thank you") ||
    combined.includes("fresh otp sent") ||
    combined.includes("order cancelled") ||
    combined.includes("cart cleared")
  );
};

/** Rewrites harsh production alerts into friendly copy like "Oops, name is required". */
export const normalizeFriendlyAlert = (titleVal: string, msgVal?: string) => {
  const rawTitle = (titleVal || "").trim();
  const rawMessage = (msgVal || "").trim();
  const lowerTitle = rawTitle.toLowerCase();

  if (!rawTitle && rawMessage) {
    return { title: `Oops, ${sentenceCase(rawMessage)}`, message: "", friendly: true };
  }

  if (isSuccessAlert(rawTitle, rawMessage)) {
    return { title: rawTitle, message: rawMessage, friendly: false };
  }

  if (HARSH_TITLES.has(lowerTitle)) {
    const body = rawMessage || rawTitle;
    return { title: `Oops, ${sentenceCase(body)}`, message: "", friendly: true };
  }

  if (
    lowerTitle.includes("failed") ||
    lowerTitle.includes("not found") ||
    lowerTitle.endsWith(" error") ||
    lowerTitle === "address required" ||
    lowerTitle === "cart empty" ||
    lowerTitle === "review" ||
    lowerTitle === "ratings" ||
    lowerTitle === "select a reason" ||
    lowerTitle === "add a reason" ||
    lowerTitle === "sign in required"
  ) {
    const body = rawMessage || rawTitle;
    return { title: `Oops, ${sentenceCase(body)}`, message: "", friendly: true };
  }

  if (!rawMessage && (lowerTitle.includes("required") || lowerTitle.startsWith("please "))) {
    return { title: `Oops, ${sentenceCase(rawTitle)}`, message: "", friendly: true };
  }

  if (rawMessage && (lowerTitle === "error" || lowerTitle.includes("issue") || lowerTitle.includes("support"))) {
    return { title: `Oops, ${sentenceCase(rawMessage)}`, message: "", friendly: true };
  }

  return { title: rawTitle, message: rawMessage, friendly: false };
};

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

type AlertType = "info" | "success" | "warning" | "confirm" | "destructive";

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
      const hasDestructive = btnVal?.some((b) => b.style === "destructive") || false;
      const hasMultipleButtons = (btnVal?.length || 0) > 1;
      const normalized = normalizeFriendlyAlert(titleVal, msgVal);
      const displayTitle = normalized.title;
      const displayMessage = normalized.message;
      const lowerTitle = displayTitle.toLowerCase();
      const lowerMsg = displayMessage.toLowerCase();

      let alertType: AlertType = "info";
      if (isConfirmationAlert(titleVal, btnVal)) {
        if (lowerTitle.includes("delete") || lowerTitle.includes("remove") || lowerTitle.includes("logout") || hasDestructive) {
          alertType = "destructive";
        } else {
          alertType = "confirm";
        }
      } else if (isSuccessAlert(displayTitle, displayMessage)) {
        alertType = "success";
      } else if (normalized.friendly || lowerTitle.startsWith("oops")) {
        alertType = "warning";
      } else if (lowerTitle.includes("warning") || lowerMsg.includes("warning")) {
        alertType = "warning";
      } else if (lowerTitle.includes("allow location") || lowerTitle.includes("turn on location")) {
        alertType = "info";
      }

      setTitle(displayTitle);
      setMessage(displayMessage);
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
  let iconColor = "#e23744";
  let iconBg = "#FFF2EC";

  switch (type) {
    case "success":
      iconName = "check-circle-outline";
      iconColor = "#1c9b55";
      iconBg = "#EBF8EE";
      break;
    case "destructive":
      iconName = "delete-outline";
      iconColor = "#C7362E";
      iconBg = "#FDEAEA";
      break;
    case "warning":
      iconName = "alert-circle-outline";
      iconColor = "#D98416";
      iconBg = "#FFF5E6";
      break;
    case "confirm":
      iconName = "help-circle-outline";
      iconColor = "#e23744";
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

              let btnBg = "#e23744";
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
    fontSize: 17,
    fontWeight: "800",
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
