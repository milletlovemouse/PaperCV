import { Switch } from "radix-ui";
import { useId } from "react";

export function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label className="switch-field" htmlFor={id}>
      <span className="switch-field-copy">
        <span id={`${id}-label`}>{label}</span>
        {description && <small id={`${id}-description`}>{description}</small>}
      </span>
      <Switch.Root
        id={id}
        className="ui-switch"
        aria-labelledby={`${id}-label`}
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={description ? `${id}-description` : undefined}
      >
        <Switch.Thumb className="ui-switch-thumb" />
      </Switch.Root>
    </label>
  );
}
