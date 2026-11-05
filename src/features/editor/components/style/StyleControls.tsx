import { Button, ChoiceGroup, ChoiceItem } from "@/shared/ui";

export function ChoiceChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="layout-option">
      <span>{label}</span>
      <ChoiceGroup label={label} className="style-chips" value={value} onChange={onChange}>
        {options.map(([id, text]) => (
          <ChoiceItem key={id} value={id} asChild>
            <Button className={value === id ? "chosen" : ""}>{text}</Button>
          </ChoiceItem>
        ))}
      </ChoiceGroup>
    </div>
  );
}
export function ColorSetting({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="color-setting">
      <span>{label}</span>
      <input
        type="color"
        aria-label={label}
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onChange("");
        }}
      >
        跟随主题
      </button>
    </label>
  );
}
