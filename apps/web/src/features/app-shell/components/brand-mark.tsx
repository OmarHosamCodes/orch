import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      className={cn("select-none rounded-md", className)}
      draggable={false}
    />
  );
}
