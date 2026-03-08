import { useTheme, type ThemeId } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"

const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: "portugal", label: "Portugal" },
  { id: "portugal-dark", label: "Portugal Dark" },
  { id: "minimal", label: "Minimal" },
  { id: "neon", label: "Neon" },
]

export function ThemeSelector() {
  const [current, setTheme] = useTheme()

  return (
    <div className="grid grid-cols-2 gap-2 w-full max-w-[240px]">
      {THEME_OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTheme(id)}
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
            "hover:scale-[1.02] active:scale-[0.98]",
            current === id
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
