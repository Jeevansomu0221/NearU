import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";
import { splitPublicOrderId } from "../utils/publicOrderId";

type Props = {
  orderId?: unknown;
  prefix?: string;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
};

export default function HighlightedOrderId({
  orderId,
  prefix = "Order #",
  style,
  highlightStyle
}: Props) {
  const { prefixDigits, lastFour } = splitPublicOrderId(orderId);
  if (!prefixDigits && !lastFour) {
    return <Text style={style}>{prefix.replace("#", "").trim()}</Text>;
  }

  return (
    <Text style={style}>
      {prefix}
      {prefixDigits}
      <Text style={[{ fontWeight: "800", letterSpacing: 0.6 }, highlightStyle]}>{lastFour}</Text>
    </Text>
  );
}
