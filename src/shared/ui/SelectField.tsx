export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <UISelect
        label={label}
        value={value}
        options={[
          ["", "不填写"],
          ...(value && !options.includes(value) ? [[value, value] as const] : []),
          ...options.map((option) => [option, option] as const),
        ]}
        onChange={onChange}
      />
    </div>
  );
}

import { UISelect } from "./UISelect";
