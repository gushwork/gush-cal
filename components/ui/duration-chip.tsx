import { cn } from "@/lib/ui/cn";

export type DurationChipProps = {
  value: number;
  selected: boolean;
  onSelect: (value: number) => void;
  disabled?: boolean;
};

export function DurationChip({
  value,
  selected,
  onSelect,
  disabled = false,
}: DurationChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={cn(
        "interactive inline-flex cursor-pointer items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-primary bg-primary text-white"
          : "border-border bg-surface text-ink hover:border-primary hover:bg-primary-soft",
      )}
    >
      {value} min
    </button>
  );
}

export type DurationChipGroupProps = {
  values: number[];
  selected: number | number[];
  onChange: (selected: number | number[]) => void;
  mode?: "single" | "multi";
};

export function DurationChipGroup({
  values,
  selected,
  onChange,
  mode = "single",
}: DurationChipGroupProps) {
  const isSelected = (value: number) =>
    Array.isArray(selected) ? selected.includes(value) : selected === value;

  const handleSelect = (value: number) => {
    if (mode === "single") {
      onChange(value);
      return;
    }

    const current = Array.isArray(selected) ? selected : [selected];
    if (current.includes(value)) {
      onChange(current.filter((v) => v !== value));
    } else {
      onChange([...current, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Duration">
      {values.map((value) => (
        <DurationChip
          key={value}
          value={value}
          selected={isSelected(value)}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
