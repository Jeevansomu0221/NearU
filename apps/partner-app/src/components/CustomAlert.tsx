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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { partnerTheme } from "../theme";

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type AlertType = "info" | "success" | "error" | "warning" | "confirm" | "destructive";

let alertTrigger: ((title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean; onDismiss?: () => void }) => void) | null = null;

export default function CustomAlert() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<AlertType>("info");
  const [buttons, setButtons] = useState<AlertButton[]>([]);
  const [options, setOptions] = useState<{ cancelable?: boolean; onDismiss?: () => void }>({});
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    alertTrigger = (nextTitle, nextMessage, nextButtons, nextOptions) => {
      const lowerTitle = (nextTitle || "").toLowerCase();
      const lowerMessage = (nextMessage || "").toLowerCase();
      const hasDestructive = nextButtons?.some((button) => button.style === "destructive") || false;
      const hasMultipleButtons = (nextButtons?.length || 0) > 1;

      let nextType: AlertType = "info";
      if (
        lowerTitle.includes("error") ||
        lowerTitle.includes("failed") ||
        lowerMessage.includes("error") ||
        lowerMessage.includes("failed")
      ) {
        nextType = "error";
      } else if (
        lowerTitle.includes("success") ||
        lowerTitle.includes("saved") ||
        lowerTitle.includes("complete") ||
        lowerTitle.includes("done") ||
        lowerMessage.includes("success") ||
        lowerMessage.includes("saved")
      ) {
        nextType = "success";
      } else if (lowerTitle.includes("delete") || lowerTitle.includes("remove") || lowerTitle.includes("logout") || hasDestructive) {
        nextType = "destructive";
      } else if (hasMultipleButtons || lowerTitle.includes("confirm") || lowerTitle.includes("sure")) {
        nextType = "confirm";
      } else if (lowerTitle.includes("warning") || lowerMessage.includes("warning")) {
        nextType = "warning";
      }

      setTitle(nextTitle);
      setMessage(nextMessage || "");
      setType(nextType);
      setButtons(nextButtons && nextButtons.length > 0 ? nextButtons : [{ text: "OK", onPress: () => {} }]);
      setOptions(nextOptions || {});
      setVisible(true);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true
        })
      ]).start();
    };

    const backAction = () => {
      if (!visible) return false;
      if (options.cancelable) {
        handleClose(options.onDismiss);
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    Alert.alert = (title, message, buttons, options) => {
      if (alertTrigger) {
        alertTrigger(title, message, buttons, options);
      }
    };

    return () => {
      alertTrigger = null;
      backHandler.remove();
    };
  }, [visible, options]);

  const handleClose = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 140,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true
      })
    ]).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  if (!visible) return null;

  let iconName: keyof typeof MaterialCommunityIcons.glyphMap = "information-outline";
  let iconColor: string = partnerTheme.colors.primary;
  let iconBg: string = partnerTheme.colors.neutralSoft;

  switch (type) {
    case "success":
      iconName = "check-circle-outline";
      iconColor = partnerTheme.colors.success;
      iconBg = partnerTheme.colors.successSoft;
      break;
    case "error":
      iconName = "close-circle-outline";
      iconColor = partnerTheme.colors.danger;
      iconBg = partnerTheme.colors.dangerSoft;
      break;
    case "destructive":
      iconName = "delete-outline";
      iconColor = partnerTheme.colors.danger;
      iconBg = partnerTheme.colors.dangerSoft;
      break;
    case "warning":
      iconName = "alert-outline";
      iconColor = "#D98416";
      iconBg = "#FFF5E6";
      break;
    case "confirm":
      iconName = "help-circle-outline";
      iconColor = partnerTheme.colors.primary;
      iconBg = partnerTheme.colors.neutralSoft;
      break;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => options.cancelable && handleClose(options.onDismiss)}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={iconName} size={30} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.buttonsContainer, buttons.length > 2 && styles.buttonsStacked]}>
            {buttons.map((button, index) => {
              const isCancel = button.style === "cancel" || (button.text || "").toLowerCase() === "cancel";
              const isDestructive = button.style === "destructive" || type === "destructive";

              let buttonBg: string = partnerTheme.colors.primary;
              let textColor: string = partnerTheme.colors.card;

              if (isCancel) {
                buttonBg = partnerTheme.colors.neutralSoft;
                textColor = partnerTheme.colors.muted;
              } else if (isDestructive) {
                buttonBg = partnerTheme.colors.danger;
              }

              return (
                <TouchableOpacity
                  key={`${button.text || "button"}-${index}`}
                  style={[styles.button, buttons.length > 2 ? styles.buttonStacked : styles.buttonFlex, { backgroundColor: buttonBg }]}
                  activeOpacity={0.85}
                  onPress={() => handleClose(button.onPress)}
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
    padding: 24
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 58, 102, 0.42)"
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    shadowColor: partnerTheme.colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8
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
    fontWeight: "900",
    color: partnerTheme.colors.primaryDark,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: partnerTheme.colors.muted,
    textAlign: "center",
    marginBottom: 20
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 10,
    width: "100%"
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
