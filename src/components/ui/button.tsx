import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control-sm)] border border-transparent text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,opacity,transform,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/90 active:opacity-90",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 active:bg-destructive/90 active:opacity-90 focus-visible:ring-destructive/40",
        outline:
          "border-input bg-input/35 text-foreground shadow-xs hover:bg-input/55 active:bg-input/55 active:opacity-90",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/85 active:bg-secondary/85 active:opacity-90",
        ghost:
          "text-muted-foreground hover:bg-muted/70 hover:text-foreground active:bg-muted/70 active:opacity-90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-[var(--radius-control-xs)] px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-5 has-[>svg]:px-4",
        icon: "size-10 rounded-[var(--radius-control)]",
        "icon-xs": "size-6 rounded-[var(--radius-control-xs)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-[var(--radius-control-sm)]",
        "icon-lg": "size-11 rounded-[var(--radius-control)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
