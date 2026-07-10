export type MacbookProcessorConfig = {
  sizes: string[];
  rams: string[];
  ssds: string[];
};

export type ProductVersionConfig = {
  iphone: {
    numbers: string[];
    modelsByNumber: Record<string, string[]>;
    storageByNumberModel: Record<string, Record<string, string[]>>;
    simTypes: string[];
  };
  ipad: {
    gamas: string[];
    generationsByGama: Record<string, string[]>;
    processorsByGama: Record<string, string[]>;
    sizesByGamaVersion: Record<string, Record<string, string[]>>;
    storageByGamaVersion: Record<string, Record<string, string[]>>;
  };
  macbook: {
    gamas: string[];
    processorsByGama: Record<string, string[]>;
    configByGamaProcessor: Record<string, Record<string, MacbookProcessorConfig>>;
  };
  watch: {
    normalSeries: string[];
    ultraVersions: string[];
  };
};

export const DEFAULT_PRODUCT_VERSION_CONFIG: ProductVersionConfig = {
  iphone: {
    numbers: ["11", "12", "13", "14", "15", "16", "17"],
    modelsByNumber: {
      "11": ["Normal", "Pro", "Pro Max"],
      "12": ["Mini", "Normal", "Pro", "Pro Max"],
      "13": ["Mini", "Normal", "Pro", "Pro Max"],
      "14": ["Normal", "Plus", "Pro", "Pro Max"],
      "15": ["Normal", "Plus", "Pro", "Pro Max"],
      "16": ["Normal", "Plus", "Pro", "Pro Max", "E"],
      "17": ["Normal", "Plus", "Pro", "Pro Max", "E"],
    },
    storageByNumberModel: {},
    simTypes: ["Chip físico", "eSIM"],
  },
  ipad: {
    gamas: ["Normal", "Mini", "Air", "Pro"],
    generationsByGama: {
      Normal: ["8", "9", "10", "11"],
      Mini: ["6", "7"],
    },
    processorsByGama: {
      Air: ["M1", "M2", "M3"],
      Pro: ["M1", "M2", "M4", "M5"],
    },
    sizesByGamaVersion: {
      Normal: {
        "8": ["10.2"],
        "9": ["10.2"],
        "10": ["10.9"],
        "11": ["11"],
      },
      Air: {
        M2: ["11", "13"],
        M3: ["11", "13"],
      },
      Pro: {
        M1: ["11", "12.9"],
        M2: ["11", "12.9"],
        M4: ["11", "13"],
        M5: ["11", "13"],
      },
    },
    storageByGamaVersion: {
      Normal: {
        "8": ["32", "128"],
        "9": ["64", "256"],
        "10": ["64", "256"],
        "11": ["128", "256", "512"],
      },
      Mini: {
        "6": ["64", "256"],
        "7": ["128", "256", "512"],
      },
      Air: {
        M1: ["64", "128", "256"],
        M2: ["128", "256", "512"],
        M3: ["128", "256", "512"],
      },
      Pro: {
        M1: ["128", "256", "512", "1TB", "2TB"],
        M2: ["128", "256", "512", "1TB", "2TB"],
        M4: ["256", "512", "1TB", "2TB"],
        M5: ["256", "512", "1TB", "2TB"],
      },
    },
  },
  macbook: {
    gamas: ["Air", "Pro", "Neo"],
    processorsByGama: {
      Air: ["M1", "M2", "M3", "M4", "M5"],
      Pro: [
        "M1", "M2", "M3", "M4", "M5",
        "M1 Pro", "M2 Pro", "M3 Pro", "M4 Pro",
        "M1 Max", "M2 Max", "M3 Max", "M4 Max",
      ],
      Neo: ["A18 Pro"],
    },
    configByGamaProcessor: {
      Neo: {
        "A18 Pro": { sizes: ["13"], rams: ["8"], ssds: ["256", "512"] },
      },
      Air: {
        M1: { sizes: ["13"], rams: ["8", "16"], ssds: ["256", "512", "1TB", "2TB"] },
        M2: { sizes: ["13", "15"], rams: ["8", "16", "24"], ssds: ["256", "512", "1TB", "2TB"] },
        M3: { sizes: ["13", "15"], rams: ["8", "16", "24"], ssds: ["256", "512", "1TB", "2TB"] },
        M4: { sizes: ["13", "15"], rams: ["16", "24", "32"], ssds: ["256", "512", "1TB", "2TB"] },
        M5: { sizes: ["13", "15"], rams: ["16", "24", "32"], ssds: ["256", "512", "1TB", "2TB"] },
      },
      Pro: {
        M1: { sizes: ["13"], rams: ["8", "16"], ssds: ["256", "512", "1TB", "2TB"] },
        "M1 Pro": { sizes: ["14", "16"], rams: ["16", "32"], ssds: ["512", "1TB", "2TB"] },
        "M1 Max": { sizes: ["14", "16"], rams: ["32", "64"], ssds: ["512", "1TB", "2TB", "4TB", "8TB"] },
        M2: { sizes: ["13"], rams: ["8", "16", "24"], ssds: ["256", "512", "1TB", "2TB"] },
        "M2 Pro": { sizes: ["14", "16"], rams: ["16", "32", "36"], ssds: ["512", "1TB", "2TB"] },
        "M2 Max": { sizes: ["14", "16"], rams: ["32", "64", "96"], ssds: ["512", "1TB", "2TB", "4TB", "8TB"] },
        M3: { sizes: ["14"], rams: ["8", "16", "24"], ssds: ["512", "1TB", "2TB"] },
        "M3 Pro": { sizes: ["14", "16"], rams: ["18", "36"], ssds: ["512", "1TB", "2TB", "4TB"] },
        "M3 Max": { sizes: ["14", "16"], rams: ["36", "48", "64"], ssds: ["1TB", "2TB", "4TB", "8TB"] },
        M4: { sizes: ["14"], rams: ["8", "16", "24"], ssds: ["512", "1TB", "2TB"] },
        "M4 Pro": { sizes: ["14", "16"], rams: ["24", "48"], ssds: ["512", "1TB", "2TB", "4TB"] },
        "M4 Max": { sizes: ["14", "16"], rams: ["48", "64", "128"], ssds: ["1TB", "2TB", "4TB", "8TB"] },
        M5: { sizes: ["14"], rams: ["16", "24"], ssds: ["512", "1TB", "2TB"] },
      },
    },
  },
  watch: {
    normalSeries: ["5", "6", "7", "8", "9", "10", "11"],
    ultraVersions: ["1", "2", "3"],
  },
};

