"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LinkPreviewProps {
    children: React.ReactNode;
    url: string;
    className?: string;
    width?: number;
    height?: number;
    isStatic?: boolean;
    imageSrc?: string;
    as?: "a" | "div";
}

export function LinkPreview({
    children,
    url,
    className,
    width = 200,
    height = 125,
    isStatic = false,
    imageSrc = "",
    as = "a",
}: LinkPreviewProps) {
    const [isVisible, setIsVisible] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [hasPopped, setHasPopped] = React.useState(false);
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
    const previewRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLAnchorElement>(null);

    // Generate preview URL
    const previewSrc = React.useMemo(() => {
        if (isStatic) return imageSrc;

        const params = new URLSearchParams({
            url: url,
            screenshot: "true",
            meta: "false",
            embed: "screenshot.url",
            colorScheme: "light",
            "viewport.isMobile": "true",
            "viewport.deviceScaleFactor": "1",
            "viewport.width": String(width * 3),
            "viewport.height": String(height * 3),
        });

        return `https://api.microlink.io/?${params.toString()}`;
    }, [url, isStatic, imageSrc, width, height]);

    // Calculate preview position
    const previewStyle = React.useMemo<React.CSSProperties>(() => {
        if (!isVisible) return {};

        const offset = 20;
        const previewWidth = width;
        const previewHeight = height;
        const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1000;

        let x = mousePosition.x - previewWidth / 2;
        x = Math.min(Math.max(0, x), viewportWidth - previewWidth);

        // Using triggerRef to anchor it
        const linkRect = triggerRef.current?.getBoundingClientRect();
        const y = linkRect ? linkRect.top - previewHeight - offset : 0;

        return {
            position: "fixed",
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`,
            zIndex: 50,
            pointerEvents: "none",
        };
    }, [isVisible, mousePosition.x, width, height]);

    const handleMouseMove = (event: React.MouseEvent) => {
        setMousePosition({ x: event.clientX, y: event.clientY });
    };

    const showPreview = () => {
        setIsVisible(true);
        setTimeout(() => {
            setHasPopped(true);
        }, 50);
    };

    const hidePreview = () => {
        setIsVisible(false);
        setHasPopped(false);
    };

    const Tag = as;
    const linkProps = as === "a" ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {};

    return (
        <>
            <style>
                {`
        @keyframes pop {
          0% { transform: scale3d(0.26, 0.26, 1); }
          25% { transform: scale3d(1.1, 1.1, 1); }
          65% { transform: scale3d(0.98, 0.98, 1); }
          100% { transform: scale3d(1, 1, 1); }
        }
        .animate-pop {
          animation: pop 1000ms ease forwards;
          will-change: transform;
        }
        `}
            </style>

            <div className={cn("relative inline-block", className)}>
                <Tag
                    // @ts-ignore - Ref type mismatch is fine here for simple usage
                    ref={triggerRef}
                    {...linkProps}
                    className={cn("text-foreground block h-full w-full", className)}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={showPreview}
                    onMouseLeave={hidePreview}
                >
                    {children}
                </Tag>

                {isVisible && (
                    <div ref={previewRef} style={previewStyle}>
                        <div
                            className={cn(
                                "overflow-hidden rounded-xl shadow-xl",
                                hasPopped ? "animate-pop" : "",
                                !isStatic && "transform-gpu origin-bottom"
                            )}
                        >
                            <div className="block rounded-xl border-2 border-transparent bg-white p-1 shadow-lg dark:bg-gray-900">
                                <img
                                    src={previewSrc}
                                    width={width}
                                    height={height}
                                    className="h-full w-full rounded-lg object-cover"
                                    alt="preview"
                                    onLoad={() => setIsLoading(false)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
