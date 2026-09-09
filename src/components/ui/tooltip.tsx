"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement | null>
}

const TooltipContext = React.createContext<TooltipContextValue | undefined>(undefined)

export function Tooltip({ children, delayDuration = 300 }: { children: React.ReactNode, delayDuration?: number }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(false)
  }

  return (
    <TooltipContext.Provider value={{ open, setOpen, triggerRef }}>
      <div 
        className="inline-block" 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        ref={triggerRef}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

export function useTooltip() {
  const context = React.useContext(TooltipContext)
  if (!context) {
    throw new Error("useTooltip must be used within a Tooltip")
  }
  return context
}

export const TooltipTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    )
  }
)
TooltipTrigger.displayName = "TooltipTrigger"

export const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { side?: "top" | "bottom" | "left" | "right" }>(
  ({ className, side = "top", ...props }, ref) => {
    const { open, triggerRef } = useTooltip()
    const [mounted, setMounted] = React.useState(false)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })

    React.useEffect(() => {
      setMounted(true)
    }, [])

    React.useEffect(() => {
      if (open && triggerRef.current && contentRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect()
        const contentRect = contentRef.current.getBoundingClientRect()
        
        let top = 0
        let left = 0

        switch (side) {
          case "top":
            top = triggerRect.top + window.scrollY - contentRect.height - 4
            left = triggerRect.left + window.scrollX + (triggerRect.width / 2) - (contentRect.width / 2)
            break
          case "bottom":
            top = triggerRect.bottom + window.scrollY + 4
            left = triggerRect.left + window.scrollX + (triggerRect.width / 2) - (contentRect.width / 2)
            break
          case "left":
            top = triggerRect.top + window.scrollY + (triggerRect.height / 2) - (contentRect.height / 2)
            left = triggerRect.left + window.scrollX - contentRect.width - 4
            break
          case "right":
            top = triggerRect.top + window.scrollY + (triggerRect.height / 2) - (contentRect.height / 2)
            left = triggerRect.right + window.scrollX + 4
            break
        }

        setPosition({ top, left })
      }
    }, [open, side])

    if (!mounted || !open) return null

    return createPortal(
      <div
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          // @ts-ignore
          contentRef.current = node
        }}
        className={cn(
          "absolute z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95",
          className
        )}
        style={{ top: position.top, left: position.left }}
        {...props}
      />,
      document.body
    )
  }
)
TooltipContent.displayName = "TooltipContent"
