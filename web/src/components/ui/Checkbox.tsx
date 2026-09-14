interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

const Checkbox = ({ checked, onChange, label, disabled, className = "" }: CheckboxProps) => {
  return (
    <label className={`checkbox ${disabled ? "disabled" : ""} ${className}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
};

export default Checkbox;