export function uniqueStrings(values: unknown[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const text = String(value ?? "").trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text);
  });
  return out;
}

export function splitList(value: string) {
  return uniqueStrings(String(value || "").split(/[,;\n]+/));
}

function mergeRecordLists(base: Record<string, string[]>, extra: unknown): Record<string, string[]> {
  const output: Record<string, string[]> = { ...base };
  if (!extra || typeof extra !== "object") return output;
  Object.entries(extra as Record<string, unknown>).forEach(([key, value]) => {
    output[key] = uniqueStrings([...(output[key] || []), ...(Array.isArray(value) ? value : [])]);
  });
  return output;
}

function mergeNestedRecordLists(
  base: Record<string, Record<string, string[]>>,
  extra: unknown
): Record<string, Record<string, string[]>> {
  const output: Record<string, Record<string, string[]>> = {};
  Object.entries(base).forEach(([group, versions]) => {
    output[group] = { ...versions };
  });
  if (!extra || typeof extra !== "object") return output;
  Object.entries(extra as Record<string, unknown>).forEach(([group, versions]) => {
    if (!versions || typeof versions !== "object") return;
    output[group] = { ...(output[group] || {}) };
    Object.entries(versions as Record<string, unknown>).forEach(([version, values]) => {
      output[group][version] = uniqueStrings([
        ...(output[group][version] || []),
        ...(Array.isArray(values) ? values : []),
      ]);
    });
  });
  return output;
}

function mergeMacbookConfig(extra: unknown) {
  const output: ProductVersionConfig["macbook"]["configByGamaProcessor"] = {};
  Object.entries(DEFAULT_PRODUCT_VERSION_CONFIG.macbook.configByGamaProcessor).forEach(([gama, processors]) => {
    output[gama] = {};
    Object.entries(processors).forEach(([processor, config]) => {
      output[gama][processor] = {
        sizes: [...config.sizes],
        rams: [...config.rams],
        ssds: [...config.ssds],
      };
    });
  });
  if (!extra || typeof extra !== "object") return output;
  Object.entries(extra as Record<string, unknown>).forEach(([gama, processors]) => {
    if (!processors || typeof processors !== "object") return;
    output[gama] = { ...(output[gama] || {}) };
    Object.entries(processors as Record<string, unknown>).forEach(([processor, rawConfig]) => {
      if (!rawConfig || typeof rawConfig !== "object") return;
      const current = output[gama][processor] || { sizes: [], rams: [], ssds: [] };
      const next = rawConfig as Partial<MacbookProcessorConfig>;
      output[gama][processor] = {
        sizes: uniqueStrings([...current.sizes, ...(Array.isArray(next.sizes) ? next.sizes : [])]),
        rams: uniqueStrings([...current.rams, ...(Array.isArray(next.rams) ? next.rams : [])]),
        ssds: uniqueStrings([...current.ssds, ...(Array.isArray(next.ssds) ? next.ssds : [])]),
      };
    });
  });
  return output;
}

