import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isDisabled?: boolean;
}

const Button = ({ variant = "primary", className = "", children, isDisabled, ...props }: ButtonProps) => {
  const variantClass = variant === "danger" ? "btn-danger" : variant === "secondary" ? "btn-secondary" : "";
  return (
    <button className={`btn ${variantClass} ${className}`} disabled={isDisabled ?? props.disabled} {...props}>
      {children}
    </button>
  );
};

export default Button;