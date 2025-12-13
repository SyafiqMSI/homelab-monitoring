"use client"

import * as React from "react"
import { Check, Moon, Paintbrush, Sun, Monitor } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

const colors = [
    {
        name: "zinc",
        label: "Zinc",
        color: "hsl(240 5.9% 10%)",
        vars: {
            "--primary": "0.21 0.006 285.885",
            "--ring": "0.871 0.006 286.286",
        }
    },
    {
        name: "red",
        label: "Red",
        color: "hsl(0 72.2% 50.6%)",
        vars: {
            "--primary": "0.577 0.245 27.325",
            "--ring": "0.577 0.245 27.325",
        }
    },
    {
        name: "orange",
        label: "Orange",
        color: "hsl(20.5 90.2% 48.2%)",
        vars: {
            "--primary": "0.646 0.222 41.116",
            "--ring": "0.646 0.222 41.116",
        }
    },
    {
        name: "green",
        label: "Green",
        color: "hsl(142.1 76.2% 36.3%)",
        vars: {
            "--primary": "0.5 0.2 145",
            "--ring": "0.5 0.2 145",
        }
    },
    {
        name: "blue",
        label: "Blue",
        color: "hsl(221.2 83.2% 53.3%)",
        vars: {
            "--primary": "0.488 0.243 264.376",
            "--ring": "0.488 0.243 264.376",
        }
    },
    {
        name: "violet",
        label: "Violet",
        color: "hsl(262.1 83.3% 57.8%)",
        vars: {
            "--primary": "0.5 0.2 290",
            "--ring": "0.5 0.2 290",
        }
    },
]

export function ThemeCustomizer() {
    const { setTheme, theme } = useTheme()
    const [color, setColor] = React.useState("zinc")
    const [radius, setRadius] = React.useState(0.625) // Default based on styles.css

    React.useEffect(() => {
        const root = document.documentElement

        // Radius
        root.style.setProperty("--radius", `${radius}rem`)

        // Color
        const selectedColor = colors.find(c => c.name === color)
        if (selectedColor) {
            if (selectedColor.name === 'zinc') {
                // Reset to default
                root.style.removeProperty("--primary")
                root.style.removeProperty("--ring")
            } else {
                root.style.setProperty("--primary", `oklch(${selectedColor.vars["--primary"]})`)
                root.style.setProperty("--ring", `oklch(${selectedColor.vars["--ring"]})`)
            }
        }
    }, [radius, color])

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Paintbrush className="h-4 w-4" />
                    <span className="sr-only">Customize</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Theme Customizer</h4>
                        <p className="text-sm text-muted-foreground">
                            Customize the appearance of your homelab.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {colors.map((c) => (
                                <Button
                                    key={c.name}
                                    variant={"outline"}
                                    size="sm"
                                    onClick={() => setColor(c.name)}
                                    className={cn(
                                        "justify-start",
                                        color === c.name && "border-2 border-primary"
                                    )}
                                >
                                    <span
                                        className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center mr-2 ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800"
                                        style={{ backgroundColor: c.color }}
                                    >
                                        {color === c.name && <Check className="h-3 w-3 text-white mix-blend-difference" />}
                                    </span>
                                    {c.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Radius</Label>
                        <div className="grid grid-cols-5 gap-2">
                            {[0, 0.3, 0.5, 0.75, 1.0].map((r) => (
                                <Button
                                    key={r}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRadius(r)}
                                    className={cn(radius === r && "border-2 border-primary")}
                                >
                                    {r}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Mode</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTheme("light")}
                                className={cn(theme === "light" && "border-2 border-primary")}
                            >
                                <Sun className="mr-2 h-4 w-4" />
                                Light
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTheme("dark")}
                                className={cn(theme === "dark" && "border-2 border-primary")}
                            >
                                <Moon className="mr-2 h-4 w-4" />
                                Dark
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTheme("system")}
                                className={cn(theme === "system" && "border-2 border-primary")}
                            >
                                <Monitor className="mr-2 h-4 w-4" />
                                System
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
