import { WEEKDAYS } from "../constants";
import type { OperationsState } from "../types";

type Props = {
  operations: OperationsState;
  onChange: (next: OperationsState) => void;
};

export default function OperationsStep({ operations, onChange }: Props) {
  const toggleHoliday = (day: string) => {
    const has = operations.weeklyHolidays.includes(day);
    onChange({
      ...operations,
      weeklyHolidays: has ? operations.weeklyHolidays.filter((d) => d !== day) : [...operations.weeklyHolidays, day]
    });
  };

  return (
    <div className="onb-step">
      <p className="onb-hint">Set when customers can order and how you fulfil orders.</p>
      <div className="onb-row">
        <label className="field">
          <span>Opening time</span>
          <input
            value={operations.openingTime}
            onChange={(e) => onChange({ ...operations, openingTime: e.target.value })}
            placeholder="08:00"
          />
        </label>
        <label className="field">
          <span>Closing time</span>
          <input
            value={operations.closingTime}
            onChange={(e) => onChange({ ...operations, closingTime: e.target.value })}
            placeholder="22:00"
          />
        </label>
      </div>

      <p className="onb-label">Weekly off days</p>
      <div className="onb-chips">
        {WEEKDAYS.map((day) => (
          <button
            key={day}
            type="button"
            className={`onb-chip ${operations.weeklyHolidays.includes(day) ? "onb-chip--active" : ""}`}
            onClick={() => toggleHoliday(day)}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <p className="onb-label">Delivery fulfilment</p>
      <div className="onb-chips">
        {([
          { key: "platform" as const, label: "Vyaha delivery partners" },
          { key: "self" as const, label: "Self delivery" },
          { key: "self_free" as const, label: "Free self delivery" }
        ]).map((option) => (
          <button
            key={option.key}
            type="button"
            className={`onb-chip ${operations.deliveryMode === option.key ? "onb-chip--active" : ""}`}
            onClick={() => onChange({ ...operations, deliveryMode: option.key })}
          >
            {option.label}
          </button>
        ))}
      </div>


      <label className="field">
        <span>Packaging notes (optional)</span>
        <textarea
          value={operations.packagingNote}
          onChange={(e) => onChange({ ...operations, packagingNote: e.target.value })}
          placeholder="Eco-friendly boxes, separate gravy packing, etc."
          rows={3}
        />
      </label>
    </div>
  );
}
