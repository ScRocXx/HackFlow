"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

export function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error("useDropdownMenu must be used within a DropdownMenu")
  }
  return context
}

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ onClick, children, asChild, ...props }, ref) => {
    const { setOpen, open, triggerRef } = useDropdownMenu()
    
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ref: (node: any) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as any).current = node
          // @ts-ignore
          triggerRef.current = node
        },
        onClick: (e: any) => {
          setOpen(!open)
          ;(children as any).props?.onClick?.(e)
          onClick?.(e)
        }
      })
    }

    return (
      <button
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          // @ts-ignore
          triggerRef.current = node
        }}
        type="button"
        onClick={(e) => {
          setOpen(!open)
          onClick?.(e)
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'end' | 'center' }>(
  ({ className, children, align = 'center', ...props }, ref) => {
    const { open, setOpen, triggerRef } = useDropdownMenu()
    const [mounted, setMounted] = React.useState(false)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })

    React.useEffect(() => {
      setMounted(true)
    }, [])

    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          contentRef.current && 
          !contentRef.current.contains(e.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node)
        ) {
          setOpen(false)
        }
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false)
      }

      if (open) {
        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener("keydown", handleEscape)
        
        // Calculate position
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect()
          const top = rect.bottom + window.scrollY + 4 // 4px offset
          
          let left = rect.left + window.scrollX
          if (align === 'end') {
            left = rect.right + window.scrollX - (contentRef.current?.offsetWidth || 0)
          } else if (align === 'center') {
            left = rect.left + window.scrollX + (rect.width / 2) - ((contentRef.current?.offsetWidth || 0) / 2)
          }

          setPosition({ top, left })
        }
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        document.removeEventListener("keydown", handleEscape)
      }
    }, [open, setOpen, align])

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
          "absolute z-50 min-w-[8rem] overflow-hidden border-2 border-[#10201d] bg-[#f7f7f2] p-1 text-[#10201d] shadow-[5px_5px_0_#671912] animate-in fade-in-0 zoom-in-95",
          className
        )}
        style={{ top: position.top, left: position.left }}
        {...props}
      >
        {children}
      </div>,
      document.body
    )
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, onClick, ...props }, ref) => {
    const { setOpen } = useDropdownMenu()

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex cursor-pointer select-none items-center px-2 py-1.5 font-mono text-xs text-[#10201d] outline-none transition-colors hover:bg-[#e4e5da] hover:text-[#10201d] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        onClick={(e) => {
          onClick?.(e)
          setOpen(false)
        }}
        {...props}
      />
    )
  }
)
DropdownMenuItem.displayName = "DropdownMenuItem"

export const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"
