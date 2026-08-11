import { emptyMenuItem, type MenuDraftItem } from "../types";

type Props = {
  items: MenuDraftItem[];
  onChange: (items: MenuDraftItem[]) => void;
};

export default function MenuDraftStep({ items, onChange }: Props) {
  const updateItem = (index: number, patch: Partial<MenuDraftItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="onb-step">
      <p className="onb-hint">Add starter menu items now, or skip and build your full menu after approval.</p>
      {items.map((item, index) => (
        <div key={`menu-${index}`} className="onb-menu-card">
          <h4>Item {index + 1}</h4>
          <label className="field">
            <span>Name</span>
            <input value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} placeholder="e.g. Masala Dosa" />
          </label>
          <label className="field">
            <span>Price (₹)</span>
            <input
              value={item.price}
              onChange={(e) => updateItem(index, { price: e.target.value.replace(/[^\d.]/g, "") })}
              placeholder="99"
              inputMode="decimal"
            />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} />
          </label>
          <div className="onb-chips">
            {(["veg", "non-veg"] as const).map((type) => {
              const selected = type === "veg" ? item.isVegetarian : !item.isVegetarian;
              return (
                <button
                  key={type}
                  type="button"
                  className={`onb-chip ${selected ? "onb-chip--active" : ""}`}
                  onClick={() => updateItem(index, { isVegetarian: type === "veg" })}
                >
                  {type === "veg" ? "Veg" : "Non-veg"}
                </button>
              );
            })}
          </div>
          {items.length > 1 ? (
            <button type="button" className="onb-link-danger" onClick={() => onChange(items.filter((_, i) => i !== index))}>
              Remove item
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="btn secondary"
        disabled={items.length >= 10}
        onClick={() => onChange([...items, emptyMenuItem()])}
      >
        {items.length >= 10 ? "Maximum 10 items" : "+ Add another item"}
      </button>
    </div>
  );
}
