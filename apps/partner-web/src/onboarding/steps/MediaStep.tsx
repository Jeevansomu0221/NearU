import type { MediaState } from "../types";

type Props = {
  media: MediaState;
  uploadingKey: string | null;
  onPick: (key: "shopImageUrl" | "bannerImageUrl" | "restaurantPhoto", file: File) => void;
};

export default function MediaStep({ media, uploadingKey, onPick }: Props) {
  const fileInput = (key: Props["onPick"] extends (k: infer K, f: File) => void ? K : never, label: string) => (
    <label className="onb-upload">
      <span>{label}</span>
      <input
        type="file"
        accept="image/*"
        disabled={uploadingKey !== null}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(key, file);
          e.target.value = "";
        }}
      />
      {uploadingKey === key ? <span>Uploading…</span> : <span className="btn secondary">Choose image</span>}
    </label>
  );

  return (
    <div className="onb-step">
      <p className="onb-hint">Add a logo, cover image and photos of your restaurant to build customer trust.</p>

      <div className="onb-media-slot">
        <h4>Logo / shop image</h4>
        {media.shopImageUrl ? <img src={media.shopImageUrl} alt="Shop logo" className="onb-preview" /> : null}
        {fileInput("shopImageUrl", "Upload logo")}
      </div>

      <div className="onb-media-slot">
        <h4>Cover image</h4>
        {media.bannerImageUrl ? <img src={media.bannerImageUrl} alt="Cover" className="onb-preview" /> : null}
        {fileInput("bannerImageUrl", "Upload cover")}
      </div>

      <div className="onb-media-slot">
        <h4>Restaurant photos (up to 5)</h4>
        <div className="onb-photo-grid">
          {media.restaurantPhotosUrls.map((url) => (
            <img key={url} src={url} alt="Restaurant" className="onb-photo-thumb" />
          ))}
        </div>
        {media.restaurantPhotosUrls.length < 5 ? (
          fileInput("restaurantPhoto", "Add photo")
        ) : (
          <p className="onb-hint">Maximum 5 photos reached.</p>
        )}
      </div>
    </div>
  );
}
