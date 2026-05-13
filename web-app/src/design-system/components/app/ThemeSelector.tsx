import { useTheme, type ThemeId, THEME_PREFERENCE_AUTO } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"

const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: "portugal", label: "Portugal" },
  { id: "dev", label: "Dev (sandbox)" },
  { id: "minimal", label: "Minimal" },
  { id: "neon", label: "Neon" },
]

export function ThemeSelector() {
  const [current, setTheme] = useTheme()

  return (
    <div className="grid w-full max-w-[260px] grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setTheme(THEME_PREFERENCE_AUTO)}
        className={cn(
          "col-span-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
          "hover:scale-[1.02] active:scale-[0.98]",
          current === THEME_PREFERENCE_AUTO
            ? "bg-primary text-primary-foreground shadow"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        Automático (sistema)
      </button>
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
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
