import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

const Card = ({ children, hover, className = "", ...props }: CardProps) => {
  return (
    <div className={`card ${hover ? "card--hover" : ""} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;