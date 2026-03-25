"use client";

import { useState, useEffect } from "react";

function isValidHex(s: string) { return /^#[0-9a-fA-F]{6}$/.test(s); }

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState(value);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setRaw(value), [value]);

  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input type="color" value={isValidHex(raw) ? raw : "#000000"}
            onChange={e => { setRaw(e.target.value); onChange(e.target.value); }}
            className="w-10 h-10 rounded-xl cursor-pointer border border-white/[0.08] bg-transparent p-0.5"
          />
        </div>
        <input value={raw} onChange={e => { setRaw(e.target.value); if (isValidHex(e.target.value)) onChange(e.target.value); }}
          placeholder="#6366f1"
          className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] font-mono text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all"
        />
      </div>
    </div>
  );
}