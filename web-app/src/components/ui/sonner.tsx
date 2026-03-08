"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

function getToastTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  const theme = document.documentElement.getAttribute("data-theme") ?? ""
  return theme.includes("dark") || theme === "neon" ? "dark" : "light"
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={getToastTheme()}
      className="toaster group"
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
