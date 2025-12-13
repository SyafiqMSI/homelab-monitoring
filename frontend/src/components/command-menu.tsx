"use client"

import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import {
    LayoutDashboard,
    Container,
    Server,
    Globe,
    Terminal,
    Search,
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const navigate = useNavigate()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <Button
                variant="outline"
                className="relative h-9 w-9 p-0 md:h-9 md:w-64 md:justify-start md:px-4 lg:w-80 justify-center border-muted-foreground/20 bg-muted/50 hover:bg-muted/80 text-muted-foreground"
                onClick={() => setOpen(true)}
            >
                <Search className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline-flex">Search routes & commands...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Pages">
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/" }))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/containers" }))}>
                            <Container className="mr-2 h-4 w-4" />
                            <span>Containers</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/devices" }))}>
                            <Server className="mr-2 h-4 w-4" />
                            <span>Devices</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/services" }))}>
                            <Globe className="mr-2 h-4 w-4" />
                            <span>Services</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/terminal" }))}>
                            <Terminal className="mr-2 h-4 w-4" />
                            <span>Terminal</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