export function normalizeProductVersionConfig(input?: Partial<ProductVersionConfig> | null): ProductVersionConfig {
  const raw = input || {};
  const macbookProcessors = mergeRecordLists(DEFAULT_PRODUCT_VERSION_CONFIG.macbook.processorsByGama, raw.macbook?.processorsByGama);
  const macbookConfig = mergeMacbookConfig(raw.macbook?.configByGamaProcessor);

  Object.entries(macbookConfig).forEach(([gama, processors]) => {
    macbookProcessors[gama] = uniqueStrings([...(macbookProcessors[gama] || []), ...Object.keys(processors)]);
  });

  const ipadGenerations = mergeRecordLists(DEFAULT_PRODUCT_VERSION_CONFIG.ipad.generationsByGama, raw.ipad?.generationsByGama);
  const ipadProcessors = mergeRecordLists(DEFAULT_PRODUCT_VERSION_CONFIG.ipad.processorsByGama, raw.ipad?.processorsByGama);
  const ipadSizes = mergeNestedRecordLists(DEFAULT_PRODUCT_VERSION_CONFIG.ipad.sizesByGamaVersion, raw.ipad?.sizesByGamaVersion);
  const ipadStorage = mergeNestedRecordLists(DEFAULT_PRODUCT_VERSION_CONFIG.ipad.storageByGamaVersion, raw.ipad?.storageByGamaVersion);

  Object.entries(ipadSizes).forEach(([gama, versions]) => {
    if (gama === "Normal" || gama === "Mini") ipadGenerations[gama] = uniqueStrings([...(ipadGenerations[gama] || []), ...Object.keys(versions)]);
    else ipadProcessors[gama] = uniqueStrings([...(ipadProcessors[gama] || []), ...Object.keys(versions)]);
  });
  Object.entries(ipadStorage).forEach(([gama, versions]) => {
    if (gama === "Normal" || gama === "Mini") ipadGenerations[gama] = uniqueStrings([...(ipadGenerations[gama] || []), ...Object.keys(versions)]);
    else ipadProcessors[gama] = uniqueStrings([...(ipadProcessors[gama] || []), ...Object.keys(versions)]);
  });

  return {
    iphone: {
      numbers: uniqueStrings([...(DEFAULT_PRODUCT_VERSION_CONFIG.iphone.numbers), ...(raw.iphone?.numbers || [])]),
      modelsByNumber: mergeRecordLists(DEFAULT_PRODUCT_VERSION_CONFIG.iphone.modelsByNumber, raw.iphone?.modelsByNumber),
      storageByNumberModel: mergeNestedRecordLists(DEFAULT_PRODUCT_VERSION_CONFIG.iphone.storageByNumberModel, raw.iphone?.storageByNumberModel),
      simTypes: uniqueStrings([...(DEFAULT_PRODUCT_VERSION_CONFIG.iphone.simTypes), ...(raw.iphone?.simTypes || [])]),
    },
    ipad: {
      gamas: uniqueStrings([...(DEFAULT_PRODUCT_VERSION_CONFIG.ipad.gamas), ...(raw.ipad?.gamas || [])]),
      generationsByGama: ipadGenerations,
      processorsByGama: ipadProcessors,
      sizesByGamaVersion: ipadSizes,
      storageByGamaVersion: ipadStorage,
    },
    macbook: {
      gamas: uniqueStrings([...(DEFAULT_PRODUCT_VERSION_CONFIG.macbook.gamas), ...(raw.macbook?.gamas || []), ...Object.keys(macbookProcessors)]),
      processorsByGama: macbookProcessors,
      configByGamaProcessor: macbookConfig,
    },
    watch: {
      normalSeries: uniqueStrings([...(DEFAULT_PRODUCT_VERSION_CONFIG.watch.normalSeries), ...(raw.watch?.normalSeries || [])]),
      ultraVersions: uniqueStrings([...(DEFAULT_PRODUCT_VERSION_CONFIG.watch.ultraVersions), ...(raw.watch?.ultraVersions || [])]),
    },
  };
}

export function getIphoneStorageOptionsFromConfig(config: ProductVersionConfig, numero: string, modelo: string) {
  const custom = config.iphone.storageByNumberModel[String(numero || "")]?.[String(modelo || "")];
  const n = parseInt(String(numero || ""), 10);
  if (!Number.isFinite(n) || !modelo) return uniqueStrings(custom || []);
  let defaults: string[] = [];
  if (n >= 11 && n <= 12) defaults = ["64", "128", "256"];
  if (n >= 13 && n <= 16) {
    if (["Pro", "Pro Max"].includes(modelo)) {
      if (n <= 14) defaults = ["128", "256", "512"];
      else if (n === 16 && modelo === "Pro") defaults = ["128", "256", "512", "1TB"];
      else defaults = ["256", "512", "1TB"];
    } else {
      defaults = ["128", "256", "512"];
    }
  }
  if (n >= 17) defaults = ["256", "512", "1TB"];
  return uniqueStrings([...defaults, ...(custom || [])]);
}
