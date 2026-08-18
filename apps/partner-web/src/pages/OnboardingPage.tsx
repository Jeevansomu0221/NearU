import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAccessToken,
  getOnboardingDraft,
  getPartnerKycStatus,
  getStoredPhone,
  getStoredUser,
  saveOnboardingDraft,
  skipPartnerBank,
  resolveExactGoogleShopPin,
  reverseGeocodeLocation,
  submitOnboarding,
  uploadImage
} from "@vyaha/api-client";
import partnerLogo from "../assets/vyaha-partner-text-logo.png";
import { pickLocationOnMap } from "../hooks/useGeolocation";
import { CATEGORY_LABELS, CATEGORIES, DRAFT_STORAGE_KEY, ONBOARDING_STEPS } from "../onboarding/constants";
import { buildDraftPayload, normalizeDraft } from "../onboarding/draft";
import AgreementStep, { validateAndSaveAgreement } from "../onboarding/steps/AgreementStep";
import BankStep from "../onboarding/steps/BankStep";
import LegalDocumentsStep from "../onboarding/steps/LegalDocumentsStep";
import MediaStep from "../onboarding/steps/MediaStep";
import MenuDraftStep from "../onboarding/steps/MenuDraftStep";
import OperationsStep from "../onboarding/steps/OperationsStep";
import {
  defaultDocuments,
  defaultMedia,
  defaultOperations,
  emptyMenuItem,
  type OnboardingDraft
} from "../onboarding/types";
import { validateStep } from "../onboarding/validate";
import AddressPinConfirmModal from "../components/AddressPinConfirmModal";
import "../onboarding/onboarding.css";

