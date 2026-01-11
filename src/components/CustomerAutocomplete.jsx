import React, { useMemo, useState } from "react";
import { BRANCH_CUSTOMERS } from "../data/branchCustomers";

export default function CustomerAutocomplete({
  value,
  onChange,
  branchId,
  theme = "light",
}) {
  const [open, setOpen] = useState(false);

  const customers = BRANCH_CUSTOMERS[branchId] || [];

  const matches = useMemo(() => {
    if (!value) return [];
    return customers
      .filter((c) =>
        c.toLowerCase().includes(value.toLowerCase())
      )
      .slice(0, 8);
  }, [value, customers]);

  const inputStyle =
    theme === "dark"
      ? "bg-black/40 text-white border-white/40"
      : "bg-white text-black border-black/30";

  const dropdownStyle =
    theme === "dark"
      ? "bg-slate-900 border-white/20"
      : "bg-white border-black/10";

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Customer name"
        className={`w-full px-4 py-3 rounded-xl border outline-none ${inputStyle}`}
      />

      {open && matches.length > 0 && (
        <div
          className={`absolute z-50 mt-2 w-full rounded-xl border shadow-xl ${dropdownStyle}`}
        >
          {matches.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-500/10"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
