"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

// ── Snap point conversion ─────────────────────────────────────────────────────
// Base UI Drawer: 0-1 fractions, px numbers >1, 'Xpx'/'Xrem' strings
// Our API exposes 'Xvh'/'Xsvh'/'Xdvh' → convert to fractions
type DrawerSnapPoint = number | string

function toDrawerSnapPoint(pt: string): DrawerSnapPoint {
  const m = pt.match(/^(\d+(?:\.\d+)?)(svh|dvh|vh)$/)
  if (m) return parseFloat(m[1]) / 100
  return pt
}

// ── Context to route SheetContent to the right mode ──────────────────────────
type SheetCtx = { isDrawer: boolean; dragHandle: boolean }
const SheetContext = React.createContext<SheetCtx>({ isDrawer: false, dragHandle: false })

// ── Sheet Root ────────────────────────────────────────────────────────────────

type SheetDialogProps = DialogPrimitive.Root.Props & {
  snapPoints?: undefined
  defaultSnap?: undefined
  dragHandle?: boolean
}

type SheetDrawerProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean | "trap-focus"
  children?: React.ReactNode
  snapPoints: string[]
  defaultSnap?: number
  dragHandle?: boolean
}

type SheetProps = SheetDialogProps | SheetDrawerProps

function Sheet(props: SheetProps) {
  const isDrawer = Array.isArray((props as SheetDrawerProps).snapPoints)

  if (isDrawer) {
    const {
      snapPoints,
      defaultSnap = 0,
      dragHandle = true,
      open,
      defaultOpen,
      onOpenChange,
      modal,
      children,
    } = props as SheetDrawerProps

    const drawerSnaps = snapPoints.map(toDrawerSnapPoint)
    const defaultSnapPoint = drawerSnaps[defaultSnap] ?? drawerSnaps[0]

    return (
      <SheetContext.Provider value={{ isDrawer: true, dragHandle }}>
        <DrawerPrimitive.Root
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          modal={modal}
          snapPoints={drawerSnaps}
          defaultSnapPoint={defaultSnapPoint}
        >
          {children}
        </DrawerPrimitive.Root>
      </SheetContext.Provider>
    )
  }

  const { snapPoints: _s, defaultSnap: _d, dragHandle, ...dialogProps } =
    props as SheetDialogProps

  return (
    <SheetContext.Provider value={{ isDrawer: false, dragHandle: dragHandle ?? false }}>
      <DialogPrimitive.Root data-slot="sheet" {...dialogProps} />
    </SheetContext.Provider>
  )
}

// ── SheetTrigger / SheetClose ─────────────────────────────────────────────────

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  )
}

// ── SheetContent ──────────────────────────────────────────────────────────────

type SheetContentOwnProps = {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}

type SheetContentProps = SheetContentOwnProps &
  Omit<DialogPrimitive.Popup.Props, keyof SheetContentOwnProps>

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  style,
  ...props
}: SheetContentProps) {
  const { isDrawer, dragHandle } = React.useContext(SheetContext)

  if (isDrawer) {
    return (
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-navy-900/20 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
        />
        <DrawerPrimitive.Popup
          data-slot="sheet-drawer-popup"
          className={cn(
            // Positioning — full-height panel anchored at the bottom
            "fixed inset-x-0 bottom-0 z-50 h-svh",
            // Visual
            "flex flex-col bg-popover text-popover-foreground shadow-lg rounded-t-2xl border-t border-ink-100",
            className,
          )}
          style={{
            transform:
              "translateY(calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-y, 0px)))",
            ...style,
          }}
          {...(props as Omit<DrawerPrimitive.Popup.Props, "style" | "className">)}
        >
          {dragHandle && (
            <div
              className="mx-auto mt-3 mb-0 w-10 h-1 rounded-full bg-ink-200 shrink-0"
              aria-hidden="true"
            />
          )}
          {children}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Portal>
    )
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className,
        )}
        style={style}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </SheetPortal>
  )
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
