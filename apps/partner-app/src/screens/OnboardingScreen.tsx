import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  AppState
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { uploadMultipart } from "../api/client";
import { partnerTheme } from "../theme";
import { androidKeyboardPadding, useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";
import { ONBOARDING_STEPS, CATEGORIES, CATEGORY_LABELS } from "./onboarding/constants";
import LegalDocumentsStep from "./onboarding/LegalDocumentsStep";
import BankStep from "./onboarding/BankStep";
import MediaStep, { type MediaState } from "./onboarding/MediaStep";
import MenuDraftStep, { type MenuDraftItem } from "./onboarding/MenuDraftStep";
import OperationsStep, { type OperationsState } from "./onboarding/OperationsStep";
import AgreementStep, { validateAndSaveAgreement } from "./onboarding/AgreementStep";
import type { PartnerKycState } from "../api/kyc.api";

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata",
  "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane",
  "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana",
  "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar",
  "Aurangabad", "Amritsar", "Navi Mumbai", "Howrah", "Gwalior", "Coimbatore",
  "Vijayawada", "Madurai", "Raipur", "Chandigarh", "Guwahati"
];

type DocumentState = {
  fssaiNumber: string;
  fssaiUrl: string;
  panNumber: string;
  panFrontUrl: string;
  aadhaarNumber: string;
  aadhaarFrontUrl: string;
  aadhaarBackUrl: string;
  gstRegistered: "yes" | "no" | "";
  gstNumber: string;
  bankDocumentType: "cheque" | "passbook" | "statement" | "";
  bankAccountHolderName: string;
  cancelledChequeUrl: string;
  bankPassbookUrl: string;
  bankStatementUrl: string;
  bankAccountNumber: string;
  bankIfsc: string;
  addressProofUrl: string;
  gstUrl: string;
  shopLicenseUrl: string;
  ownerPanUrl: string;
  menuProofUrl: string;
};

const BANK_DOCUMENT_TYPES = new Set<DocumentState["bankDocumentType"]>(["cheque", "passbook", "statement"]);
const DEFAULT_BANK_DOCUMENT_TYPE: DocumentState["bankDocumentType"] = "cheque";

const normalizeBankDocumentType = (value: unknown): DocumentState["bankDocumentType"] => {
  const bankDocumentType = String(value || "") as DocumentState["bankDocumentType"];
  return BANK_DOCUMENT_TYPES.has(bankDocumentType) ? bankDocumentType : DEFAULT_BANK_DOCUMENT_TYPE;
};

const hasBankInput = (documents: DocumentState) =>
  Boolean(
    documents.bankAccountHolderName.trim() ||
      documents.bankAccountNumber.trim() ||
      documents.bankIfsc.trim()
  );

const clearBankDetails = (documents: DocumentState): DocumentState => ({
  ...documents,
  bankDocumentType: DEFAULT_BANK_DOCUMENT_TYPE,
  bankAccountHolderName: "",
  cancelledChequeUrl: "",
  bankPassbookUrl: "",
  bankStatementUrl: "",
  bankAccountNumber: "",
  bankIfsc: ""
});

interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
  };
  message?: string;
}

type PickerAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type UploadingKey =
  | "fssaiUrl"
  | "panFrontUrl"
  | "aadhaarFrontUrl"
  | "aadhaarBackUrl"
  | "cancelledChequeUrl"
  | "bankPassbookUrl"
  | "bankStatementUrl"
  | "addressProofUrl"
  | "gstUrl"
  | "shopLicenseUrl"
  | "ownerPanUrl"
  | "menuProofUrl"
  | "shopImageUrl"
  | "bannerImageUrl"
  | "restaurantPhoto"
  | null;

type PendingDocument = {
  docKey: Exclude<UploadingKey, null>;
  asset: PickerAsset;
  title: string;
};

type OnboardingDraft = {
  activeStep: number;
  form: {
    ownerName: string;
    restaurantName: string;
    phone: string;
    restaurantPhone: string;
    email: string;
  };
  address: {
    state: string;
    city: string;
    pincode: string;
    area: string;
    colony: string;
    roadStreet: string;
    nearbyPlaces: string;
  };
  documents: DocumentState;
  media: MediaState;
  operations: OperationsState;
  menuDraft: MenuDraftItem[];
  kyc: PartnerKycState;
  selectedCategory: string;
  shopLocation: { latitude: number; longitude: number } | null;
  updatedAt?: string;
};

const STEPS = ONBOARDING_STEPS;

