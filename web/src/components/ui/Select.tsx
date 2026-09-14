import type { ChangeEvent, ReactNode, SelectHTMLAttributes } from "react";

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
}

const Select = ({ value, onChange, label, children, className = "", ...props }: SelectProps) => {
  return (
    <div className={`field ${className}`}>
      <label>{label}</label>
      <select value={value} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)} {...props}>
        {children}
      </select>
    </div>
  );
};

export default Select;