import { cn } from "@/lib/utils";
import { getBrandAssetHref } from "@/lib/favicon";
import { useTheme } from "@/stores/theme";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  const { theme } = useTheme();

  return (
    <img
      src={getBrandAssetHref("favicon", theme)}
      alt=""
      className={cn("select-none rounded-md", className)}
      draggable={false}
    />
  );
}
