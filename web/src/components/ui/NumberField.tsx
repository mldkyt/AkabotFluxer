import type { ChangeEvent } from "react";

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  label?: string;
  className?: string;
}

const NumberField = ({ value, onChange, minValue, maxValue, step = 1, label, className = "" }: NumberFieldProps) => {
  const clamp = (v: number) => {
    if (minValue !== undefined && v < minValue) return minValue;
    if (maxValue !== undefined && v > maxValue) return maxValue;
    return v;
  };

  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      <div className="numberfield">
        <input
          type="number"
          value={value}
          min={minValue}
          max={maxValue}
          step={step}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(clamp(Number(e.target.value)))}
        />
        <div className="numberfield-stepper">
          <button type="button" onClick={() => onChange(clamp(value + step))} aria-label="Increase">&#9650;</button>
          <button type="button" onClick={() => onChange(clamp(value - step))} aria-label="Decrease">&#9660;</button>
        </div>
      </div>
    </div>
  );
};

export default NumberField;