import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive select-none cursor-pointer",
  {
    variants: {
      variant: {
        /* Primary commercial CTA — visually dominant */
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.99]",
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.99]",
        /* Secondary — refined neutral surface */
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 border border-border/40",
        /* Outline — subtle hairline border */
        outline:
          "border border-border bg-background shadow-xs hover:bg-surface-muted hover:text-foreground text-foreground",
        /* Ghost — clean minimal with subtle surface on hover */
        ghost:
          "hover:bg-surface-muted hover:text-foreground text-foreground/80",
        /* Danger / Destructive — critical actions */
        danger:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        /* Link — text link */
        link: "text-primary underline-offset-4 hover:underline",
      },
      /* Mobile touch target minimum: 44px (h-11) */
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3 lg:h-9",
        sm: "h-11 rounded-md gap-1.5 px-4 has-[>svg]:px-3 lg:h-8 lg:px-3 lg:has-[>svg]:px-2.5",
        lg: "h-12 rounded-md px-6 has-[>svg]:px-4 lg:h-10",
        icon: "size-11 lg:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
