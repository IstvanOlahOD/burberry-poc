"use client";

import { PARTS, swatchUrl, type Parts, type Selection } from "@/lib/ripe";
import { CloseIcon } from "./icons";

type PickerPanelProps = {
  parts: Parts;
  selectedPart: string | null;
  expanded: boolean;
  onSelectPart: (name: string) => void;
  onSelect: (name: string, selection: Selection | null) => void;
  onClose: () => void;
};

export function PickerPanel({
  parts,
  selectedPart,
  expanded,
  onSelectPart,
  onSelect,
  onClose,
}: PickerPanelProps) {
  const active = PARTS.find((part) => part.name === selectedPart) ?? null;
  const materials = active?.materials ?? [];
  const showMaterials = materials.length > 1;
  const currentSelection = active ? parts[active.name] : null;
  const currentMaterial =
    materials.find((material) => material.name === currentSelection?.material) ??
    materials[0];

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 bg-[rgba(250,250,250,0.96)]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close picker"
        className={`absolute top-[9px] right-[18px] z-10 grid size-9 place-items-center text-ink transition-opacity ${
          expanded ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <CloseIcon className="size-6" />
      </button>

      <div className="overflow-hidden">
        <ul className="no-scrollbar h-[54px] overflow-x-auto whitespace-nowrap px-[30px] text-center">
          {PARTS.map((part) => {
            const selection = parts[part.name];
            const isActive = part.name === selectedPart && expanded;
            return (
              <li key={part.name} className="inline-block">
                <button
                  type="button"
                  onClick={() => onSelectPart(part.name)}
                  aria-pressed={isActive}
                  className="group flex items-center p-4 leading-none"
                >
                  <span
                    className={`text-[14px] font-medium transition-colors duration-100 ease-in-out group-hover:text-[#151515] ${
                      isActive ? "text-[#151515]" : "text-muted"
                    }`}
                  >
                    {selection || !part.optional ? part.label : `No ${part.label}`}
                  </span>
                  {selection ? (
                    <span
                      className={`ml-2 inline-block size-[13px] overflow-hidden rounded-full border transition-colors duration-100 ease-in-out group-hover:border-swatch-ring ${
                        isActive ? "border-swatch-ring" : "border-[#9299a3]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote swatch render. */}
                      <img
                        src={swatchUrl(selection.material, selection.color)}
                        alt=""
                        className="size-full object-cover"
                      />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div
          style={{
            height: expanded && active ? (showMaterials ? 152 : 118) : 0,
          }}
          className="transition-[height] duration-175 ease-[cubic-bezier(0.645,0.045,0.355,1)]"
        >
          {showMaterials ? (
            <ul className="no-scrollbar overflow-x-auto pt-2 text-center whitespace-nowrap">
              {materials.map((material) => (
                <li key={material.name} className="inline-block px-3">
                  <button
                    type="button"
                    onClick={() =>
                      active &&
                      onSelect(active.name, {
                        material: material.name,
                        color: material.colors[0].name,
                      })
                    }
                    className={`text-[12px] font-medium transition-colors duration-100 ease-in-out hover:text-ink ${
                      material.name === currentMaterial?.name ? "text-ink" : "text-muted"
                    }`}
                  >
                    {material.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {active && currentMaterial ? (
            <ul className="no-scrollbar overflow-x-auto pt-[14px] pb-3 text-center whitespace-nowrap">
              {currentMaterial.colors.map((color) => {
                const isActive =
                  currentSelection?.material === currentMaterial.name &&
                  currentSelection?.color === color.name;
                return (
                  <li key={color.name} className="my-[5px] inline-block w-[100px] align-top">
                    <button
                      type="button"
                      onClick={() =>
                        onSelect(active.name, {
                          material: currentMaterial.name,
                          color: color.name,
                        })
                      }
                      className="block w-full"
                    >
                      <span
                        className={`mx-auto block size-[50px] overflow-hidden rounded-full ${
                          isActive
                            ? "scale-[1.2] transition-transform duration-200 ease-out"
                            : "transition-transform duration-[125ms] ease-in-out"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- remote swatch render. */}
                        <img
                          src={swatchUrl(currentMaterial.name, color.name)}
                          alt=""
                          className="size-full object-cover"
                        />
                      </span>
                      <span
                        className={`mt-[18px] block text-[12px] leading-[14px] font-medium ${
                          isActive ? "text-[#151515]" : "text-muted"
                        }`}
                      >
                        {color.label}
                        {active.optional ? ` ${active.label}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}

              {active.optional ? (
                <li className="my-[5px] inline-block w-[100px] align-top">
                  <button
                    type="button"
                    onClick={() => onSelect(active.name, null)}
                    className="block w-full"
                  >
                    <span
                      className={`mx-auto block size-[50px] rounded-full border border-dashed border-[#bbb] ${
                        currentSelection
                          ? "transition-transform duration-[125ms] ease-in-out"
                          : "scale-[1.2] transition-transform duration-200 ease-out"
                      }`}
                    />
                    <span
                      className={`mt-[18px] block text-[12px] leading-[14px] font-medium ${
                        currentSelection ? "text-muted" : "text-[#151515]"
                      }`}
                    >
                      No {active.label}
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
