interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

const Switch = ({ checked, onChange, label, disabled, className = "" }: SwitchProps) => {
  return (
    <label className={`switch ${disabled ? "disabled" : ""} ${className}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="switch-track" />
      <span className="switch-label">{label}</span>
    </label>
  );
};

export default Switch;