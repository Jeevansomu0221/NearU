import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type AlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

let alertTrigger: ((title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => void) | null = null;

export const initCustomAlert = () => {
  Alert.alert = (title, message, buttons, options) => {
    if (alertTrigger) {
      alertTrigger(title, message, buttons, options);
      return;
    }

    console.warn("Custom alert not initialized yet.");
  };
};

const getAlertTheme = (title: string, message: string, buttons: AlertButton[]) => {
  const lowerTitle = title.toLowerCase();
  const lowerMessage = message.toLowerCase();
  const hasDestructive = buttons.some((button) => button.style === "destructive");

  if (lowerTitle.includes("error") || lowerTitle.includes("failed") || lowerMessage.includes("error") || lowerMessage.includes("failed")) {
    return {
      icon: "alert-circle-outline" as const,
      iconBg: "#FEE4E2",
      iconColor: "#D92D20",
      accent: "#D92D20"
    };
  }

  if (lowerTitle.includes("success") || lowerTitle.includes("saved") || lowerTitle.includes("submitted") || lowerMessage.includes("saved")) {
    return {
      icon: "checkmark-circle-outline" as const,
      iconBg: "#ECFDF3",
      iconColor: "#039855",
      accent: "#039855"
    };
  }

  if (hasDestructive || lowerTitle.includes("delete") || lowerTitle.includes("remove") || lowerTitle.includes("logout")) {
    return {
      icon: "trash-outline" as const,
      iconBg: "#FEE4E2",
      iconColor: "#D92D20",
      accent: "#D92D20"
    };
  }

  if (lowerTitle.includes("warning") || lowerMessage.includes("warning")) {
    return {
      icon: "warning-outline" as const,
      iconBg: "#FFF4D6",
      iconColor: "#B54708",
      accent: "#B54708"
    };
  }

  if (buttons.length > 1 || lowerTitle.includes("confirm") || lowerTitle.includes("sure")) {
    return {
      icon: "help-circle-outline" as const,
      iconBg: "#FFF1E8",
      iconColor: "#C2410C",
      accent: "#C2410C"
    };
  }

  return {
    icon: "information-circle-outline" as const,
    iconBg: "#FFF1E8",
    iconColor: "#C2410C",
    accent: "#C2410C"
  };
};

export default function CustomAlert() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buttons, setButtons] = useState<AlertButton[]>([]);
  const [options, setOptions] = useState<AlertOptions>({});
  const [accent, setAccent] = useState("#C2410C");
  const [iconName, setIconName] = useState<keyof typeof Ionicons.glyphMap>("information-circle-outline");
  const scale = useRef(new Animated.Value(0.92)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    alertTrigger = (titleValue, messageValue, buttonsValue, optionsValue) => {
      const safeButtons = buttonsValue && buttonsValue.length > 0 ? buttonsValue : [{ text: "OK", onPress: () => {} }];
      const theme = getAlertTheme(titleValue || "", messageValue || "", safeButtons);

      setTitle(titleValue);
      setMessage(messageValue || "");
      setButtons(safeButtons);
      setOptions(optionsValue || {});
      setAccent(theme.accent);
      setIconName(theme.icon);
      setVisible(true);

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true
        })
      ]).start();
    };

    const backAction = () => {
      if (!visible) return false;
      if (options.cancelable) {
        close(options.onDismiss);
      }
      return true;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => {
      alertTrigger = null;
      subscription.remove();
    };
  }, [fade, options, scale, visible]);

  const close = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 140,
        useNativeDriver: true
      }),
      Animated.timing(fade, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true
      })
    ]).start(() => {
      setVisible(false);
      callback?.();
    });
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => options.cancelable && close(options.onDismiss)}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]} />
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}14` }]}>
            <Ionicons name={iconName} size={30} color={accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.buttonRow, buttons.length === 1 && styles.buttonRowSingle]}>
            {buttons.map((button, index) => {
              const isCancel = button.style === "cancel" || (button.text || "").toLowerCase() === "cancel";
              const isDestructive = button.style === "destructive";
              const backgroundColor = isCancel ? "#F2F4F7" : isDestructive ? "#D92D20" : accent;
              const textColor = isCancel ? "#344054" : "#FFFFFF";

              return (
                <TouchableOpacity
                  key={`${button.text || "button"}-${index}`}
                  style={[
                    styles.button,
                    buttons.length > 1 ? styles.buttonFlex : styles.buttonSingle,
                    { backgroundColor }
                  ]}
                  activeOpacity={0.85}
                  onPress={() => close(button.onPress)}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>{button.text || "OK"}</Text>
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
    padding: 22
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 24, 40, 0.45)"
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: "center",
    shadowColor: "#101828",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: "#101828",
    textAlign: "center"
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#475467",
    textAlign: "center"
  },
  buttonRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 20
  },
  buttonRowSingle: {
    justifyContent: "center"
  },
  buttonFlex: {
    flex: 1
  },
  buttonSingle: {
    minWidth: 120
  },
  button: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "800"
  }
});
