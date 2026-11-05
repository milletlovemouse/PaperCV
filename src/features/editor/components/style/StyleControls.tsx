import { Button } from "@/shared/ui";

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
      <div className="style-chips" role="group" aria-label={label}>
        {options.map(([id, text]) => (
          <Button
            key={id}
            aria-pressed={value === id}
            className={value === id ? "chosen" : ""}
            onClick={() => onChange(id)}
          >
            {text}
          </Button>
        ))}
      </div>
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