const STEPS = ONBOARDING_STEPS;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [hydrating, setHydrating] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [partnerAgreementAccepted, setPartnerAgreementAccepted] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [pinConfirmVisible, setPinConfirmVisible] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ latitude: number; longitude: number; formattedAddress?: string } | null>(null);
  const [confirmedAddressKey, setConfirmedAddressKey] = useState("");

  const [form, setForm] = useState({
    ownerName: "",
    restaurantName: "",
    phone: "",
    restaurantPhone: "",
    email: ""
  });
  const [address, setAddress] = useState({
    floor: "",
    state: "",
    city: "",
    pincode: "",
    area: "",
    colony: "",
    roadStreet: "",
    nearbyPlaces: ""
  });
  const [documents, setDocuments] = useState(defaultDocuments);
  const [media, setMedia] = useState(defaultMedia);
  const [operations, setOperations] = useState(defaultOperations);
  const [menuDraft, setMenuDraft] = useState([emptyMenuItem()]);
  const [kyc, setKyc] = useState<OnboardingDraft["kyc"]>({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [shopLocation, setShopLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyDraft = useCallback((draft: OnboardingDraft) => {
    setActiveStep(draft.activeStep);
    setForm(draft.form);
    setAddress(draft.address);
    setDocuments(draft.documents);
    setMedia(draft.media);
    setOperations(draft.operations);
    setMenuDraft(draft.menuDraft.length ? draft.menuDraft : [emptyMenuItem()]);
    setKyc(draft.kyc || {});
    setSelectedCategory(draft.selectedCategory);
    setShopLocation(draft.shopLocation);
    if (draft.shopLocation) {
      setConfirmedAddressKey(
        JSON.stringify({
          shopName: draft.form.restaurantName.trim(),
          floor: String(draft.address.floor || "").trim(),
          state: draft.address.state.trim(),
          city: draft.address.city.trim(),
          pincode: draft.address.pincode.trim(),
          area: draft.address.area.trim(),
          colony: draft.address.colony.trim(),
          roadStreet: draft.address.roadStreet.trim(),
          nearbyPlaces: draft.address.nearbyPlaces
        })
      );
    }
  }, []);

  const currentDraft = (): OnboardingDraft =>
    buildDraftPayload({
      activeStep,
      form,
      address,
      documents,
      media,
      operations,
      menuDraft,
      kyc,
      selectedCategory,
      shopLocation
    });

  const persistDraft = useCallback(async () => {
    const draft = currentDraft();
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    try {
      await saveOnboardingDraft(draft);
    } catch {
      // offline or unauthenticated — local draft still saved
    }
  }, [activeStep, form, address, documents, media, operations, menuDraft, kyc, selectedCategory, shopLocation]);

  useEffect(() => {
    const boot = async () => {
      const token = await getAccessToken();
      const phone = getStoredPhone();
      if (!token || !phone) {
        navigate("/login", { replace: true });
        return;
      }

      let localDraft: OnboardingDraft | null = null;
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) localDraft = normalizeDraft(JSON.parse(raw));
      } catch {
        localDraft = null;
      }

      let remoteDraft: OnboardingDraft | null = null;
      let remoteUpdatedAt = 0;
      try {
        const res = await getOnboardingDraft();
        if (res.success && res.data) {
          remoteDraft = normalizeDraft(res.data);
          remoteUpdatedAt = Date.parse(String((res.data as { updatedAt?: string }).updatedAt || "")) || 0;
        }
      } catch {
        remoteDraft = null;
      }

      const localUpdatedAt = Date.parse(localDraft?.updatedAt || "") || 0;
      const picked =
        !remoteDraft && !localDraft
          ? null
          : !remoteDraft
            ? localDraft
            : !localDraft
              ? remoteDraft
              : localUpdatedAt >= remoteUpdatedAt
                ? localDraft
                : remoteDraft;

      if (picked) {
        applyDraft(picked);
      } else {
        setForm((f) => ({ ...f, phone, restaurantPhone: f.restaurantPhone || phone }));
      }

      try {
        const kycStatus = await getPartnerKycStatus();
        setKyc((prev) => ({ ...prev, ...kycStatus }));
      } catch {
        // optional
      }

      setHydrating(false);
    };
    void boot();
  }, [applyDraft, navigate]);

  useEffect(() => {
    if (hydrating) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistDraft();
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrating, persistDraft, activeStep, form, address, documents, media, operations, menuDraft, kyc, selectedCategory, shopLocation]);

  const mergeGeoIntoAddress = (geo: {
    state?: string;
    city?: string;
    pincode?: string;
    area?: string;
    buildingApartmentName?: string;
    streetRoadName?: string;
    formattedAddress?: string;
  }) => {
    setAddress((current) => ({
      ...current,
      state: current.state.trim() || geo.state || "",
      city: current.city.trim() || geo.city || "",
      pincode: current.pincode.trim() || geo.pincode || "",
      area: current.area.trim() || geo.area || "",
      colony: current.colony.trim() || geo.buildingApartmentName || "",
      roadStreet: current.roadStreet.trim() || geo.streetRoadName || "",
      nearbyPlaces: current.nearbyPlaces.trim() || geo.formattedAddress || ""
    }));
  };

  const addressFingerprint = () =>
    JSON.stringify({
      shopName: form.restaurantName.trim(),
      floor: address.floor.trim(),
      state: address.state.trim(),
      city: address.city.trim(),
      pincode: address.pincode.trim(),
      area: address.area.trim(),
      colony: address.colony.trim(),
      roadStreet: address.roadStreet.trim(),
      nearbyPlaces: address.nearbyPlaces
    });

  const addressLines = () =>
    [
      form.restaurantName,
      address.floor ? `Floor ${address.floor}` : "",
      address.roadStreet,
      address.colony,
      address.area,
      [address.city, address.state, address.pincode].filter(Boolean).join(", ")
    ].filter(Boolean);

  const openAddressPinConfirm = async (startingPin?: {
    latitude: number;
    longitude: number;
    formattedAddress?: string;
  }) => {
    if (!startingPin) {
      const validationError = validateStep(1, form, address, selectedCategory, documents, kyc, operations);
      if (validationError) {
        setError(validationError);
        return false;
      }
    }

    if (startingPin) {
      setPendingPin({
        latitude: startingPin.latitude,
        longitude: startingPin.longitude,
        formattedAddress: startingPin.formattedAddress
      });
      setPinConfirmVisible(true);
      return true;
    }

    setLocatingAddress(true);
    setError("");
    try {
      const pin = await resolveExactGoogleShopPin({
        shopName: form.restaurantName.trim(),
        restaurantName: form.restaurantName.trim(),
        roadStreet: address.roadStreet.trim(),
        colony: address.colony.trim(),
        area: address.area.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pincode: address.pincode.trim(),
        nearbyPlaces: address.nearbyPlaces.trim()
      });
      setPendingPin(pin);
      setPinConfirmVisible(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check the shop name, street, area, city, and pincode.");
      return false;
    } finally {
      setLocatingAddress(false);
    }
  };

  const handleConfirmShopPin = (pin: { latitude: number; longitude: number }) => {
    setShopLocation(pin);
    setConfirmedAddressKey(addressFingerprint());
    setPinConfirmVisible(false);
    setPendingPin(null);
    if (activeStep === 1) {
      setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
    void reverseGeocodeLocation(pin.latitude, pin.longitude)
      .then((geoResult) => {
        if (geoResult.success && geoResult.data) {
          mergeGeoIntoAddress(geoResult.data);
        }
      })
      .catch(() => {});
  };

  const captureLocation = async () => {
    setCapturingLocation(true);
    setError("");
    try {
      const coords = await pickLocationOnMap();
      if (!coords) {
        setError("Could not capture location. Allow location access or try again inside your shop.");
        return;
      }

      try {
        const result = await reverseGeocodeLocation(coords.latitude, coords.longitude);
        if (result.success && result.data) {
          mergeGeoIntoAddress(result.data);
        }
      } catch {
        // Keep the live GPS pin even if address text cannot be read.
      }

      await openAddressPinConfirm(coords);
    } finally {
      setCapturingLocation(false);
    }
  };

  const uploadMedia = async (key: "shopImageUrl" | "bannerImageUrl" | "restaurantPhoto", file: File) => {
    setUploadingKey(key);
    setError("");
    try {
      const res = await uploadImage(file, "partner-media");
      if (!res.success || !res.data?.url) throw new Error("Upload failed");
      if (key === "restaurantPhoto") {
        setMedia((prev) => ({
          ...prev,
          restaurantPhotosUrls: [...prev.restaurantPhotosUrls, res.data!.url].slice(0, 5)
        }));
      } else {
        setMedia((prev) => ({ ...prev, [key]: res.data!.url }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setUploadingKey(null);
    }
  };

  const uploadDocument = async (key: "fssaiUrl" | "gstUrl", file: File) => {
    setUploadingKey(key);
    setError("");
    try {
      const res = await uploadImage(file, "partner-docs");
      if (!res.success || !res.data?.url) throw new Error("Upload failed");
      setDocuments((prev) => ({ ...prev, [key]: res.data!.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload document");
    } finally {
      setUploadingKey(null);
    }
  };

  const goNext = async () => {
    const validationError = validateStep(activeStep, form, address, selectedCategory, documents, kyc, operations);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    if (activeStep === 1) {
      if (shopLocation && confirmedAddressKey === addressFingerprint()) {
        setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
        return;
      }
      await openAddressPinConfirm();
      return;
    }
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError("");
    setActiveStep((s) => Math.max(s - 1, 0));
  };

  const skipToNext = async () => {
    if (activeStep === 4) {
      try {
        const result = await skipPartnerBank();
        setKyc(result.kyc);
        setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not skip bank");
      }
      return;
    }
    if (activeStep === 6) {
      setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
      return;
    }
    goNext();
  };

  const submit = async () => {
    for (let step = 0; step < STEPS.length - 1; step += 1) {
      const validationError = validateStep(step, form, address, selectedCategory, documents, kyc, operations);
      if (validationError) {
        setError(validationError);
        setActiveStep(step);
        return;
      }
    }

    const agreementResult = await validateAndSaveAgreement(termsAccepted, partnerAgreementAccepted, kyc, setKyc);
    if (!agreementResult.ok) {
      setError(agreementResult.message || "Please accept the agreements.");
      setActiveStep(STEPS.length - 1);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const user = getStoredUser();
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

      const payload: Record<string, unknown> = {
        ownerName: kyc.panName || form.ownerName.trim(),
        restaurantName: form.restaurantName.trim(),
        phone: form.phone.trim(),
        ownerPhone: form.phone.trim(),
        restaurantPhone: form.restaurantPhone.trim(),
        email: form.email.trim(),
        address: {
          floor: address.floor.trim(),
          state: address.state.trim(),
          city: address.city.trim(),
          pincode: address.pincode.trim(),
          area: address.area.trim(),
          colony: address.colony.trim(),
          roadStreet: address.roadStreet.trim(),
          nearbyPlaces: address.nearbyPlaces
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        },
        category: selectedCategory,
        userId: user?.id,
        media,
        operations,
        menuDraft: menuItems,
        termsAccepted: true,
        partnerAgreementAccepted: true,
        documents: {
          ...documents,
          panNumber: (kyc.panNumber || documents.panNumber).trim().toUpperCase(),
          fssaiNumber: documents.fssaiNumber.trim(),
          gstRegistered: documents.gstRegistered === "yes",
          gstNumber: documents.gstRegistered === "yes" ? documents.gstNumber.trim().toUpperCase() : "",
          ownerPanUrl: kyc.panVerified ? "eko-pan-verified" : documents.panFrontUrl,
          fssaiUrl: documents.fssaiUrl,
          gstUrl: documents.gstRegistered === "yes" ? documents.gstUrl : "",
          bankAccountHolderName: shouldSubmitBankDetails ? (kyc.bankAccountHolderName || "").trim() : "",
          bankAccountNumber: shouldSubmitBankDetails ? (kyc.bankAccountNumber || "").trim() : "",
          bankIfsc: shouldSubmitBankDetails ? (kyc.bankIfsc || "").trim().toUpperCase() : "",
          restaurantPhotosUrls: media.restaurantPhotosUrls,
          operatingHoursNote: operations.packagingNote
        }
      };

      if (shopLocation) payload.location = shopLocation;

      await submitOnboarding(payload);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      navigate("/submitted", {
        replace: true,
        state: { ownerName: form.ownerName, restaurantName: form.restaurantName }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="onb-step">
            <label className="field">
              <span>Owner name *</span>
              <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            </label>
            <label className="field">
              <span>Restaurant name *</span>
              <input value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} />
            </label>
            <label className="field">
              <span>Owner phone *</span>
              <input value={form.phone} readOnly title="Phone from login" />
            </label>
            <label className="field">
              <span>Restaurant phone *</span>
              <input
                value={form.restaurantPhone}
                onChange={(e) => setForm({ ...form, restaurantPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                inputMode="numeric"
              />
            </label>
            <label className="field">
              <span>Email (optional)</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          </div>
        );
      case 1:
        return (
          <div className="onb-step onb-address">
            <p className="onb-hint">
              Enter the shop as it appears on Google Maps. Continue places that exact Google pin so you can confirm it.
            </p>
            <button type="button" className="btn" onClick={captureLocation} disabled={capturingLocation || locatingAddress}>
              {capturingLocation ? "Reading location…" : "Use current location"}
            </button>
            {shopLocation ? <p className="onb-verified"><strong>Shop pin confirmed</strong></p> : null}
            <label className="field">
              <span>Shop name *</span>
              <input
                value={form.restaurantName}
                onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
                placeholder="As it appears on Google Maps"
              />
            </label>
            <label className="field">
              <span>Floor</span>
              <input
                value={address.floor}
                onChange={(e) => setAddress({ ...address, floor: e.target.value })}
                placeholder="Ground / 1st / 2nd"
              />
            </label>
            <p className="onb-hint">Optional. Helps riders find the shop inside a mall or building.</p>
            {(["state", "city", "pincode", "area", "colony", "roadStreet"] as const).map((key) => (
              <label className="field" key={key}>
                <span>
                  {key === "roadStreet" ? "Road / street *" : `${key.charAt(0).toUpperCase()}${key.slice(1)} *`}
                </span>
                <input
                  value={address[key]}
                  onChange={(e) =>
                    setAddress({
                      ...address,
                      [key]: key === "pincode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value
                    })
                  }
                />
              </label>
            ))}
            <label className="field">
              <span>Nearby places (optional)</span>
              <input value={address.nearbyPlaces} onChange={(e) => setAddress({ ...address, nearbyPlaces: e.target.value })} />
            </label>
          </div>
        );
      case 2:
        return (
          <div className="onb-step">
            <div className="onb-chips">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`onb-chip ${selectedCategory === cat ? "onb-chip--active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <LegalDocumentsStep
            kyc={kyc}
            onKycChange={setKyc}
            ownerName={form.ownerName}
            restaurantName={form.restaurantName}
            panNumber={documents.panNumber}
            onPanNumberChange={(v) => setDocuments((d) => ({ ...d, panNumber: v }))}
            fssaiNumber={documents.fssaiNumber}
            onFssaiNumberChange={(v) => setDocuments((d) => ({ ...d, fssaiNumber: v }))}
            fssaiUrl={documents.fssaiUrl}
            gstRegistered={documents.gstRegistered}
            onGstRegisteredChange={(v) =>
              setDocuments((d) => ({
                ...d,
                gstRegistered: v,
                gstNumber: v === "yes" ? d.gstNumber : "",
                gstUrl: v === "yes" ? d.gstUrl : ""
              }))
            }
            gstNumber={documents.gstNumber}
            onGstNumberChange={(v) => setDocuments((d) => ({ ...d, gstNumber: v }))}
            gstUrl={documents.gstUrl}
            uploadingKey={uploadingKey}
            onUploadDocument={uploadDocument}
          />
        );
      case 4:
        return <BankStep kyc={kyc} onKycChange={setKyc} defaultHolderName={kyc.panName || form.ownerName} />;
      case 5:
        return <MediaStep media={media} uploadingKey={uploadingKey} onPick={uploadMedia} />;
      case 6:
        return <MenuDraftStep items={menuDraft} onChange={setMenuDraft} />;
      case 7:
        return <OperationsStep operations={operations} onChange={setOperations} />;
      case 8:
        return (
          <AgreementStep
            kyc={kyc}
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
        );
      default:
        return null;
    }
  };

  if (hydrating) {
    return (
      <div className="partner-app onb-page" data-theme="light">
        <p className="onb-loading">Restoring your draft…</p>
      </div>
    );
  }

  return (
    <div className="partner-app onb-page" data-theme="light">
      <header className="onb-header">
        <Link className="onb-brand" to="https://www.vyaha.com">
          <img src={partnerLogo} alt="Vyaha Partner" className="onb-brand__logo" />
        </Link>
        <div className="onb-header__meta">
          <span className="onb-save-state"><i /> Draft saved automatically</span>
          <span className="onb-step-count">Step {activeStep + 1} of {STEPS.length}</span>
        </div>
      </header>

      <main className="onb-layout">
        <aside className="onb-sidebar">
          <div className="onb-sidebar__intro">
            <span>APPLICATION</span>
            <h2>Set up your restaurant</h2>
            <p>Complete each section to submit your application.</p>
          </div>
          <nav className="onb-step-list" aria-label="Onboarding progress">
            {STEPS.map((step, index) => (
              <button
                key={step.key}
                type="button"
                className={`onb-step-nav ${index === activeStep ? "is-active" : ""} ${index < activeStep ? "is-complete" : ""}`}
                onClick={() => {
                  if (index <= activeStep) {
                    setError("");
                    setActiveStep(index);
                  }
                }}
                disabled={index > activeStep}
              >
                <span>{index < activeStep ? "✓" : index + 1}</span>
                <p><strong>{step.title}</strong><small>{step.subtitle}</small></p>
              </button>
            ))}
          </nav>
          <div className="onb-help">
            <span>Need help?</span>
            <a href="mailto:support@vyaha.com">Contact partner support</a>
          </div>
        </aside>

        <section className="onb-content">
          <div className="onb-mobile-progress">
            <span>{activeStep + 1} of {STEPS.length}</span>
            <div className="onb-progress">
              <div className="onb-progress__bar" style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>

          <div className="onb-title-block">
            <span className="onb-eyebrow">STEP {activeStep + 1}</span>
            <h1>{STEPS[activeStep].title}</h1>
            <p>{STEPS[activeStep].subtitle}</p>
          </div>

          <div className="card onb-card">{renderStep()}</div>

          {error ? <p className="onb-error" role="alert">{error}</p> : null}

          <div className="onb-actions">
            <div>
              {activeStep > 0 ? (
                <button type="button" className="btn secondary" onClick={goBack} disabled={submitting}>
                  ← Back
                </button>
              ) : null}
            </div>
            <div>
              {(activeStep === 4 || activeStep === 6) && activeStep < STEPS.length - 1 ? (
                <button type="button" className="btn onb-skip" onClick={skipToNext} disabled={submitting}>
                  {activeStep === 4 ? "Skip bank" : "Skip menu"}
                </button>
              ) : null}
              {activeStep < STEPS.length - 1 ? (
                <button type="button" className="btn" onClick={goNext} disabled={submitting || locatingAddress}>
                  {locatingAddress ? "Locating address…" : "Save & continue →"}
                </button>
              ) : (
                <button type="button" className="btn" onClick={submit} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit for review"}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
      <AddressPinConfirmModal
        visible={pinConfirmVisible && Boolean(pendingPin)}
        addressLines={addressLines()}
        latitude={pendingPin?.latitude || 0}
        longitude={pendingPin?.longitude || 0}
        confirming={locatingAddress || submitting}
        onConfirm={handleConfirmShopPin}
        onEdit={() => {
          setPinConfirmVisible(false);
          setPendingPin(null);
        }}
      />
    </div>
  );
}
