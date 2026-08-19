import {
  DEFAULT_PARTS,
  DEFAULT_SIZE,
  NATIVE_SIZES,
  PART_ORDER,
  getPart,
  normalizeInitials,
  type Parts,
} from "./ripe";

export type Customization = {
  parts: Parts;
  initials: string;
  size: number;
};

export const DEFAULT_CUSTOMIZATION: Customization = {
  parts: DEFAULT_PARTS,
  initials: "",
  size: DEFAULT_SIZE,
};

/**
 * Reads the `p=part:material:color` / `size` query parameters the source
 * configurator uses, falling back to the model defaults for anything missing
 * or unknown.
 */
export function customizationFromQuery(query: {
  p?: string | string[];
  size?: string | string[];
  initials?: string | string[];
}): Customization {
  const parts: Parts = { ...DEFAULT_PARTS };
  const raw = query.p === undefined ? [] : [query.p].flat();
  let sawValidPart = false;

  for (const entry of raw) {
    const [name, material, color] = entry.split(":");
    const definition = getPart(name);
    if (!definition) continue;
    const materialDefinition = definition.materials.find(
      (candidate) => candidate.name === material,
    );
    if (!materialDefinition) continue;
    if (!materialDefinition.colors.some((candidate) => candidate.name === color)) {
      continue;
    }
    if (!sawValidPart) {
      // An explicit part list replaces the defaults rather than merging into them.
      for (const key of PART_ORDER) parts[key] = null;
      sawValidPart = true;
    }
    parts[name] = { material, color };
  }

  const sizeParam = Number.parseInt([query.size].flat()[0] ?? "", 10);
  const size = NATIVE_SIZES.includes(sizeParam) ? sizeParam : DEFAULT_SIZE;

  return {
    parts,
    initials: normalizeInitials([query.initials].flat()[0] ?? ""),
    size,
  };
}

/** Rebuilds the shareable query string for the current customization. */
export function queryFromCustomization(customization: Customization): string {
  const params = new URLSearchParams({
    brand: "burberry_tech",
    model: "trench",
    locale: "en_us",
    format: "webp",
    gender: "female",
    size: String(customization.size),
    scale: "eu",
  });
  for (const name of PART_ORDER) {
    const selection = customization.parts[name];
    if (!selection) continue;
    params.append("p", `${name}:${selection.material}:${selection.color}`);
  }
  if (customization.initials) {
    // The source writes both keys; `initials_extra` carries the per-group value.
    params.set("initials", customization.initials);
    params.set("initials_extra", `main:${customization.initials}:`);
  }
  return `?${params.toString()}`;
}

export function sameCustomization(a: Customization, b: Customization): boolean {
  if (a.initials !== b.initials || a.size !== b.size) return false;
  return PART_ORDER.every((name) => {
    const left = a.parts[name];
    const right = b.parts[name];
    if (!left || !right) return left === right || (!left && !right);
    return left.material === right.material && left.color === right.color;
  });
}
