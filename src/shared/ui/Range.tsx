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
        className="rt-SliderRoot rt-r-size-1 rt-variant-surface"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
      >
        <Slider.Track className="rt-SliderTrack">
          <Slider.Range className="rt-SliderRange" />
        </Slider.Track>
        <Slider.Thumb className="rt-SliderThumb" aria-label={label} />
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
