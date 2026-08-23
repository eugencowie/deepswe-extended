import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/components/ui/theme-provider";

const triggerIcons = { light: Sun, dark: Moon, system: Monitor };
const nextTheme: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const TriggerIcon = triggerIcons[theme];

  return (
    <Button variant="outline" size="icon" onClick={() => setTheme(nextTheme[theme])}>
      <TriggerIcon className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
