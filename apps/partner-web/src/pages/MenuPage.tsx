import { useEffect, useState } from "react";
import {
  completeSetup,
  createMenuItem,
  deleteMenuItem,
  getPartnerMenuItems,
  toggleMenuAvailability,
  updateMenuItem,
  uploadImage
} from "@vyaha/api-client";

type MenuRow = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  isVeg?: boolean;
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuRow[]>([]);
  const [form, setForm] = useState({ name: "", price: "", description: "", category: "other" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const load = () => getPartnerMenuItems().then((res) => setItems((res.data as MenuRow[]) || []));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const save = async () => {
    try {
      setMessage("");
      const name = form.name.trim();

      // Users often type "50/-" in this UI; Number("50/-") => NaN.
      // Keep digits + dot only so "50/-" becomes 50.
      const cleanedPrice = String(form.price).replace(/[^0-9.]/g, "");
      const price = parseFloat(cleanedPrice);

      if (!name) throw new Error("Name is required");
      if (!Number.isFinite(price) || price <= 0) throw new Error("Valid price is required");

      let imageUrl: string | undefined;
      if (imageFile) {
        const res = await uploadImage(imageFile);
        if (!res.success || !res.data?.url) throw new Error("Image upload failed");
        imageUrl = res.data.url;
      }

      const payload: Record<string, unknown> = {
        name,
        price,
        description: form.description,
        category: form.category,
        // Backend expects `isVegetarian` but we rely on defaults; still keep `isAvailable`.
        isAvailable: true,
        ...(imageUrl ? { imageUrl } : {})
      };

      if (editingId) {
        await updateMenuItem(editingId, payload);
      } else {
        await createMenuItem(payload);
        if (items.length === 0) {
          await completeSetup();
        }
      }

      setForm({ name: "", price: "", description: "", category: "other" });
      setEditingId(null);
      setImageFile(null);
      setMessage("Menu saved.");
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save menu item");
    }
  };

  const onUpload = async (id: string, file: File) => {
    const res = await uploadImage(file);
    if (res.success && res.data?.url) {
      await updateMenuItem(id, { imageUrl: res.data.url });
      load();
    }
  };

  return (
    <div>
      <h2>Menu</h2>
      <div className="card">
        <h3>{editingId ? "Edit item" : "Add item"}</h3>
        <div className="field">
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Price</label>
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field" style={{ marginTop: 8 }}>
          <label className="btn secondary" style={{ cursor: "pointer" }}>
            Image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setImageFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {imagePreviewUrl ? (
            <div style={{ marginTop: 8 }}>
              <img src={imagePreviewUrl} alt="Preview" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6 }} />
            </div>
          ) : null}
        </div>
        <button className="btn" onClick={save}>
          {editingId ? "Update" : "Add"} item
        </button>
        {message ? <p>{message}</p> : null}
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Price</th>
            <th>Available</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td>
                {item.name}
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" style={{ width: 40, height: 40, marginLeft: 8, objectFit: "cover" }} />
                ) : null}
              </td>
              <td>₹{item.price}</td>
              <td>
                <input
                  type="checkbox"
                  checked={item.isAvailable !== false}
                  onChange={(e) => toggleMenuAvailability(item._id, e.target.checked).then(load)}
                />
              </td>
              <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  className="btn secondary"
                  onClick={() => {
                    setEditingId(item._id);
                    setForm({
                      name: item.name,
                      price: String(item.price),
                      description: item.description || "",
                      category: item.category || "other"
                    });
                    setImageFile(null);
                  }}
                >
                  Edit
                </button>
                <label className="btn secondary" style={{ cursor: "pointer" }}>
                  Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => e.target.files?.[0] && onUpload(item._id, e.target.files[0])}
                  />
                </label>
                <button className="btn secondary" onClick={() => deleteMenuItem(item._id).then(load)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
