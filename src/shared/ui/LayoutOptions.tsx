import { SegmentedControl } from "@radix-ui/themes";

export function LayoutOptions({
  label,
  value,
  onChange,
  options = [
    ["auto", "默认"],
    ["left", "居左"],
    ["center", "居中"],
    ["right", "居右"],
  ],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: Array<[string, string]>;
}) {
  return (
    <div className="layout-option">
      <span>{label}</span>
      <SegmentedControl.Root
        aria-label={label}
        value={value}
        onValueChange={onChange}
        className="layout-segments"
        size="1"
      >
        {options.map(([id, text]) => (
          <SegmentedControl.Item key={id} value={id}>
            {text}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
    </div>
  );
}
