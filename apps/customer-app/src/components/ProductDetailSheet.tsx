import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SelectedExtra } from "../context/CartContext";

export interface ExtraChoice {
  name: string;
  price: number;
}

export interface ProductDetailItem {
  _id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  isVegetarian?: boolean;
  imageUrl?: string;
  extraChoices?: ExtraChoice[];
}

interface ProductDetailSheetProps {
  visible: boolean;
  item: ProductDetailItem | null;
  imageUri: string;
  onClose: () => void;
  onAdd: (payload: {
    quantity: number;
    selectedExtras: SelectedExtra[];
    cookingRequest: string;
    unitPrice: number;
  }) => void;
}

export default function ProductDetailSheet({
  visible,
  item,
  imageUri,
  onClose,
  onAdd
}: ProductDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [cookingRequest, setCookingRequest] = useState("");
  const translateY = useRef(new Animated.Value(0)).current;

  const closeWithAnimation = () => {
    Animated.timing(translateY, {
      toValue: 520,
      duration: 180,
      useNativeDriver: true
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 110 || gestureState.vy > 0.95) {
        closeWithAnimation();
        return;
      }

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 85,
        friction: 11
      }).start();
    }
  });

  useEffect(() => {
    if (visible && item) {
      setQuantity(1);
      setSelectedExtras([]);
      setCookingRequest("");
    }
  }, [visible, item?._id]);

  const extrasTotal = useMemo(
    () => selectedExtras.reduce((sum, extra) => sum + extra.price, 0),
    [selectedExtras]
  );

  const unitPrice = (item?.price || 0) + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const toggleExtra = (choice: ExtraChoice) => {
    setSelectedExtras((prev) => {
      const exists = prev.some((entry) => entry.name === choice.name);
      if (exists) {
        return prev.filter((entry) => entry.name !== choice.name);
      }
      return [...prev, { name: choice.name, price: choice.price }];
    });
  };

  const handleAdd = () => {
    if (!item) return;
    onAdd({
      quantity,
      selectedExtras,
      cookingRequest: cookingRequest.trim(),
      unitPrice
    });
    onClose();
  };

  useEffect(() => {
    if (!visible) {
      translateY.setValue(0);
    }
  }, [translateY, visible]);

  if (!item) return null;

  const hasExtraChoices = (item.extraChoices?.length || 0) > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrapper}
        >
          <TouchableOpacity
            style={styles.closeButtonOutside}
            onPress={closeWithAnimation}
            activeOpacity={0.85}
          >
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 12), transform: [{ translateY }] }
            ]}
          >
            <View style={styles.sheetTopBar} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />

              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <View style={styles.vegIndicator}>
                    <View
                      style={[
                        styles.vegBox,
                        item.isVegetarian === false && styles.nonVegBox
                      ]}
                    >
                      <View
                        style={[
                          styles.vegDot,
                          item.isVegetarian === false && styles.nonVegDot
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>

                {item.category ? <Text style={styles.categoryText}>{item.category}</Text> : null}

                <Text style={styles.description}>
                  {item.description?.trim() ||
                    "Freshly prepared with quality ingredients."}
                </Text>

                {hasExtraChoices ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Extra choices</Text>
                    <Text style={styles.sectionHint}>Optional • Select any</Text>

                    {item.extraChoices!.map((choice) => {
                      const selected = selectedExtras.some(
                        (entry) => entry.name === choice.name
                      );

                      return (
                        <TouchableOpacity
                          key={choice.name}
                          style={styles.choiceRow}
                          onPress={() => toggleExtra(choice)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.choiceName}>{choice.name}</Text>
                          <View style={styles.choiceRight}>
                            {choice.price > 0 ? (
                              <Text style={styles.choicePrice}>+ Rs {choice.price}</Text>
                            ) : null}
                            <View
                              style={[
                                styles.choiceCheckbox,
                                selected && styles.choiceCheckboxSelected
                              ]}
                            >
                              {selected ? (
                                <Feather name="check" size={14} color="#FFFFFF" />
                              ) : null}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cooking request</Text>
                  <Text style={styles.sectionHint}>Optional</Text>
                  <TextInput
                    style={styles.cookingInput}
                    value={cookingRequest}
                    onChangeText={setCookingRequest}
                    placeholder="e.g. less spicy, no onions..."
                    placeholderTextColor="#A3968D"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                >
                  <Text
                    style={[
                      styles.stepperButtonText,
                      quantity <= 1 && styles.stepperButtonDisabled
                    ]}
                  >
                    -
                  </Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setQuantity((value) => value + 1)}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={handleAdd} activeOpacity={0.9}>
                <Text style={styles.addButtonText}>Add item Rs {totalPrice}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  sheetWrapper: {
    maxHeight: "92%"
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    maxHeight: "100%"
  },
  sheetTopBar: {
    height: 32,
    justifyContent: "center",
    alignItems: "center"
  },
  dragHandle: {
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#DDCFC4"
  },
  closeButtonOutside: {
    position: "absolute",
    top: -48,
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(32,25,20,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5
  },
  scrollContent: {
    paddingBottom: 12
  },
  heroImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#F4E7DB"
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  vegIndicator: {
    marginTop: 3
  },
  vegBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "#249A4B",
    alignItems: "center",
    justifyContent: "center"
  },
  nonVegBox: {
    borderColor: "#C7362E"
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#249A4B"
  },
  nonVegDot: {
    backgroundColor: "#C7362E"
  },
  itemName: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    color: "#201914"
  },
  categoryText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#FF6B35"
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: "#5C524B"
  },
  section: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0EAE2"
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#201914"
  },
  sectionHint: {
    marginTop: 2,
    fontSize: 11,
    color: "#8C8077"
  },
  choiceRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  choiceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#201914"
  },
  choiceRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  choicePrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5C524B"
  },
  choiceCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D9CEC4",
    alignItems: "center",
    justifyContent: "center"
  },
  choiceCheckboxSelected: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35"
  },
  cookingInput: {
    marginTop: 10,
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#E8DFD6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#201914",
    backgroundColor: "#FBF8F4"
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDE4DB",
    backgroundColor: "#FFFFFF"
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1C3AA",
    borderRadius: 999,
    paddingHorizontal: 2,
    height: 42
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D76E35"
  },
  stepperButtonDisabled: {
    color: "#CFB8A8"
  },
  stepperValue: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "#201914"
  },
  addButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center"
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  }
});
