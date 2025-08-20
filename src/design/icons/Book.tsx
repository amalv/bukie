import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

export function IconBook({
  width = 20,
  height = 20,
  fill = "currentColor",
  ...props
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
      fill={fill}
      {...props}
    >
      <path d="M5 3.5C5 2.672 5.672 2 6.5 2H18a2 2 0 0 1 2 2v14.75a.75.75 0 0 1-1.18.615C17.64 18.45 15.88 18 14 18H7.5A2.5 2.5 0 0 0 5 20.5V3.5Zm1.5-.5A.5.5 0 0 0 6 3.5V19a3.48 3.48 0 0 1 1.5-.5H14c1.74 0 3.36.37 4.5 1.03V4a1 1 0 0 0-1-1H6.5Z" />
      <path d="M8 5.5h7.5a.5.5 0 1 1 0 1H8a.5.5 0 1 1 0-1Zm0 3h7.5a.5.5 0 1 1 0 1H8a.5.5 0 1 1 0-1Z" />
    </svg>
  );
}

export default IconBook;