const parseDraftUpdatedAt = (draft: { updatedAt?: string } | null | undefined) => {
  if (!draft?.updatedAt) return 0;
  const parsed = Date.parse(draft.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickNewerDraft = (
  remoteDraft: OnboardingDraft | null,
  localDraft: OnboardingDraft | null,
  remoteUpdatedAt = 0,
  localUpdatedAt = 0
): OnboardingDraft | null => {
  if (!remoteDraft && !localDraft) return null;
  if (!remoteDraft) return localDraft;
  if (!localDraft) return remoteDraft;
  return localUpdatedAt >= remoteUpdatedAt ? localDraft : remoteDraft;
};

const mandatoryDocs: Array<{ key: keyof DocumentState; title: string; subtitle: string }> = [
  { key: "fssaiUrl", title: "FSSAI License", subtitle: "Certificate name should match the restaurant name or PAN name" }
];

const optionalDocs: Array<{ key: keyof DocumentState; title: string; subtitle: string }> = [
  { key: "gstUrl", title: "GST Certificate", subtitle: "Required only if GST registered" }
];

const defaultOperations = (): OperationsState => ({
  openingTime: "08:00",
  closingTime: "22:00",
  weeklyHolidays: [],
  deliveryMode: "platform",
  takeawayAvailable: true,
  packagingNote: ""
});

const defaultMedia = (): MediaState => ({
  shopImageUrl: "",
  bannerImageUrl: "",
  restaurantPhotosUrls: []
});

const DRAFT_STORAGE_KEY = "partnerOnboardingDraft";

const getUploadMimeType = (filename: string) => {
  const lastDot = filename.lastIndexOf(".");
  const extension = lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : "";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  if (extension === "pdf") return "application/pdf";
  return "image/jpeg";
};

const getUploadFilename = (asset: PickerAsset, fallbackName: string) => {
  const fromUri = asset.uri.split(/[\\/]/).pop()?.split("?")[0];
  const rawName = asset.fileName || fromUri || fallbackName;
  const sanitized = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (/\.[a-z0-9]+$/i.test(sanitized)) {
    return sanitized;
  }

  const mimeExtension = (asset.mimeType || "")
    .split("/")[1]
    ?.replace("jpeg", "jpg")
    .replace("svg+xml", "svg") || "jpg";

  return `${sanitized || "upload"}.${mimeExtension}`;
};

const isPdfUri = (uri?: string) => (uri || "").split("?")[0].toLowerCase().endsWith(".pdf");

const loadLocationModule = async () => {
  try {
    return await import("expo-location");
  } catch (error) {
    console.warn("expo-location is unavailable in this app build:", error);
    return null;
  }
};

const normalizeDraft = (draft: any): OnboardingDraft | null => {
  if (!draft || typeof draft !== "object") return null;

  const safeForm = typeof draft.form === "object" && draft.form ? draft.form : {};
  const safeAddress = typeof draft.address === "object" && draft.address ? draft.address : {};
  const safeDocuments = typeof draft.documents === "object" && draft.documents ? draft.documents : {};
  const safeLocation = typeof draft.shopLocation === "object" && draft.shopLocation ? draft.shopLocation : null;

  return {
    activeStep: Number.isFinite(Number(draft.activeStep)) ? Math.max(0, Math.min(STEPS.length - 1, Number(draft.activeStep))) : 0,
    form: {
      ownerName: String(safeForm.ownerName || ""),
      restaurantName: String(safeForm.restaurantName || ""),
      phone: String(safeForm.phone || safeForm.ownerPhone || ""),
      restaurantPhone: String(safeForm.restaurantPhone || ""),
      email: String(safeForm.email || "")
    },
    address: {
      state: String(safeAddress.state || ""),
      city: String(safeAddress.city || ""),
      pincode: String(safeAddress.pincode || ""),
      area: String(safeAddress.area || ""),
      colony: String(safeAddress.colony || ""),
      roadStreet: String(safeAddress.roadStreet || ""),
      nearbyPlaces: String(safeAddress.nearbyPlaces || "")
    },
    documents: {
      fssaiNumber: String(safeDocuments.fssaiNumber || ""),
      fssaiUrl: String(safeDocuments.fssaiUrl || ""),
      panNumber: String(safeDocuments.panNumber || ""),
      panFrontUrl: String(safeDocuments.panFrontUrl || ""),
      aadhaarNumber: String(safeDocuments.aadhaarNumber || ""),
      aadhaarFrontUrl: String(safeDocuments.aadhaarFrontUrl || ""),
      aadhaarBackUrl: String(safeDocuments.aadhaarBackUrl || ""),
      gstRegistered: safeDocuments.gstRegistered === true || safeDocuments.gstRegistered === "yes" ? "yes" : safeDocuments.gstRegistered === false || safeDocuments.gstRegistered === "no" ? "no" : "",
      gstNumber: String(safeDocuments.gstNumber || ""),
      bankDocumentType: normalizeBankDocumentType(safeDocuments.bankDocumentType),
      bankAccountHolderName: String(safeDocuments.bankAccountHolderName || ""),
      cancelledChequeUrl: String(safeDocuments.cancelledChequeUrl || ""),
      bankPassbookUrl: String(safeDocuments.bankPassbookUrl || ""),
      bankStatementUrl: String(safeDocuments.bankStatementUrl || ""),
      bankAccountNumber: String(safeDocuments.bankAccountNumber || ""),
      bankIfsc: String(safeDocuments.bankIfsc || ""),
      addressProofUrl: String(safeDocuments.addressProofUrl || ""),
      gstUrl: String(safeDocuments.gstUrl || ""),
      shopLicenseUrl: String(safeDocuments.shopLicenseUrl || ""),
      ownerPanUrl: String(safeDocuments.ownerPanUrl || ""),
      menuProofUrl: String(safeDocuments.menuProofUrl || "")
    },
    media:
      typeof draft.media === "object" && draft.media
        ? {
            shopImageUrl: String(draft.media.shopImageUrl || ""),
            bannerImageUrl: String(draft.media.bannerImageUrl || ""),
            restaurantPhotosUrls: Array.isArray(draft.media.restaurantPhotosUrls)
              ? draft.media.restaurantPhotosUrls.map((url: unknown) => String(url || "")).filter(Boolean)
              : []
          }
        : defaultMedia(),
    operations:
      typeof draft.operations === "object" && draft.operations
        ? {
            openingTime: String(draft.operations.openingTime || "08:00"),
            closingTime: String(draft.operations.closingTime || "22:00"),
            weeklyHolidays: Array.isArray(draft.operations.weeklyHolidays)
              ? draft.operations.weeklyHolidays.map((day: unknown) => String(day || "")).filter(Boolean)
              : [],
            deliveryMode: draft.operations.deliveryMode === "self" ? "self" : "platform",
            takeawayAvailable: draft.operations.takeawayAvailable !== false,
            packagingNote: String(draft.operations.packagingNote || "")
          }
        : defaultOperations(),
    menuDraft: Array.isArray(draft.menuDraft)
      ? draft.menuDraft.map((item: any) => ({
          name: String(item?.name || ""),
          description: String(item?.description || ""),
          price: String(item?.price || ""),
          isVegetarian: item?.isVegetarian !== false,
          imageUrl: String(item?.imageUrl || "")
        }))
      : [{ name: "", description: "", price: "", isVegetarian: true, imageUrl: "" }],
    kyc: typeof draft.kyc === "object" && draft.kyc ? draft.kyc : {},
    selectedCategory: String(draft.selectedCategory || ""),
    shopLocation:
      safeLocation && Number.isFinite(Number(safeLocation.latitude)) && Number.isFinite(Number(safeLocation.longitude))
        ? {
            latitude: Number(safeLocation.latitude),
            longitude: Number(safeLocation.longitude)
          }
        : null
  };
};

export default function OnboardingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<UploadingKey>(null);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
  const [form, setForm] = useState({
    ownerName: "",
    restaurantName: "",
    phone: "",
    restaurantPhone: "",
    email: ""
  });
  const [address, setAddress] = useState({
    state: "",
    city: "",
    pincode: "",
    area: "",
    colony: "",
    roadStreet: "",
    nearbyPlaces: ""
  });
  const [documents, setDocuments] = useState<DocumentState>({
    fssaiNumber: "",
    fssaiUrl: "",
    panNumber: "",
    panFrontUrl: "",
    aadhaarNumber: "",
    aadhaarFrontUrl: "",
    aadhaarBackUrl: "",
    gstRegistered: "",
    gstNumber: "",
    bankDocumentType: DEFAULT_BANK_DOCUMENT_TYPE,
    bankAccountHolderName: "",
    cancelledChequeUrl: "",
    bankPassbookUrl: "",
    bankStatementUrl: "",
    bankAccountNumber: "",
    bankIfsc: "",
    addressProofUrl: "",
    gstUrl: "",
    shopLicenseUrl: "",
    ownerPanUrl: "",
    menuProofUrl: ""
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [media, setMedia] = useState<MediaState>(defaultMedia());
  const [operations, setOperations] = useState<OperationsState>(defaultOperations());
  const [menuDraft, setMenuDraft] = useState<MenuDraftItem[]>([
    { name: "", description: "", price: "", isVegetarian: true, imageUrl: "" }
  ]);
  const [kyc, setKyc] = useState<PartnerKycState>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [partnerAgreementAccepted, setPartnerAgreementAccepted] = useState(false);
  const [autoFilledPhone, setAutoFilledPhone] = useState("");
  const [shopLocation, setShopLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [hydratingDraft, setHydratingDraft] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftReadyRef = useRef(false);
  const latestDraftRef = useRef<OnboardingDraft | null>(null);

  const buildOnboardingDraft = (): OnboardingDraft => ({
    activeStep,
    form,
    address,
    documents,
    media,
    operations,
    menuDraft,
    kyc,
    selectedCategory,
    shopLocation,
    updatedAt: new Date().toISOString()
  });

  const saveOnboardingDraft = async (draft: OnboardingDraft, options?: { syncRemote?: boolean }) => {
    const draftWithMeta = { ...draft, updatedAt: draft.updatedAt || new Date().toISOString() };
    latestDraftRef.current = draftWithMeta;
    await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftWithMeta));
    if (options?.syncRemote !== false) {
      await api.put("/partners/onboarding-draft", { draft: draftWithMeta });
    }
  };

  const flushOnboardingDraft = async () => {
    if (!draftReadyRef.current || hydratingDraft) return;
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
    const draft = latestDraftRef.current || buildOnboardingDraft();
    try {
      await saveOnboardingDraft(draft);
    } catch (error: any) {
      console.log("Draft flush skipped:", error?.message || error);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      await flushOnboardingDraft();
      Alert.alert("Saved", "Your onboarding draft is saved. You can continue later.");
    } catch (error: any) {
      Alert.alert("Could not save", error?.message || "Please try again.");
    } finally {
      setSavingDraft(false);
    }
  };

  useEffect(() => {
    const fetchPhone = async () => {
      try {
        const storedPhone = await AsyncStorage.getItem("phone");
        if (storedPhone) {
          setAutoFilledPhone(storedPhone);
          setForm((prev) => ({ ...prev, phone: storedPhone }));
        }
      } catch (error) {
        console.log("Error fetching phone:", error);
      }
    };

    fetchPhone();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreDraft = async () => {
      try {
        const localDraftRaw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        let localParsed: any = null;
        if (localDraftRaw) {
          try {
            localParsed = JSON.parse(localDraftRaw);
          } catch {
            localParsed = null;
          }
        }

        let remoteParsed: any = null;
        try {
          const response = await api.get<any>("/partners/onboarding-draft");
          remoteParsed = response.data?.data ?? null;
        } catch (error: any) {
          console.log("Could not load remote onboarding draft:", error?.message || error);
        }

        const localDraft = normalizeDraft(localParsed);
        const remoteDraft = normalizeDraft(remoteParsed);
        const draft = pickNewerDraft(
          remoteDraft,
          localDraft,
          parseDraftUpdatedAt(remoteParsed),
          parseDraftUpdatedAt(localParsed)
        );

        if (cancelled || !draft) {
          return;
        }

        setActiveStep(draft.activeStep);
        setForm((prev) => ({ ...prev, ...draft.form }));
        setAddress((prev) => ({ ...prev, ...draft.address }));
        setDocuments(draft.documents);
        setMedia(draft.media);
        setOperations(draft.operations);
        setMenuDraft(draft.menuDraft);
        setKyc(draft.kyc);
        setTermsAccepted(Boolean(draft.kyc?.termsAcceptedAt));
        setPartnerAgreementAccepted(Boolean(draft.kyc?.partnerAgreementAcceptedAt));
        setSelectedCategory(draft.selectedCategory);
        setShopLocation(draft.shopLocation);
        latestDraftRef.current = draft;
        if (draft.form.phone) {
          setAutoFilledPhone(draft.form.phone);
        }
      } catch (error) {
        console.log("Error restoring onboarding draft:", error);
      } finally {
        if (!cancelled) {
          draftReadyRef.current = true;
          setHydratingDraft(false);
        }
      }
    };

    restoreDraft();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftReadyRef.current || hydratingDraft) return;

    const draft = buildOnboardingDraft();
    latestDraftRef.current = draft;

    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
    }

    draftSaveTimerRef.current = setTimeout(() => {
      saveOnboardingDraft(draft).catch((error: any) => {
        console.log("Draft autosave skipped:", error?.message || error);
      });
    }, 700);

    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
    };
  }, [activeStep, form, address, documents, media, operations, menuDraft, kyc, selectedCategory, shopLocation, hydratingDraft]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        flushOnboardingDraft().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
      flushOnboardingDraft().catch(() => {});
    };
  }, [hydratingDraft]);

  const filteredCities = useMemo(() => {
    if (!address.city || address.city.length < 2) return [];
    return INDIAN_CITIES.filter((city) => city.toLowerCase().includes(address.city.toLowerCase())).slice(0, 6);
  }, [address.city]);

  const uploadImageToCloudinary = async (asset: PickerAsset): Promise<string> => {
    const formData = new FormData();
    const filename = getUploadFilename(asset, "partner-document.jpg");
    const type = asset.mimeType || getUploadMimeType(filename);

    // @ts-ignore React Native FormData file object
    formData.append("image", { uri: asset.uri, type, name: filename });

    const uploadData = await uploadMultipart<UploadResponse["data"]>("/upload/image", formData);
    if (!uploadData?.success || !uploadData?.data?.url) {
      throw new Error(uploadData?.message || "Upload failed");
    }

    return uploadData.data.url;
  };

  const resolveDocumentPicker = async () => {
    const module: any = await import("expo-document-picker");
    const getDocumentAsync =
      module.getDocumentAsync ||
      module.default?.getDocumentAsync ||
      module.default?.default?.getDocumentAsync;

    if (typeof getDocumentAsync !== "function") {
      throw new Error("Document picker is unavailable in this app build.");
    }

    return getDocumentAsync;
  };

  const pickAsset = async (): Promise<PickerAsset | null> => {
    try {
      const getDocumentAsync = await resolveDocumentPicker();
      const result = await getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType
      };
    } catch (error: any) {
      console.error("Document picker module unavailable:", error);
      Alert.alert(
        "Picker Failed",
        error?.message || "Could not open the document picker."
      );
      return null;
    }
  };

  const getDocumentTitle = (docKey: Exclude<UploadingKey, null>) => {
    const doc = [...mandatoryDocs, ...optionalDocs].find((item) => item.key === docKey);
    if (doc) return doc.title;
    if (docKey === "cancelledChequeUrl") return "Cancelled Cheque";
    if (docKey === "bankPassbookUrl") return "Bank Passbook";
    if (docKey === "bankStatementUrl") return "Bank Statement";
    return "Document";
  };

  const pickAndPreviewDocument = async (docKey: UploadingKey) => {
    if (!docKey || pickerBusy || uploadingKey) return;

    try {
      setPickerBusy(true);
      const asset = await pickAsset();
      if (!asset?.uri) return;

      setPendingDocument({
        docKey,
        asset,
        title: getDocumentTitle(docKey)
      });
    } catch (error: any) {
      console.error("Document picker failed:", error);
      Alert.alert("Picker Failed", error.response?.data?.message || error.message || "Could not open your gallery.");
    } finally {
      setPickerBusy(false);
    }
  };

  const uploadPendingDocument = async () => {
    if (!pendingDocument) return;

    try {
      setUploadingKey(pendingDocument.docKey);
      const uploadedUrl = await uploadImageToCloudinary(pendingDocument.asset);
      setDocuments((prev) => ({ ...prev, [pendingDocument.docKey]: uploadedUrl }));
      setPendingDocument(null);
    } catch (error: any) {
      console.error("Document upload failed:", error);
      Alert.alert("Upload Failed", error.response?.data?.message || error.message || "Failed to upload document.");
    } finally {
      setUploadingKey(null);
    }
  };

  const captureShopLocation = async () => {
    try {
      setCapturingLocation(true);
      const Location = await loadLocationModule();
      if (!Location) {
        Alert.alert(
          "App update required",
          "This Partner app build does not include location support yet. Install the latest build to capture your shop GPS pin."
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "Open the Vyaha Partner app while standing at your shop and allow location access so we can pin its exact spot."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setShopLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      Alert.alert("Shop location captured", "Your shop pin is saved. You can update it later from Profile.");
    } catch (error: any) {
      Alert.alert("Could not capture location", error?.message || "Please try again from inside the shop.");
    } finally {
      setCapturingLocation(false);
    }
  };

  const pickMediaAsset = async (key: "shopImageUrl" | "bannerImageUrl" | "restaurantPhoto") => {
    if (pickerBusy || uploadingKey) return;
    try {
      setPickerBusy(true);
      const asset = await pickAsset();
      if (!asset?.uri) return;
      setUploadingKey(key);
      const uploadedUrl = await uploadImageToCloudinary(asset);
      if (key === "restaurantPhoto") {
        setMedia((prev) => ({
          ...prev,
          restaurantPhotosUrls: [...prev.restaurantPhotosUrls, uploadedUrl].slice(0, 5)
        }));
      } else {
        setMedia((prev) => ({ ...prev, [key]: uploadedUrl }));
      }
    } catch (error: any) {
      Alert.alert("Upload failed", error?.message || "Could not upload image.");
    } finally {
      setUploadingKey(null);
      setPickerBusy(false);
    }
  };

  const validateStep = (step: number, nextDocuments = documents, nextKyc = kyc) => {
    if (step === 0) {
      if (!form.ownerName || !form.restaurantName || !form.phone || !form.restaurantPhone) return "Please fill all basic details";
      if (form.phone.length !== 10) return "Enter a valid 10-digit phone number";
      if (form.restaurantPhone.length !== 10) return "Enter a valid 10-digit restaurant phone number";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email address";
    }

    if (step === 1) {
      if (!address.state || !address.city || !address.pincode || !address.area || !address.colony || !address.roadStreet) {
        return "Please fill all address fields";
      }
      if (!/^\d{6}$/.test(address.pincode)) return "Pincode must be exactly 6 digits";
    }

    if (step === 2 && !selectedCategory) {
      return "Please select a business category";
    }

    if (step === 3) {
      if (!nextKyc.fssaiVerified) return "Verify FSSAI license via Eko";
      if (!nextKyc.panVerified && !nextKyc.panSkipped) return "Verify PAN via Eko or skip for now";
      if (nextDocuments.gstRegistered === "yes" && !nextKyc.gstVerified) return "Verify GSTIN via Eko";
      if (!nextDocuments.gstRegistered) return "Please select whether you are GST registered";
    }

    if (step === 4) {
      const bankDone =
        nextKyc.bankVerificationStatus === "VERIFIED" ||
        nextKyc.bankDetailsSkipped ||
        nextKyc.bankVerificationStatus === "PENDING_ADMIN";
      if (!bankDone) return "Verify bank account or tap Skip for now";
    }

    if (step === 7) {
      if (!operations.openingTime.trim() || !operations.closingTime.trim()) return "Please set opening and closing hours";
    }

    return null;
  };

  const goNext = () => {
    const error = validateStep(activeStep);
    if (error) {
      Alert.alert("Missing Details", error);
      return;
    }

    setActiveStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => setActiveStep((current) => Math.max(current - 1, 0));

  const skipToNext = () => {
    if (activeStep === 4) {
      void skipPartnerBankFromStep();
      return;
    }
    if (activeStep === 6) {
      setActiveStep((current) => Math.min(current + 1, STEPS.length - 1));
      return;
    }
    if (activeStep === STEPS.length - 1) {
      void submit();
      return;
    }
    setActiveStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const skipPartnerBankFromStep = async () => {
    try {
      const { skipPartnerBank } = await import("../api/kyc.api");
      const result = await skipPartnerBank();
      setKyc(result.kyc);
      setActiveStep((current) => Math.min(current + 1, STEPS.length - 1));
    } catch (error: any) {
      Alert.alert("Could not skip", error?.message || "Please try again.");
    }
  };

  const submit = async (documentsOverride = documents) => {
    for (let step = 0; step < STEPS.length - 1; step += 1) {
      const validationError = validateStep(step, documentsOverride, kyc);
      if (validationError) {
        Alert.alert("Missing Details", validationError);
        setActiveStep(step);
        return;
      }
    }

    const agreementResult = await validateAndSaveAgreement(
      termsAccepted,
      partnerAgreementAccepted,
      kyc,
      setKyc
    );
    if (!agreementResult.ok) {
      Alert.alert("Agreement required", agreementResult.message || "Please accept the agreements.");
      setActiveStep(STEPS.length - 1);
      return;
    }

    try {
      setSubmitting(true);
      const userId = (await AsyncStorage.getItem("userId")) || "";
      const userStr = await AsyncStorage.getItem("user");
      const fallbackUserId = userStr ? JSON.parse(userStr).id : "";
      const docsToSubmit = documentsOverride;
      const shouldSubmitBankDetails = Boolean(
        kyc.bankVerificationStatus === "VERIFIED" || kyc.bankVerificationStatus === "PENDING_ADMIN"
      );
      const menuItems = menuDraft
        .filter((item) => item.name.trim() && Number(item.price) > 0)
        .map((item) => ({
          name: item.name.trim(),
          description: item.description.trim(),
          price: Number(item.price),
          isVegetarian: item.isVegetarian,
          imageUrl: item.imageUrl
        }));

      const requestData: any = {
        ownerName: kyc.panName || form.ownerName.trim(),
        restaurantName: form.restaurantName.trim(),
        phone: form.phone.trim(),
        ownerPhone: form.phone.trim(),
        restaurantPhone: form.restaurantPhone.trim(),
        email: form.email.trim(),
        address: {
          state: address.state.trim(),
          city: address.city.trim(),
          pincode: address.pincode.trim(),
          area: address.area.trim(),
          colony: address.colony.trim(),
          roadStreet: address.roadStreet.trim(),
          nearbyPlaces: address.nearbyPlaces
            .split(",")
            .map((place) => place.trim())
            .filter((place) => place.length > 0)
        },
        category: selectedCategory,
        userId: userId || fallbackUserId,
        media,
        operations,
        menuDraft: menuItems,
        termsAccepted: true,
        partnerAgreementAccepted: true,
        documents: {
          ...docsToSubmit,
          panNumber: (kyc.panNumber || docsToSubmit.panNumber).trim().toUpperCase(),
          fssaiNumber: (kyc.fssaiNumber || docsToSubmit.fssaiNumber).trim(),
          gstRegistered: docsToSubmit.gstRegistered === "yes",
          gstNumber: docsToSubmit.gstRegistered === "yes" ? (kyc.gstNumber || docsToSubmit.gstNumber).trim().toUpperCase() : "",
          ownerPanUrl: kyc.panVerified ? "eko-pan-verified" : docsToSubmit.panFrontUrl,
          fssaiUrl: kyc.fssaiVerified ? "eko-fssai-verified" : docsToSubmit.fssaiUrl,
          gstUrl: kyc.gstVerified ? "eko-gst-verified" : docsToSubmit.gstUrl,
          bankAccountHolderName: shouldSubmitBankDetails ? (kyc.bankAccountHolderName || "").trim() : "",
          bankAccountNumber: shouldSubmitBankDetails ? (kyc.bankAccountNumber || "").trim() : "",
          bankIfsc: shouldSubmitBankDetails ? (kyc.bankIfsc || "").trim().toUpperCase() : "",
          restaurantPhotosUrls: media.restaurantPhotosUrls,
          operatingHoursNote: operations.packagingNote
        }
      };

      if (shopLocation) {
        requestData.location = shopLocation;
      }

      await api.post("/partners/onboard", requestData);
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      await AsyncStorage.setItem("partnerPhone", form.phone);

      navigation.replace("ApplicationSubmitted", {
        ownerName: form.ownerName,
        restaurantName: form.restaurantName
      });
    } catch (error: any) {
      console.error("Submission error:", error);
      Alert.alert("Error", error.response?.data?.message || error.response?.data?.error || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderDocCard = (title: string, subtitle: string, docKey: keyof DocumentState, mandatory = false) => {
    const uploaded = Boolean(documents[docKey]);
    const isUploading = uploadingKey === docKey;
    const previewUrl = documents[docKey];

    return (
      <View key={docKey} style={styles.docCard}>
        <View style={styles.docHeader}>
          <View style={styles.docCopy}>
            <Text style={styles.docTitle}>
              {title} {mandatory ? "*" : ""}
            </Text>
            <Text style={styles.docSubtitle}>{subtitle}</Text>
          </View>
          <View style={[styles.docBadge, uploaded ? styles.docBadgeDone : styles.docBadgePending]}>
            <Text style={[styles.docBadgeText, uploaded ? styles.docBadgeDoneText : styles.docBadgePendingText]}>
              {uploaded ? "Added" : mandatory ? "Required" : "Optional"}
            </Text>
          </View>
        </View>

        {previewUrl ? (
          isPdfUri(previewUrl) ? (
            <View style={styles.pdfDocPreview}>
              <Text style={styles.pdfDocPreviewTag}>PDF</Text>
              <Text style={styles.pdfDocPreviewName} numberOfLines={1}>
                {previewUrl.split("/").pop()?.split("?")[0] || "Uploaded document"}
              </Text>
            </View>
          ) : (
            <Image source={{ uri: previewUrl }} style={styles.docPreview} resizeMode="cover" />
          )
        ) : null}

        <TouchableOpacity style={styles.docButton} onPress={() => pickAndPreviewDocument(docKey as UploadingKey)} disabled={isUploading || pickerBusy}>
          {isUploading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.docButtonText}>{uploaded ? "Replace" : "Choose Document"}</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderStepCard = () => {
    switch (activeStep) {
      case 0:
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic details</Text>
            <Text style={styles.sectionHint}>Start with the owner and shop details customers will see.</Text>

            <Text style={styles.label}>Owner name</Text>
            <TextInput placeholder="Enter full name" placeholderTextColor="#98A2B3" value={form.ownerName} onChangeText={(v) => setForm({ ...form, ownerName: v })} style={styles.input} />

            <Text style={styles.label}>Restaurant or shop name</Text>
            <TextInput placeholder="Enter restaurant or shop name" placeholderTextColor="#98A2B3" value={form.restaurantName} onChangeText={(v) => setForm({ ...form, restaurantName: v })} style={styles.input} />

            <Text style={styles.label}>Owner phone number</Text>
            <TextInput
              placeholder="10-digit owner mobile number"
              placeholderTextColor="#98A2B3"
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v.replace(/\D/g, "").slice(0, 10) })}
              keyboardType="number-pad"
              maxLength={10}
              style={[styles.input, autoFilledPhone ? styles.disabledInput : null]}
              editable={!autoFilledPhone}
            />
            {autoFilledPhone ? <Text style={styles.helperText}>Auto-filled from your login</Text> : null}

            <Text style={styles.label}>Restaurant phone number</Text>
            <TextInput
              placeholder="10-digit restaurant phone number"
              placeholderTextColor="#98A2B3"
              value={form.restaurantPhone}
              onChangeText={(v) => setForm({ ...form, restaurantPhone: v.replace(/\D/g, "").slice(0, 10) })}
              keyboardType="number-pad"
              maxLength={10}
              style={styles.input}
            />

            <Text style={styles.label}>Owner email (optional)</Text>
            <TextInput
              placeholder="owner@email.com"
              placeholderTextColor="#98A2B3"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        );

      case 1:
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Shop address</Text>
            <Text style={styles.sectionHint}>Give us the exact area so delivery partners can reach you without confusion.</Text>

            <Text style={styles.label}>State</Text>
            <TextInput placeholder="State" placeholderTextColor="#98A2B3" value={address.state} onChangeText={(v) => setAddress({ ...address, state: v })} style={styles.input} />

            <Text style={styles.label}>City or town</Text>
            <TextInput placeholder="City or town" placeholderTextColor="#98A2B3" value={address.city} onChangeText={(v) => setAddress({ ...address, city: v })} style={styles.input} />
            {filteredCities.length > 0 ? (
              <View style={styles.suggestionCard}>
                {filteredCities.map((city) => (
                  <TouchableOpacity key={city} style={styles.suggestionRow} onPress={() => setAddress({ ...address, city })}>
                    <Text style={styles.suggestionText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Pincode</Text>
                <TextInput placeholder="6 digits" placeholderTextColor="#98A2B3" value={address.pincode} onChangeText={(v) => setAddress({ ...address, pincode: v })} keyboardType="number-pad" maxLength={6} style={styles.input} />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Area</Text>
                <TextInput placeholder="Area / locality" placeholderTextColor="#98A2B3" value={address.area} onChangeText={(v) => setAddress({ ...address, area: v })} style={styles.input} />
              </View>
            </View>

            <Text style={styles.label}>Colony or society</Text>
            <TextInput placeholder="Colony / society" placeholderTextColor="#98A2B3" value={address.colony} onChangeText={(v) => setAddress({ ...address, colony: v })} style={styles.input} />

            <Text style={styles.label}>Road or street</Text>
            <TextInput placeholder="Road / street details" placeholderTextColor="#98A2B3" value={address.roadStreet} onChangeText={(v) => setAddress({ ...address, roadStreet: v })} style={styles.input} />

            <Text style={styles.label}>Nearby places</Text>
            <TextInput placeholder="Metro station, mall, landmark" placeholderTextColor="#98A2B3" value={address.nearbyPlaces} onChangeText={(v) => setAddress({ ...address, nearbyPlaces: v })} style={styles.input} />

            <Text style={styles.label}>Pin your shop (optional)</Text>
            <Text style={styles.helperText}>Tap once while standing inside the shop if you want to add an exact GPS pin.</Text>
            <TouchableOpacity style={[styles.primaryActionButton, capturingLocation && styles.primaryActionButtonDisabled]} onPress={captureShopLocation} disabled={capturingLocation}>
              {capturingLocation ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.primaryActionButtonText}>{shopLocation ? "Re-capture shop location" : "Use my shop location"}</Text>}
            </TouchableOpacity>
            {shopLocation ? (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>Location captured</Text>
              </View>
            ) : null}
          </View>
        );

      case 2:
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Business category</Text>
            <Text style={styles.sectionHint}>Pick the closest match. We will use this to tailor your experience and menu defaults.</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const selected = selectedCategory === cat;
                return (
                  <TouchableOpacity key={cat} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={() => setSelectedCategory(cat)}>
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{CATEGORY_LABELS[cat]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>PAN, FSSAI & GST</Text>
            <LegalDocumentsStep
              kyc={kyc}
              onKycChange={setKyc}
              ownerName={form.ownerName}
              restaurantName={form.restaurantName}
              panNumber={documents.panNumber}
              onPanNumberChange={(value) => setDocuments((prev) => ({ ...prev, panNumber: value }))}
              fssaiNumber={documents.fssaiNumber}
              onFssaiNumberChange={(value) => setDocuments((prev) => ({ ...prev, fssaiNumber: value }))}
              gstRegistered={documents.gstRegistered}
              onGstRegisteredChange={(value) =>
                setDocuments((prev) => ({
                  ...prev,
                  gstRegistered: value,
                  gstNumber: value === "yes" ? prev.gstNumber : "",
                  gstUrl: value === "yes" ? prev.gstUrl : ""
                }))
              }
              gstNumber={documents.gstNumber}
              onGstNumberChange={(value) => setDocuments((prev) => ({ ...prev, gstNumber: value }))}
            />
          </View>
        );

      case 4:
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bank / payout details</Text>
            <BankStep kyc={kyc} onKycChange={setKyc} defaultHolderName={kyc.panName || form.ownerName} />
          </View>
        );

      case 5:
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Restaurant photos</Text>
            <MediaStep media={media} uploadingKey={uploadingKey} onPick={pickMediaAsset} />
          </View>
        );

      case 6:
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Menu setup</Text>
            <MenuDraftStep items={menuDraft} onChange={setMenuDraft} />
          </View>
        );

      case 7:
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Operating information</Text>
            <OperationsStep operations={operations} onChange={setOperations} />
          </View>
        );

      case 8:
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Review & submit</Text>
            <AgreementStep
              kyc={kyc}
              onKycChange={setKyc}
              termsAccepted={termsAccepted}
              partnerAgreementAccepted={partnerAgreementAccepted}
              onTermsAcceptedChange={setTermsAccepted}
              onPartnerAgreementAcceptedChange={setPartnerAgreementAccepted}
              summary={{
                restaurantName: form.restaurantName,
                ownerName: kyc.panName || form.ownerName,
                city: address.city,
                category: CATEGORY_LABELS[selectedCategory] || selectedCategory
              }}
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (hydratingDraft) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={partnerTheme.colors.primary} />
          <Text style={styles.loadingTitle}>Restoring your draft</Text>
          <Text style={styles.loadingSubtitle}>We are bringing back your saved onboarding progress.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: 10,
          paddingBottom: insets.bottom + 180 + androidKeyboardPadding(keyboardHeight),
          flexGrow: 1
        }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
      >
        <Modal
          visible={Boolean(pendingDocument)}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!uploadingKey) setPendingDocument(null);
          }}
        >
          <View style={styles.previewOverlay}>
            <View style={styles.previewSheet}>
              <View style={styles.previewHeader}>
                <View style={styles.previewTitleWrap}>
                  <Text style={styles.previewEyebrow}>Ready to upload</Text>
                  <Text style={styles.previewTitle}>{pendingDocument?.title || "Document"}</Text>
                </View>
                <TouchableOpacity style={styles.previewCloseButton} onPress={() => setPendingDocument(null)} disabled={uploadingKey !== null}>
                  <Text style={styles.previewCloseText}>Close</Text>
                </TouchableOpacity>
              </View>

              {pendingDocument ? (
                isPdfUri(pendingDocument.asset.uri) ? (
                  <View style={styles.pdfPreviewBox}>
                    <Text style={styles.pdfPreviewIcon}>PDF</Text>
                    <Text style={styles.pdfPreviewText} numberOfLines={1}>
                      {pendingDocument.asset.fileName || "Selected PDF"}
                    </Text>
                  </View>
                ) : (
                  <Image source={{ uri: pendingDocument.asset.uri }} style={styles.previewImage} resizeMode="contain" />
                )
              ) : null}

              <Text style={styles.previewHelp}>Make sure the full document is visible, clear, and readable before uploading.</Text>

              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.previewSecondaryButton}
                  onPress={async () => {
                    const docKey = pendingDocument?.docKey || null;
                    setPendingDocument(null);
                    if (docKey) {
                      await pickAndPreviewDocument(docKey);
                    }
                  }}
                  disabled={uploadingKey !== null}
                >
                  <Text style={styles.previewSecondaryText}>Choose Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.previewPrimaryButton} onPress={uploadPendingDocument} disabled={uploadingKey !== null}>
                  {uploadingKey ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.previewPrimaryText}>Upload</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Vyaha Partner</Text>
          <Text style={styles.heroTitle}>Set up your shop in a few guided steps</Text>
          <Text style={styles.heroSubtitle}>Verify PAN, FSSAI and GST with Eko, add shop details, then submit for Vyaha review.</Text>
        </View>

        <View style={styles.stepperCard}>
          <View style={styles.stepperHeader}>
            <Text style={styles.stepperCount}>Step {activeStep + 1} of {STEPS.length}</Text>
            <Text style={styles.stepperTitle}>{STEPS[activeStep].title}</Text>
            <Text style={styles.stepperSubtitle}>{STEPS[activeStep].subtitle}</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${((activeStep + 1) / STEPS.length) * 100}%` }]} />
          </View>
          <View style={styles.stepPills}>
            {STEPS.map((step, index) => {
              const active = index === activeStep;
              const done = index < activeStep;
              return (
                <TouchableOpacity
                  key={step.key}
                  style={[styles.stepPill, active && styles.stepPillActive, done && styles.stepPillDone]}
                  onPress={() => setActiveStep(index)}
                  activeOpacity={0.85}
                  disabled={submitting || uploadingKey !== null}
                >
                  <Text style={[styles.stepPillText, active && styles.stepPillTextActive, done && styles.stepPillTextDone]}>{index + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {renderStepCard()}

        <View style={styles.footerActions}>
          <TouchableOpacity style={[styles.secondaryButton, activeStep === 0 && styles.disabledButton]} onPress={goBack} disabled={activeStep === 0 || submitting}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.draftButton} onPress={handleSaveDraft} disabled={submitting || savingDraft || uploadingKey !== null}>
            {savingDraft ? <ActivityIndicator color={partnerTheme.colors.primary} size="small" /> : <Text style={styles.draftButtonText}>Save draft</Text>}
          </TouchableOpacity>

          {(activeStep === 4 || activeStep === 6) ? (
            <TouchableOpacity style={styles.skipButton} onPress={skipToNext} disabled={submitting}>
              <Text style={styles.skipButtonText}>{activeStep === 4 ? "Skip bank" : "Skip menu"}</Text>
            </TouchableOpacity>
          ) : null}

          {activeStep === STEPS.length - 1 ? (
            <TouchableOpacity style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]} onPress={() => submit()} disabled={submitting || uploadingKey !== null}>
              {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.primaryButtonText}>Submit for Approval</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={goNext} disabled={submitting || uploadingKey !== null}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: partnerTheme.colors.background
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: partnerTheme.colors.background
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "800",
    color: partnerTheme.colors.text,
    textAlign: "center"
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: partnerTheme.colors.muted,
    textAlign: "center"
  },
  keyboard: {
    flex: 1,
    backgroundColor: partnerTheme.colors.background
  },
  container: {
    flex: 1,
    backgroundColor: partnerTheme.colors.background
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 28,
    backgroundColor: partnerTheme.colors.primary
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#DDEBFF",
    marginBottom: 10
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: partnerTheme.colors.card
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#EAF3FF"
  },
  stepperCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 16
  },
  stepperHeader: {
    marginBottom: 12
  },
  stepperCount: {
    fontSize: 11,
    fontWeight: "900",
    color: partnerTheme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  stepperTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "900",
    color: partnerTheme.colors.primaryDark
  },
  stepperSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: partnerTheme.colors.muted
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: partnerTheme.colors.neutralSoft,
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: partnerTheme.colors.primary
  },
  stepPills: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14
  },
  stepPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: partnerTheme.colors.neutralSoft
  },
  stepPillActive: {
    backgroundColor: partnerTheme.colors.primary
  },
  stepPillDone: {
    backgroundColor: partnerTheme.colors.successSoft
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: partnerTheme.colors.mutedDark
  },
  stepPillTextActive: {
    color: partnerTheme.colors.card
  },
  stepPillTextDone: {
    color: partnerTheme.colors.success
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: partnerTheme.colors.primaryDark,
    marginBottom: 8
  },
  sectionHint: {
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 18,
    color: partnerTheme.colors.muted
  },
  subSectionTitle: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 15,
    fontWeight: "900",
    color: partnerTheme.colors.primaryDark
  },
  subSectionHint: {
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 18,
    color: partnerTheme.colors.muted
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: partnerTheme.colors.mutedDark,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: partnerTheme.colors.text,
    backgroundColor: partnerTheme.colors.surface,
    marginBottom: 12
  },
  disabledInput: {
    backgroundColor: "#F1ECE6",
    color: "#7B6D63"
  },
  helperText: {
    marginTop: -6,
    marginBottom: 10,
    fontSize: 12,
    color: partnerTheme.colors.muted
  },
  suggestionCard: {
    marginTop: -4,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    overflow: "hidden",
    backgroundColor: partnerTheme.colors.card
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: partnerTheme.colors.borderSoft
  },
  suggestionText: {
    fontSize: 14,
    color: partnerTheme.colors.primaryDark
  },
  row: {
    flexDirection: "row"
  },
  half: {
    flex: 1,
    marginRight: 10
  },
  primaryActionButton: {
    alignSelf: "stretch",
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10
  },
  primaryActionButtonDisabled: {
    backgroundColor: "#9FC8FF"
  },
  primaryActionButtonText: {
    color: partnerTheme.colors.card,
    fontSize: 15,
    fontWeight: "800"
  },
  locationBadge: {
    alignSelf: "flex-start",
    backgroundColor: partnerTheme.colors.successSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CDE8D4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12
  },
  locationBadgeText: {
    color: "#216E39",
    fontSize: 12,
    fontWeight: "800"
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: partnerTheme.colors.neutralSoft,
    marginRight: 8,
    marginBottom: 8
  },
  categoryChipSelected: {
    backgroundColor: partnerTheme.colors.primary
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: partnerTheme.colors.mutedDark
  },
  categoryChipTextSelected: {
    color: partnerTheme.colors.card
  },
  docCard: {
    backgroundColor: partnerTheme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 14,
    marginBottom: 12
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  docCopy: {
    flex: 1,
    marginRight: 12
  },
  docTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: partnerTheme.colors.primaryDark,
    marginBottom: 4
  },
  docSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: partnerTheme.colors.muted
  },
  docBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  docBadgePending: {
    backgroundColor: partnerTheme.colors.neutralSoft
  },
  docBadgeDone: {
    backgroundColor: partnerTheme.colors.successSoft
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  docBadgePendingText: {
    color: partnerTheme.colors.mutedDark
  },
  docBadgeDoneText: {
    color: "#216E39"
  },
  docPreview: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 12
  },
  pdfDocPreview: {
    width: "100%",
    minHeight: 124,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    backgroundColor: partnerTheme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    padding: 14
  },
  pdfDocPreviewTag: {
    fontSize: 18,
    fontWeight: "900",
    color: partnerTheme.colors.primary,
    marginBottom: 8
  },
  pdfDocPreviewName: {
    fontSize: 12,
    fontWeight: "700",
    color: partnerTheme.colors.primaryDark,
    textAlign: "center"
  },
  docButton: {
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 10
  },
  docButtonText: {
    color: partnerTheme.colors.card,
    fontSize: 13,
    fontWeight: "800"
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 6
  },
  secondaryButton: {
    flex: 0.8,
    backgroundColor: partnerTheme.colors.neutralSoft,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border
  },
  secondaryButtonText: {
    color: partnerTheme.colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  draftButton: {
    flex: 0.9,
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    minHeight: 48
  },
  draftButtonText: {
    color: partnerTheme.colors.primary,
    fontSize: 14,
    fontWeight: "800"
  },
  skipButton: {
    flex: 1,
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border
  },
  skipButtonText: {
    color: partnerTheme.colors.primary,
    fontSize: 14,
    fontWeight: "800"
  },
  primaryButton: {
    flex: 1.1,
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15
  },
  primaryButtonDisabled: {
    backgroundColor: "#9FC8FF"
  },
  primaryButtonText: {
    color: partnerTheme.colors.card,
    fontSize: 14,
    fontWeight: "800"
  },
  disabledButton: {
    opacity: 0.5
  },
  previewOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(26, 18, 11, 0.56)"
  },
  previewSheet: {
    maxHeight: "88%",
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 24,
    backgroundColor: partnerTheme.colors.card,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 16
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12
  },
  previewTitleWrap: {
    flex: 1,
    marginRight: 12
  },
  previewEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: partnerTheme.colors.primary,
    marginBottom: 4
  },
  previewTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    color: partnerTheme.colors.primaryDark
  },
  previewCloseButton: {
    borderRadius: 14,
    backgroundColor: partnerTheme.colors.neutralSoft,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  previewCloseText: {
    color: partnerTheme.colors.mutedDark,
    fontSize: 12,
    fontWeight: "800"
  },
  previewImage: {
    width: "100%",
    height: 360,
    borderRadius: 18,
    backgroundColor: "#2C2018"
  },
  pdfPreviewBox: {
    width: "100%",
    minHeight: 300,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    backgroundColor: partnerTheme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    padding: 18
  },
  pdfPreviewIcon: {
    fontSize: 42,
    fontWeight: "900",
    color: partnerTheme.colors.primary,
    marginBottom: 8
  },
  pdfPreviewText: {
    fontSize: 13,
    fontWeight: "700",
    color: partnerTheme.colors.primaryDark,
    textAlign: "center"
  },
  previewHelp: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: partnerTheme.colors.muted
  },
  previewActions: {
    flexDirection: "row",
    marginTop: 14
  },
  previewSecondaryButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: partnerTheme.colors.neutralSoft,
    alignItems: "center",
    paddingVertical: 14
  },
  previewSecondaryText: {
    color: partnerTheme.colors.mutedDark,
    fontSize: 13,
    fontWeight: "800"
  },
  previewPrimaryButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: partnerTheme.colors.primary,
    alignItems: "center",
    paddingVertical: 14
  },
  previewPrimaryText: {
    color: partnerTheme.colors.card,
    fontSize: 13,
    fontWeight: "800"
  }
});
