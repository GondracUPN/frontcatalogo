"use client";
import React from "react";
import { listSalePlaces, type SalePlaceOptions } from "../../actions";

/** Misma normalización que el backend: sin mayúsculas, tildes, signos ni prefijo «CC». */
export function salePlaceKey(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(?:centro comercial|c c|cc|mall)\s+/, "")
    .trim();
}

const FALLBACK: SalePlaceOptions = { fixed: ["Delivery", "Shalom"], frequent: [] };
let cached: Promise<SalePlaceOptions> | null = null;

function loadOptions() {
  if (!cached) cached = listSalePlaces().catch(() => FALLBACK);
  return cached;
}

type Props = {
  placeType: string;
  location: string;
  onChange: (placeType: "" | "almacen" | "otro", location: string) => void;
  emptyLabel?: string;
  otherLabel?: string;
  selectClassName: string;
  inputClassName: string;
  labelClassName: string;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * Selector «Lugar de venta»: Almacén, Delivery, Shalom, los lugares con más
 * de 10 ventas y «Otro lado» (texto libre). Se guarda como antes:
 * almacen, o bien otro + nombre del lugar.
 */
export default function SalePlaceField({ placeType, location, onChange, emptyLabel = "-", otherLabel = "Otro lado", selectClassName, inputClassName, labelClassName, placeholder = "Ej: Miraflores, Jockey Plaza...", disabled }: Props) {
  const [options, setOptions] = React.useState<SalePlaceOptions>(FALLBACK);
  const [custom, setCustom] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    loadOptions().then((value) => { if (alive) setOptions(value); });
    return () => { alive = false; };
  }, []);

  const named = React.useMemo(() => {
    const seen = new Set<string>();
    return [...options.fixed, ...options.frequent.map((place) => place.name)].filter((name) => {
      const key = salePlaceKey(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options]);

  const preset = placeType === "otro" && !custom ? named.find((name) => salePlaceKey(name) === salePlaceKey(location)) : undefined;
  const value = placeType === "almacen" ? "almacen" : preset ? `place:${preset}` : placeType === "otro" ? "otro" : "";

  const select = (next: string) => {
    if (next.startsWith("place:")) {
      setCustom(false);
      onChange("otro", next.slice(6));
    } else if (next === "otro") {
      setCustom(true);
      onChange("otro", preset ? "" : location);
    } else {
      setCustom(false);
      onChange(next as "" | "almacen", "");
    }
  };

  return (
    <>
      <select value={value} disabled={disabled} onChange={(e) => select(e.target.value)} className={selectClassName}>
        <option value="">{emptyLabel}</option>
        <option value="almacen">Almacén</option>
        {named.map((name) => <option key={name} value={`place:${name}`}>{name}</option>)}
        <option value="otro">{otherLabel}</option>
      </select>
      {value === "otro" && (
        <>
          <label className={labelClassName}>Ubicación de la venta</label>
          <input value={location} disabled={disabled} onChange={(e) => onChange("otro", e.target.value)} className={inputClassName} placeholder={placeholder} />
        </>
      )}
    </>
  );
}
