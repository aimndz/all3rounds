import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pageShellVariants = cva("app-shell", {
  variants: {
    width: {
      default: "",
      narrow: "app-shell--narrow",
      prose: "app-shell--prose",
    },
    spacing: {
      default: "",
      compact: "py-6 sm:py-8",
      roomy: "py-12 md:py-20",
      centered: "flex items-center justify-center py-12",
    },
  },
  defaultVariants: {
    width: "default",
    spacing: "default",
  },
});

type PageShellProps = React.ComponentProps<"main"> &
  VariantProps<typeof pageShellVariants>;

function PageShell({
  className,
  width,
  spacing,
  ...props
}: PageShellProps) {
  return (
    <main
      className={cn(pageShellVariants({ width, spacing }), className)}
      {...props}
    />
  );
}

function PageStack({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("app-stack", className)} {...props} />;
}

export { PageShell, PageStack, pageShellVariants };
