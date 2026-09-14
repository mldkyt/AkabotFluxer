import type { HTMLAttributes, LabelHTMLAttributes } from "react";

export const Label = (props: LabelHTMLAttributes<HTMLLabelElement>) => {
  return <label {...props} />;
};

export const Description = (props: HTMLAttributes<HTMLSpanElement>) => {
  const { className = "", ...rest } = props;
  return <span className={`field-description ${className}`} {...rest} />;
};

export const FieldError = (props: HTMLAttributes<HTMLSpanElement>) => {
  const { className = "", ...rest } = props;
  return <span className={`field-error ${className}`} {...rest} />;
};