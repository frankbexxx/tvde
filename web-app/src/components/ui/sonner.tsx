"use client"

import { useEffect } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Um só max(). Os 24 px e os 16 px são os afastamentos de origem do Sonner 2
 * (desktop e móvel até 600 px). Passar `bottom` substitui essa variável;
 * não se soma ao valor que o Sonner já aplica.
 * A barra da aplicação, quando existe, já inclui o inset inferior na altura medida.
 */
const TOAST_BOTTOM_DESKTOP =
  "max(24px, env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px), var(--app-bottom-chrome, 0px))"
const TOAST_BOTTOM_MOBILE =
  "max(16px, env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px), var(--app-bottom-chrome, 0px))"

function syncAppBottomChrome() {
  let height = 0
  document.querySelectorAll("nav").forEach((nav) => {
    let node: HTMLElement | null = nav
    while (node) {
      if (getComputedStyle(node).position === "fixed") {
        const rect = node.getBoundingClientRect()
        if (rect.height > 0 && rect.bottom >= window.innerHeight - 1) {
          height = Math.max(height, rect.height)
        }
        break
      }
      node = node.parentElement
    }
  })
  document.documentElement.style.setProperty("--app-bottom-chrome", `${Math.ceil(height)}px`)
}

function getToastTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  const theme = document.documentElement.getAttribute("data-theme") ?? ""
  return theme.includes("dark") || theme === "neon" ? "dark" : "light"
}

const Toaster = ({ ...props }: ToasterProps) => {
  useEffect(() => {
    syncAppBottomChrome()
    const observer = new MutationObserver(() => syncAppBottomChrome())
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener("resize", syncAppBottomChrome)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncAppBottomChrome)
    }
  }, [])

  return (
    <Sonner
      theme={getToastTheme()}
      className="toaster group"
      offset={{ bottom: TOAST_BOTTOM_DESKTOP }}
      mobileOffset={{ bottom: TOAST_BOTTOM_MOBILE }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
