import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-mono text-xs sm:text-sm font-bold tracking-tight transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10201d] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#e97b77] text-[#10201d] border-2 border-[#10201d] shadow-[5px_5px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#671912]",
        secondary:
          "bg-transparent text-[#f7f7f2] border-2 border-white/80 shadow-[5px_5px_0_#2e4742] hover:bg-[#f7f7f2] hover:text-[#10201d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#2e4742]",
        outline:
          "border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] shadow-[4px_4px_0_#10201d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#10201d]",
        destructive:
          "bg-[#e53927] text-[#f7f7f2] border-2 border-[#10201d] shadow-[5px_5px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#671912]",
        ghost: "hover:bg-[#e4e5da] text-[#10201d] hover:border-2 hover:border-[#10201d]",
        link: "text-[#10201d] underline decoration-2 underline-offset-4 hover:text-[#e53927]",
      },
      size: {
        default: "min-h-[44px] px-5 py-2.5",
        sm: "min-h-[36px] px-3.5 py-1.5 text-xs",
        lg: "min-h-[50px] px-8 py-3 text-sm sm:text-base",
        icon: "h-10 w-10 border-2 border-[#10201d] shadow-[3px_3px_0_#10201d]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
