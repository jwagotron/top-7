import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center py-4", className)}
    {...props}>
    <SliderPrimitive.Track
      className="relative h-2 w-full grow overflow-hidden rounded-full bg-gradient-to-r from-muted via-primary/20 to-muted shadow-inner">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary to-primary/80 shadow-sm" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-5 w-5 rounded-full border-2 border-primary bg-card shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }