import React from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type AddressEntryMode = "unset" | "current" | "manual";

type AddressFormFieldsProps = {
  focusedField: string | null;
  onFocusField: (key: string | null) => void;
  addressEntryMode: AddressEntryMode;
  onSelectEntryMode: (mode: "current" | "manual") => void;
  onChangeEntryMode?: () => void;
  onEditLocation?: () => void;
  locatingCurrentLocation?: boolean;
  onUseCurrentLocation?: () => void;
  currentLocationCaptured?: boolean;
  locationPreview?: string;
  addressLabel: string;
  setAddressLabel: (value: string) => void;
  recipientName: string;
  setRecipientName: (value: string) => void;
  houseFlatDoorNo: string;
  setHouseFlatDoorNo: (value: string) => void;
  buildingApartmentName: string;
  setBuildingApartmentName: (value: string) => void;
  streetRoadName: string;
  setStreetRoadName: (value: string) => void;
  area: string;
  setArea: (value: string) => void;
  landmark: string;
  setLandmark: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  state: string;
  setState: (value: string) => void;
  district: string;
  setDistrict: (value: string) => void;
  pincode: string;
  setPincode: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
};

const Field = ({
  label,
  fieldKey,
  value,
  onChangeText,
  placeholder,
  focusedField,
  onFocusField,
  keyboardType,
  autoCapitalize,
  half
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  focusedField: string | null;
  onFocusField: (key: string | null) => void;
  keyboardType?: "default" | "number-pad";
  autoCapitalize?: "none" | "words" | "sentences";
  half?: boolean;
}) => {
  const focused = focusedField === fieldKey;
  return (
    <View style={[styles.field, half && styles.halfField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B0A79D"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || "words"}
        onFocus={() => onFocusField(fieldKey)}
        onBlur={() => onFocusField(null)}
      />
    </View>
  );
};

export default function AddressFormFields(props: AddressFormFieldsProps) {
  const renderModePicker = () => (
    <View style={styles.modePicker}>
      <TouchableOpacity
        style={[styles.modeCard, props.locatingCurrentLocation && styles.modeCardDisabled]}
        onPress={() => {
          props.onSelectEntryMode("current");
          props.onUseCurrentLocation?.();
        }}
        disabled={props.locatingCurrentLocation}
        activeOpacity={0.88}
      >
        <View style={[styles.modeIconWrap, styles.modeIconCurrent]}>
          {props.locatingCurrentLocation ? (
            <ActivityIndicator color="#e23744" size="small" />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#e23744" />
          )}
        </View>
        <Text style={styles.modeCardTitle}>
          {props.locatingCurrentLocation ? "Finding you…" : "Use current location"}
        </Text>
        <Text style={styles.modeCardHint}>Fastest — we pin your GPS spot on the map</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modeCard}
        onPress={() => props.onSelectEntryMode("manual")}
        activeOpacity={0.88}
      >
        <View style={[styles.modeIconWrap, styles.modeIconManual]}>
          <MaterialCommunityIcons name="map-marker-outline" size={22} color="#2B9C4A" />
        </View>
        <Text style={styles.modeCardTitle}>Enter address</Text>
        <Text style={styles.modeCardHint}>Type your full delivery address</Text>
      </TouchableOpacity>
    </View>
  );

  const renderChangeMethod = () =>
    props.onChangeEntryMode ? (
      <TouchableOpacity style={styles.changeMethodButton} onPress={props.onChangeEntryMode} activeOpacity={0.85}>
        <MaterialCommunityIcons name="swap-horizontal" size={15} color="#e23744" />
        <Text style={styles.changeMethodText}>Change method</Text>
      </TouchableOpacity>
    ) : null;

  const renderCurrentLocationFields = () => (
    <View style={styles.currentModeBody}>
      {props.currentLocationCaptured && props.locationPreview ? (
        <View style={styles.locationBadge}>
          <MaterialCommunityIcons name="map-marker-check" size={18} color="#216E39" />
          <View style={styles.locationBadgeCopy}>
            <Text style={styles.locationBadgeTitle}>Delivery location saved</Text>
            <Text style={styles.locationBadgeText} numberOfLines={3}>
              {props.locationPreview}
            </Text>
            {props.houseFlatDoorNo ? (
              <Text style={styles.locationFlatText}>{props.houseFlatDoorNo}</Text>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={styles.currentModeHint}>Confirm your delivery location on the map to continue.</Text>
      )}

      {props.onEditLocation ? (
        <TouchableOpacity style={styles.editLocationButton} onPress={props.onEditLocation} activeOpacity={0.85}>
          <MaterialCommunityIcons name="map-marker-radius" size={16} color="#e23744" />
          <Text style={styles.editLocationText}>Edit location on map</Text>
        </TouchableOpacity>
      ) : null}

      {renderChangeMethod()}
    </View>
  );

  const renderManualFields = () => (
    <View style={styles.manualModeBody}>
      <View style={styles.row}>
        <Field
          label="Save as"
          fieldKey="addressLabel"
          value={props.addressLabel}
          onChangeText={props.setAddressLabel}
          placeholder="Home / Work"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
        <Field
          label="Recipient"
          fieldKey="recipientName"
          value={props.recipientName}
          onChangeText={props.setRecipientName}
          placeholder="Receives order"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
      </View>
      <View style={styles.row}>
        <Field
          label="House / flat"
          fieldKey="houseFlatDoorNo"
          value={props.houseFlatDoorNo}
          onChangeText={props.setHouseFlatDoorNo}
          placeholder="e.g. 302"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
        <Field
          label="Building"
          fieldKey="buildingApartmentName"
          value={props.buildingApartmentName}
          onChangeText={props.setBuildingApartmentName}
          placeholder="Optional"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
      </View>
      <Field
        label="Street / colony"
        fieldKey="streetRoadName"
        value={props.streetRoadName}
        onChangeText={props.setStreetRoadName}
        placeholder="Street name"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
      <View style={styles.row}>
        <Field
          label="Area"
          fieldKey="area"
          value={props.area}
          onChangeText={props.setArea}
          placeholder="Locality"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
        <Field
          label="Landmark"
          fieldKey="landmark"
          value={props.landmark}
          onChangeText={props.setLandmark}
          placeholder="Optional"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
      </View>
      <View style={styles.row}>
        <Field
          label="City"
          fieldKey="city"
          value={props.city}
          onChangeText={props.setCity}
          placeholder="City"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
        <Field
          label="State"
          fieldKey="state"
          value={props.state}
          onChangeText={props.setState}
          placeholder="State"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
      </View>
      <View style={styles.row}>
        <Field
          label="Pincode"
          fieldKey="pincode"
          value={props.pincode}
          onChangeText={(value) => props.setPincode(value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6 digits"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          keyboardType="number-pad"
          autoCapitalize="none"
          half
        />
        <Field
          label="District"
          fieldKey="district"
          value={props.district}
          onChangeText={props.setDistrict}
          placeholder="Optional"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
      </View>
      <Field
        label="Country"
        fieldKey="country"
        value={props.country}
        onChangeText={props.setCountry}
        placeholder="India"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
      {renderChangeMethod()}
    </View>
  );

  return (
    <View style={styles.card}>
      {props.addressEntryMode === "unset"
        ? renderModePicker()
        : props.addressEntryMode === "current"
          ? renderCurrentLocationFields()
          : renderManualFields()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 2
  },
  modePicker: {
    gap: 10
  },
  modeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ECE3D9",
    backgroundColor: "#FFFCF8",
    padding: 14
  },
  modeCardDisabled: {
    opacity: 0.85
  },
  modeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10
  },
  modeIconCurrent: {
    backgroundColor: "#FFF1E6"
  },
  modeIconManual: {
    backgroundColor: "#EAF8EA"
  },
  modeCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#241D17"
  },
  modeCardHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#7A6F65"
  },
  currentModeBody: {
    gap: 2
  },
  manualModeBody: {
    gap: 0
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F0FFF4",
    borderWidth: 1,
    borderColor: "#BFE9CA"
  },
  locationBadgeCopy: {
    flex: 1,
    minWidth: 0
  },
  locationBadgeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#216E39",
    marginBottom: 2
  },
  locationBadgeText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#344054"
  },
  locationFlatText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#216E39"
  },
  editLocationButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 4
  },
  editLocationText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e23744"
  },
  currentModeHint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: "#7A6F65"
  },
  changeMethodButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 4
  },
  changeMethodText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e23744"
  },
  field: {
    marginBottom: 8
  },
  halfField: {
    flex: 1
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8A7F75",
    marginBottom: 4
  },
  input: {
    borderWidth: 1,
    borderColor: "#E4DBD2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A120B",
    backgroundColor: "#FFFFFF",
    minHeight: 42
  },
  inputFocused: {
    borderColor: "#e23744",
    backgroundColor: "#FFF8F4"
  },
  row: {
    flexDirection: "row",
    gap: 8
  }
});
