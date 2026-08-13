import React from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type AddressFormFieldsProps = {
  focusedField: string | null;
  onFocusField: (key: string | null) => void;
  locatingCurrentLocation?: boolean;
  onUseCurrentLocation?: () => void;
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
  return (
    <View style={styles.card}>
      {props.onUseCurrentLocation ? (
        <TouchableOpacity
          style={[styles.currentLocationButton, props.locatingCurrentLocation && styles.currentLocationButtonDisabled]}
          onPress={props.onUseCurrentLocation}
          disabled={props.locatingCurrentLocation}
          activeOpacity={0.85}
        >
          {props.locatingCurrentLocation ? (
            <ActivityIndicator color="#FF6B35" />
          ) : (
            <Text style={styles.currentLocationText}>Use current location</Text>
          )}
        </TouchableOpacity>
      ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FAF7F3",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EDE6DE"
  },
  currentLocationButton: {
    marginBottom: 10,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD2C2",
    backgroundColor: "#FFF4EE",
    alignItems: "center",
    justifyContent: "center"
  },
  currentLocationButtonDisabled: {
    opacity: 0.7
  },
  currentLocationText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "700"
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
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1A120B",
    backgroundColor: "#FFFFFF",
    minHeight: 38
  },
  inputFocused: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFFFFF"
  },
  row: {
    flexDirection: "row",
    gap: 8
  }
});
