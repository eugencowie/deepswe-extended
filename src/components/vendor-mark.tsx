import { cn } from "@/components/ui/utils";
import { vendorMarkSvgs } from "@/components/vendor-mark-svgs";

export function VendorMark({ vendor, className }: { vendor: string; className?: string }) {
  const svg = vendorMarkSvgs[vendor];
  if (svg === undefined) return null;
  return (
    <span
      role="img"
      aria-label={vendor}
      className={cn("inline-block align-text-bottom [&>svg]:size-4", className)}
      // Static build-time SVG strings from the icon package, never user input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
