"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 relative inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 lg:before:hidden",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none absolute top-1/2 block size-4 -translate-y-1/2 rounded-full ring-0 transition-[inset-inline-start] data-[state=unchecked]:start-0 data-[state=checked]:start-[calc(100%-1rem)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
