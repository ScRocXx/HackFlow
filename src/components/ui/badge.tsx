import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border-2 border-[#10201d] px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#10201d] text-[#f7f7f2] shadow-[2px_2px_0_#671912]",
        secondary:
          "bg-[#f7f7f2] text-[#10201d] shadow-[2px_2px_0_#2e4742]",
        destructive:
          "bg-[#e53927] text-[#f7f7f2] shadow-[2px_2px_0_#671912]",
        outline: "bg-transparent text-[#10201d]",
        coral: "bg-[#e97b77] text-[#10201d] shadow-[2px_2px_0_#671912]",
        gold: "bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#8a5d13]",
        blue: "bg-[#8bb2de] text-[#10201d] shadow-[2px_2px_0_#2e4742]",
        teal: "bg-[#3d5f58] text-[#f7f7f2] shadow-[2px_2px_0_#10201d]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)


export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
