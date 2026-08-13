import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

type AddressFormFieldsProps = {
  focusedField: string | null;
  onFocusField: (key: string | null) => void;
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
      <Field
        label="Save as"
        fieldKey="addressLabel"
        value={props.addressLabel}
        onChangeText={props.setAddressLabel}
        placeholder="Home, Work, Other"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
      <Field
        label="Recipient"
        fieldKey="recipientName"
        value={props.recipientName}
        onChangeText={props.setRecipientName}
        placeholder="Who receives the order"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
      <Field
        label="House / flat / door"
        fieldKey="houseFlatDoorNo"
        value={props.houseFlatDoorNo}
        onChangeText={props.setHouseFlatDoorNo}
        placeholder="e.g. 302"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
      <Field
        label="Building / apartment"
        fieldKey="buildingApartmentName"
        value={props.buildingApartmentName}
        onChangeText={props.setBuildingApartmentName}
        placeholder="Optional"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
      <Field
        label="Street / colony"
        fieldKey="streetRoadName"
        value={props.streetRoadName}
        onChangeText={props.setStreetRoadName}
        placeholder="Street name"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
      <Field
        label="Area / locality"
        fieldKey="area"
        value={props.area}
        onChangeText={props.setArea}
        placeholder="Locality"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
      <Field
        label="Landmark"
        fieldKey="landmark"
        value={props.landmark}
        onChangeText={props.setLandmark}
        placeholder="Optional nearby landmark"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
      <View style={styles.row}>
        <Field
          label="City / town"
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
      <Field
        label="District"
        fieldKey="district"
        value={props.district}
        onChangeText={props.setDistrict}
        placeholder="Optional"
        focusedField={props.focusedField}
        onFocusField={props.onFocusField}
      />
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
          label="Country"
          fieldKey="country"
          value={props.country}
          onChangeText={props.setCountry}
          placeholder="India"
          focusedField={props.focusedField}
          onFocusField={props.onFocusField}
          half
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEE6DE",
    shadowColor: "#1A120B",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  field: {
    marginBottom: 12
  },
  halfField: {
    flex: 1
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A7F75",
    letterSpacing: 0.2,
    marginBottom: 6,
    marginLeft: 2
  },
  input: {
    borderWidth: 1,
    borderColor: "#E7DED4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A120B",
    backgroundColor: "#FBF8F5"
  },
  inputFocused: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFFFFF",
    shadowColor: "#FF6B35",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }
  },
  row: {
    flexDirection: "row",
    gap: 10
  }
});
