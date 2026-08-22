import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getUserProfile, setDefaultAddress, type SavedAddress, type UserProfile } from "../api/user.api";
import { formatSavedAddress, listSavedAddresses } from "../utils/address";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

type Props = {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSelected: (profile: UserProfile) => void;
  onAddNew: () => void;
};

export default function AddressPickerModal({ visible, profile, onClose, onSelected, onAddNew }: Props) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(profile);

  useEffect(() => {
    if (!visible) return;

    setError(null);
    setLiveProfile(profile);
    let cancelled = false;

    const loadAddresses = async () => {
      try {
        setLoading(true);
        const response = await getUserProfile();
        if (!cancelled && response.success && response.data) {
          setLiveProfile(response.data);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load saved addresses.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAddresses();
    return () => {
      cancelled = true;
    };
  }, [profile, visible]);

  const addresses = useMemo(() => listSavedAddresses(liveProfile), [liveProfile]);
  const selectedId = addresses.find((address) => address.isDefault)?._id || addresses[0]?._id;

  const handleSelect = async (address: SavedAddress) => {
    if (!address._id) {
      onClose();
      return;
    }

    if (address._id === selectedId) {
      onClose();
      return;
    }

    try {
      setSavingId(address._id);
      setError(null);
      const response = await setDefaultAddress(address._id);
      if (!response.success || !response.data) {
        setError(response.message || "Could not switch delivery address.");
        return;
      }
      onSelected(response.data);
    } catch (selectError: any) {
      setError(selectError?.message || "Could not switch delivery address.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, layout.isTablet && styles.overlayCentered]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: layout.sheetMaxHeight,
              width: layout.isTablet ? Math.min(480, layout.width - 48) : "100%"
            },
            layout.isTablet && styles.sheetTablet
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Delivery address</Text>
              <Text style={styles.subtitle}>Choose a saved address or add a new one</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {loading && addresses.length === 0 ? (
              <ActivityIndicator size="small" color="#e23744" style={styles.cardSpinner} />
            ) : addresses.length === 0 ? (
              <Text style={styles.emptyText}>No saved addresses yet. Add one to continue checkout.</Text>
            ) : (
              addresses.map((address, index) => {
                const isSelected = Boolean(address.isDefault) || (!selectedId && index === 0);
                const busy = savingId === address._id;
                return (
                  <TouchableOpacity
                    key={address._id || `${address.label}-${index}`}
                    style={[styles.card, isSelected && styles.cardSelected]}
                    onPress={() => handleSelect(address)}
                    disabled={Boolean(savingId)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardTop}>
                      <Text style={styles.cardLabel} numberOfLines={1}>{address.label || "Address"}</Text>
                      {isSelected ? <Text style={styles.selectedBadge}>Selected</Text> : null}
                    </View>
                    <Text style={styles.cardBody}>{formatSavedAddress(address, liveProfile?.name)}</Text>
                    {busy ? <ActivityIndicator size="small" color="#e23744" style={styles.cardSpinner} /> : null}
                  </TouchableOpacity>
                );
              })
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <TouchableOpacity style={styles.addButton} onPress={onAddNew} disabled={Boolean(savingId)}>
            <Text style={styles.addButtonText}>Add new address</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(28, 20, 16, 0.45)"
  },
  overlayCentered: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "78%",
    zIndex: 2
  },
  sheetTablet: {
    borderRadius: 24,
    maxHeight: "80%"
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E7DCD2",
    marginBottom: 14
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#241D17"
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#7A6F65"
  },
  closeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e23744"
  },
  list: {
    flexGrow: 0,
    minHeight: 0
  },
  listContent: {
    paddingBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: "#7A6F65",
    lineHeight: 20,
    paddingVertical: 16
  },
  card: {
    borderWidth: 1,
    borderColor: "#F0E6DC",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#FFFCF9"
  },
  cardSelected: {
    borderColor: "#e23744",
    backgroundColor: "#FFF4EE"
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  cardLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
    color: "#241D17"
  },
  selectedBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e23744"
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5F534B"
  },
  cardSpinner: {
    marginTop: 8
  },
  errorText: {
    fontSize: 13,
    color: "#C7362E",
    marginBottom: 8
  },
  addButton: {
    marginTop: 8,
    backgroundColor: "#e23744",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center"
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  }
});
