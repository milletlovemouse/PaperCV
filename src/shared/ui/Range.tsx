import { Slider } from "radix-ui";

export function Range({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-field">
      <span>
        {label}
        <b>
          {Number(value.toFixed(2))}
          <small>{unit}</small>
        </b>
      </span>
      <Slider.Root
        className="ui-slider"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
      >
        <Slider.Track className="ui-slider-track">
          <Slider.Range className="ui-slider-range" />
        </Slider.Track>
        <Slider.Thumb
          className="ui-slider-thumb"
          aria-label={label}
          aria-valuetext={`${Number(value.toFixed(2))}${unit}`}
        />
      </Slider.Root>
      <div>
        <small>
          {min}
          {unit}
        </small>
        <small>
          {max}
          {unit}
        </small>
      </div>
    </div>
  );
}
