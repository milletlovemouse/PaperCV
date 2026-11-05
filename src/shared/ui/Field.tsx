import { TextField } from "@radix-ui/themes";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <TextField.Root
        size="2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || `请输入${label}`}
      />
    </label>
  );
}
