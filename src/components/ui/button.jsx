import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] active:opacity-90 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-4 py-2",
        sm: "h-12 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8",
        icon: "h-12 w-12 min-w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const ICON_LABELS = {
  Pencil: "Edit",
  PencilIcon: "Edit",
  Trash2: "Delete",
  Trash2Icon: "Delete",
  ChevronLeft: "Previous",
  ChevronLeftIcon: "Previous",
  ChevronRight: "Next",
  ChevronRightIcon: "Next",
  ChevronUp: "Expand",
  ChevronUpIcon: "Expand",
  ChevronDown: "Expand",
  ChevronDownIcon: "Expand",
  Menu: "Open menu",
  MenuIcon: "Open menu",
  X: "Close",
  XIcon: "Close",
  Copy: "Copy",
  CopyIcon: "Copy",
  Plus: "Add",
  PlusIcon: "Add",
  RefreshCw: "Refresh",
  RefreshCwIcon: "Refresh",
  RotateCcw: "Reset",
  RotateCcwIcon: "Reset",
  MoreHorizontal: "More options",
  MoreHorizontalIcon: "More options",
  Settings: "Settings",
  SettingsIcon: "Settings",
  User: "Profile",
  UserIcon: "Profile",
}

function inferIconButtonLabel(children) {
  const child = React.Children.toArray(children).find(React.isValidElement)
  const iconName = child?.type?.displayName || child?.type?.name
  return ICON_LABELS[iconName] || "Action"
}

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  const accessibleProps = { ...props }
  if (!asChild && size === "icon" && !accessibleProps["aria-label"]) {
    accessibleProps["aria-label"] = accessibleProps.title || inferIconButtonLabel(accessibleProps.children)
  }
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...accessibleProps} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }