import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  geocodeAddressQuery,
  getGeocodedPlace,
  suggestAddresses,
  type GeocodedAddress
} from "../api/geocode.api";

type AddressSearchFieldProps = {
  onSelect: (address: GeocodedAddress) => void;
};

export default function AddressSearchField({ onSelect }: AddressSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ description: string; placeId: string; address?: GeocodedAddress }[]>(
    []
  );
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setError("");
      return;
    }

    const handle = setTimeout(async () => {
      const currentRequest = ++requestId.current;
      setSearching(true);
      setError("");
      try {
        const response = await suggestAddresses(trimmed);
        if (currentRequest !== requestId.current) return;
        if (!response.success) {
          setSuggestions([]);
          setError(response.message || "Could not search addresses");
          return;
        }
        setSuggestions(response.data || []);
      } catch (lookupError: any) {
        if (currentRequest !== requestId.current) return;
        setSuggestions([]);
        setError(lookupError?.message || "Could not search addresses");
      } finally {
        if (currentRequest === requestId.current) setSearching(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  const applyAddress = (address: GeocodedAddress) => {
    onSelect(address);
    setSelectedLabel(address.formattedAddress);
    setQuery(address.formattedAddress);
    setSuggestions([]);
    setError("");
  };

  const handleSelectSuggestion = async (suggestion: {
    description: string;
    placeId: string;
    address?: GeocodedAddress;
  }) => {
    if (suggestion.address) {
      applyAddress(suggestion.address);
      return;
    }

    setSearching(true);
    setError("");
    try {
      const response = await getGeocodedPlace(suggestion.placeId);
      if (!response.success || !response.data) {
        setError(response.message || "Could not resolve that address");
        return;
      }
      applyAddress(response.data);
    } catch (lookupError: any) {
      setError(lookupError?.message || "Could not resolve that address");
    } finally {
      setSearching(false);
    }
  };

  const handleFindExactAddress = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setError("Type the area, street, or full address");
      return;
    }

    setSearching(true);
    setError("");
    try {
      const response = await geocodeAddressQuery(trimmed);
      if (!response.success) {
        setError(response.message || "Could not find that address");
        return;
      }
      const matches = response.data || [];
      if (matches.length === 0) {
        setError("No matching address found. Try a nearby landmark or pincode.");
        return;
      }
      if (matches.length === 1) {
        applyAddress(matches[0]);
        return;
      }
      setSuggestions(
        matches.map((match) => ({
          description: match.formattedAddress,
          placeId: match.placeId,
          address: match
        }))
      );
    } catch (lookupError: any) {
      setError(lookupError?.message || "Could not find that address");
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Search address</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setSelectedLabel("");
          }}
          placeholder="Type your address, area, or landmark"
          placeholderTextColor="#98A2B3"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => void handleFindExactAddress()}
        />
        <TouchableOpacity style={styles.findButton} onPress={() => void handleFindExactAddress()} disabled={searching}>
          {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.findButtonText}>Find</Text>}
        </TouchableOpacity>
      </View>

      {selectedLabel ? <Text style={styles.selectedText}>Using: {selectedLabel}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestionList}>
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={`${suggestion.placeId}-${suggestion.description}`}
              style={styles.suggestionItem}
              onPress={() => void handleSelectSuggestion(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7A6F65",
    marginBottom: 8
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D9D0C5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A120B",
    backgroundColor: "#FFFFFF"
  },
  findButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  findButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  selectedText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#0F9D58",
    fontWeight: "600"
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#B42318"
  },
  suggestionList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E7DED4",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden"
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1EBE4"
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#241D17"
  }
});
