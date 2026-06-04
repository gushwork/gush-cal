import { Chip } from "./chip";

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
    <Chip
      selected={selected}
      disabled={disabled}
      shape="pill"
      onClick={() => onSelect(value)}
    >
      {value} min
    </Chip>
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
