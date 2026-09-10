import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full border-2 border-[#10201d] bg-[#f7f7f2] px-3.5 py-2 font-mono text-xs sm:text-sm text-[#10201d] shadow-[2px_2px_0_#10201d] transition-all placeholder:text-[#34433f]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e97b77] focus-visible:border-[#10201d] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
