import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { partnerTheme } from "../../theme";

export type MediaState = {
  shopImageUrl: string;
  bannerImageUrl: string;
  restaurantPhotosUrls: string[];
};

type Props = {
  media: MediaState;
  uploadingKey: string | null;
  onPick: (key: "shopImageUrl" | "bannerImageUrl" | "restaurantPhoto") => void;
};

export default function MediaStep({ media, uploadingKey, onPick }: Props) {
  const renderSlot = (title: string, subtitle: string, url: string, key: Props["onPick"] extends (k: infer K) => void ? K : never) => (
    <View style={styles.slot}>
      <Text style={styles.slotTitle}>{title}</Text>
      <Text style={styles.slotSubtitle}>{subtitle}</Text>
      {url ? <Image source={{ uri: url }} style={styles.preview} resizeMode="cover" /> : null}
      <TouchableOpacity style={styles.button} onPress={() => onPick(key)} disabled={uploadingKey !== null}>
        {uploadingKey === key ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>{url ? "Replace" : "Upload"}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View>
      <Text style={styles.hint}>Add a logo, cover image and a few photos of your restaurant. These help customers trust your listing.</Text>
      {renderSlot("Logo / shop image", "Square image works best", media.shopImageUrl, "shopImageUrl")}
      {renderSlot("Cover image", "Wide banner for your shop page", media.bannerImageUrl, "bannerImageUrl")}
      <View style={styles.slot}>
        <Text style={styles.slotTitle}>Restaurant photos</Text>
        <Text style={styles.slotSubtitle}>Add up to 5 photos of your outlet, kitchen or dining area</Text>
        <View style={styles.photoGrid}>
          {media.restaurantPhotosUrls.map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.photoThumb} resizeMode="cover" />
          ))}
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onPick("restaurantPhoto")}
          disabled={uploadingKey !== null || media.restaurantPhotosUrls.length >= 5}
        >
          {uploadingKey === "restaurantPhoto" ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {media.restaurantPhotosUrls.length >= 5 ? "Maximum 5 photos" : "Add photo"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 12, fontSize: 13, lineHeight: 18, color: partnerTheme.colors.muted },
  slot: { backgroundColor: partnerTheme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: partnerTheme.colors.border, padding: 14, marginBottom: 12 },
  slotTitle: { fontSize: 14, fontWeight: "800", color: partnerTheme.colors.primaryDark },
  slotSubtitle: { marginTop: 4, marginBottom: 10, fontSize: 12, color: partnerTheme.colors.muted, lineHeight: 17 },
  preview: { width: "100%", height: 140, borderRadius: 12, marginBottom: 10 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  photoThumb: { width: 72, height: 72, borderRadius: 10 },
  button: { backgroundColor: partnerTheme.colors.primary, borderRadius: 14, alignItems: "center", paddingVertical: 12 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 13 }
});
