"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PRODUCT_VERSION_CONFIG,
  normalizeProductVersionConfig,
  splitList,
  uniqueStrings,
  type MacbookProcessorConfig,
  type ProductVersionConfig,
} from "@/lib/product-version-config";

type SaveState = "idle" | "saving" | "saved" | "error";
type WatchKind = "" | "normal" | "ultra";

function emptyConfig(): ProductVersionConfig {
  return normalizeProductVersionConfig(DEFAULT_PRODUCT_VERSION_CONFIG);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = "h-9 w-full rounded-lg border border-gray-300 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a84ff]";
const selectClass = `${inputClass} bg-white`;
const buttonClass = "h-9 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white disabled:opacity-60";

export default function ProductVersionsEditor() {
  const [config, setConfig] = useState<ProductVersionConfig>(() => emptyConfig());
  const [state, setState] = useState<SaveState>("idle");
  const [iphoneNumber, setIphoneNumber] = useState("");
  const [iphoneNumberModels, setIphoneNumberModels] = useState("Normal, Plus, Pro, Pro Max");
  const [iphoneStorageValues, setIphoneStorageValues] = useState("256, 512, 1TB");
  const [macGama, setMacGama] = useState("Air");
  const [macChip, setMacChip] = useState("");
  const [macSizes, setMacSizes] = useState("13, 15");
  const [macRams, setMacRams] = useState("16, 24, 32");
  const [macSsds, setMacSsds] = useState("256, 512, 1TB, 2TB");
  const [ipadGama, setIpadGama] = useState("Air");
  const [ipadVersion, setIpadVersion] = useState("");
  const [ipadSizes, setIpadSizes] = useState("11, 13");
  const [ipadStorage, setIpadStorage] = useState("128, 256, 512");
  const [watchKind, setWatchKind] = useState<WatchKind>("");
  const [watchValue, setWatchValue] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/product-versions", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (alive && json?.ok) setConfig(normalizeProductVersionConfig(json.config));
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const save = async (next: ProductVersionConfig) => {
    setState("saving");
    try {
      const res = await fetch("/api/admin/product-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: next }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error("save failed");
      setConfig(normalizeProductVersionConfig(json.config));
      setState("saved");
      window.setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("error");
    }
  };

  const update = (recipe: (current: ProductVersionConfig) => ProductVersionConfig) => {
    const next = normalizeProductVersionConfig(recipe(config));
    void save(next);
  };

  const addIphoneNumber = () => {
    const number = iphoneNumber.trim();
    const models = splitList(iphoneNumberModels);
    const storage = splitList(iphoneStorageValues);
    if (!number || !models.length || !storage.length) return;
    if (config.iphone.numbers.some((existing) => existing.toLowerCase() === number.toLowerCase())) {
      setState("error");
      return;
    }
    update((current) => ({
      ...current,
      iphone: {
        ...current.iphone,
        numbers: uniqueStrings([...current.iphone.numbers, number]),
        modelsByNumber: {
          ...current.iphone.modelsByNumber,
          [number]: models,
        },
        storageByNumberModel: {
          ...current.iphone.storageByNumberModel,
          [number]: Object.fromEntries(models.map((model) => [model, storage])),
        },
      },
    }));
    setIphoneNumber("");
  };

  const addMacbookChip = () => {
    const gama = macGama.trim();
    const chip = macChip.trim();
    const values: MacbookProcessorConfig = {
      sizes: splitList(macSizes),
      rams: splitList(macRams),
      ssds: splitList(macSsds),
    };
    if (!gama || !chip || !values.sizes.length) return;
    update((current) => ({
      ...current,
      macbook: {
        ...current.macbook,
        gamas: uniqueStrings([...current.macbook.gamas, gama]),
        processorsByGama: {
          ...current.macbook.processorsByGama,
          [gama]: uniqueStrings([...(current.macbook.processorsByGama[gama] || []), chip]),
        },
        configByGamaProcessor: {
          ...current.macbook.configByGamaProcessor,
          [gama]: {
            ...(current.macbook.configByGamaProcessor[gama] || {}),
            [chip]: {
              sizes: uniqueStrings([...(current.macbook.configByGamaProcessor[gama]?.[chip]?.sizes || []), ...values.sizes]),
              rams: uniqueStrings([...(current.macbook.configByGamaProcessor[gama]?.[chip]?.rams || []), ...values.rams]),
              ssds: uniqueStrings([...(current.macbook.configByGamaProcessor[gama]?.[chip]?.ssds || []), ...values.ssds]),
            },
          },
        },
      },
    }));
    setMacChip("");
  };

  const addIpadVersion = () => {
    const gama = ipadGama.trim();
    const version = ipadVersion.trim();
    const sizes = splitList(ipadSizes);
    const storage = splitList(ipadStorage);
    if (!gama || !version || !sizes.length) return;
    const isGeneration = gama === "Normal" || gama === "Mini";
    update((current) => ({
      ...current,
      ipad: {
        ...current.ipad,
        gamas: uniqueStrings([...current.ipad.gamas, gama]),
        generationsByGama: isGeneration
          ? { ...current.ipad.generationsByGama, [gama]: uniqueStrings([...(current.ipad.generationsByGama[gama] || []), version]) }
          : current.ipad.generationsByGama,
        processorsByGama: isGeneration
          ? current.ipad.processorsByGama
          : { ...current.ipad.processorsByGama, [gama]: uniqueStrings([...(current.ipad.processorsByGama[gama] || []), version]) },
        sizesByGamaVersion: {
          ...current.ipad.sizesByGamaVersion,
          [gama]: {
            ...(current.ipad.sizesByGamaVersion[gama] || {}),
            [version]: uniqueStrings([...(current.ipad.sizesByGamaVersion[gama]?.[version] || []), ...sizes]),
          },
        },
        storageByGamaVersion: {
          ...current.ipad.storageByGamaVersion,
          [gama]: {
            ...(current.ipad.storageByGamaVersion[gama] || {}),
            [version]: uniqueStrings([...(current.ipad.storageByGamaVersion[gama]?.[version] || []), ...storage]),
          },
        },
      },
    }));
    setIpadVersion("");
  };

  const addWatchOption = () => {
    const values = splitList(watchValue);
    if (!watchKind || !values.length) return;
    update((current) => ({
      ...current,
      watch: {
        normalSeries: watchKind === "normal" ? uniqueStrings([...current.watch.normalSeries, ...values]) : current.watch.normalSeries,
        ultraVersions: watchKind === "ultra" ? uniqueStrings([...current.watch.ultraVersions, ...values]) : current.watch.ultraVersions,
      },
    }));
    setWatchValue("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">Agregar versiones</h2>
        <div className="text-xs font-medium text-gray-500">
          {state === "saving" && "Guardando..."}
          {state === "saved" && "Guardado"}
          {state === "error" && <span className="text-red-600">Error al guardar</span>}
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 p-3">
        <h3 className="text-sm font-semibold text-gray-900">iPhone</h3>
        <div className="mt-2 grid gap-2 lg:grid-cols-[0.7fr_1.2fr_1fr_auto]">
          <Field label="Nuevo numero">
            <input value={iphoneNumber} onChange={(e) => setIphoneNumber(e.target.value)} className={inputClass} placeholder="18" />
          </Field>
          <Field label="Modelos para ese numero">
            <input value={iphoneNumberModels} onChange={(e) => setIphoneNumberModels(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Almacenamiento">
            <input value={iphoneStorageValues} onChange={(e) => setIphoneStorageValues(e.target.value)} className={inputClass} />
          </Field>
          <button type="button" onClick={addIphoneNumber} disabled={state === "saving"} className={`${buttonClass} self-end`}>
            Agregar
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 p-3">
        <h3 className="text-sm font-semibold text-gray-900">MacBook</h3>
        <div className="mt-2 grid gap-2 lg:grid-cols-[0.8fr_1fr_1fr_1fr_1fr_auto]">
          <Field label="Gama">
            <select value={macGama} onChange={(e) => setMacGama(e.target.value)} className={selectClass}>
              {config.macbook.gamas.map((gama) => <option key={gama} value={gama}>{gama}</option>)}
            </select>
          </Field>
          <Field label="Chip">
            <input value={macChip} onChange={(e) => setMacChip(e.target.value)} className={inputClass} placeholder="M6" />
          </Field>
          <Field label="Pantallas">
            <input value={macSizes} onChange={(e) => setMacSizes(e.target.value)} className={inputClass} />
          </Field>
          <Field label="RAM">
            <input value={macRams} onChange={(e) => setMacRams(e.target.value)} className={inputClass} />
          </Field>
          <Field label="SSD">
            <input value={macSsds} onChange={(e) => setMacSsds(e.target.value)} className={inputClass} />
          </Field>
          <button type="button" onClick={addMacbookChip} disabled={state === "saving"} className={`${buttonClass} self-end`}>
            Agregar
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 p-3">
        <h3 className="text-sm font-semibold text-gray-900">iPad</h3>
        <div className="mt-2 grid gap-2 lg:grid-cols-[0.8fr_1fr_1fr_1.1fr_auto]">
          <Field label="Gama">
            <select value={ipadGama} onChange={(e) => setIpadGama(e.target.value)} className={selectClass}>
              {config.ipad.gamas.map((gama) => <option key={gama} value={gama}>{gama}</option>)}
            </select>
          </Field>
          <Field label={ipadGama === "Normal" || ipadGama === "Mini" ? "Generacion" : "Chip"}>
            <input value={ipadVersion} onChange={(e) => setIpadVersion(e.target.value)} className={inputClass} placeholder={ipadGama === "Normal" ? "12" : "M6"} />
          </Field>
          <Field label="Pantallas">
            <input value={ipadSizes} onChange={(e) => setIpadSizes(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Almacenamiento">
            <input value={ipadStorage} onChange={(e) => setIpadStorage(e.target.value)} className={inputClass} />
          </Field>
          <button type="button" onClick={addIpadVersion} disabled={state === "saving"} className={`${buttonClass} self-end`}>
            Agregar
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 p-3">
        <h3 className="text-sm font-semibold text-gray-900">Apple Watch</h3>
        <div className="mt-2 grid gap-2 lg:grid-cols-[0.8fr_1fr_auto]">
          <Field label="Tipo">
            <select value={watchKind} onChange={(e) => { setWatchKind(e.target.value as WatchKind); setWatchValue(""); }} className={selectClass}>
              <option value="">Seleccionar</option>
              <option value="normal">Serie normal</option>
              <option value="ultra">Ultra</option>
            </select>
          </Field>
          {watchKind && (
            <Field label={watchKind === "normal" ? "Numero de serie" : "Version Ultra"}>
              <input value={watchValue} onChange={(e) => setWatchValue(e.target.value)} className={inputClass} placeholder={watchKind === "normal" ? "12" : "4"} />
            </Field>
          )}
          {watchKind && (
            <button type="button" onClick={addWatchOption} disabled={state === "saving"} className={`${buttonClass} self-end`}>
              Agregar
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
