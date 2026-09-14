import type { HTMLAttributes } from "react";

const Skeleton = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => {
  return <div className={`skeleton ${className}`} {...props} />;
};

export default Skeleton;