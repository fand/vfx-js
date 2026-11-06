"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { links, nav } from "../_lib/site";

export function Header() {
    const pathname = usePathname();
    const tone =
        pathname === "/transitions" || pathname === "/playground"
            ? "dark"
            : "light";
    const isDocs = nav.some((item) => item.href === pathname);
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <header className="header" data-tone={tone}>
            <Link href="/" className="brand">
                <BrandMark />
                <span>
                    vfx-js<span className="brand-slash">/</span>transitions
                </span>
            </Link>
            <nav className="header-nav">
                <Link
                    href="/getting-started"
                    aria-current={isDocs ? "page" : undefined}
                >
                    Docs
                </Link>
                <Link
                    href="/playground"
                    aria-current={
                        pathname === "/playground" ? "page" : undefined
                    }
                >
                    Playground
                </Link>
                <a href={links.vfxjs} target="_blank" rel="noreferrer">
                    VFX-JS
                </a>
                <a
                    className="header-gh"
                    href={links.github}
                    target="_blank"
                    rel="noreferrer"
                >
                    <GitHubIcon />
                </a>
            </nav>
            <button
                type="button"
                className="header-menu-button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="header-menu"
                onClick={() => setOpen((v) => !v)}
            >
                <span data-open={open} aria-hidden />
            </button>
            {open && (
                <nav id="header-menu" className="header-menu">
                    {nav.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={
                                item.href === pathname ? "page" : undefined
                            }
                            onClick={close}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <hr />
                    <Link
                        href="/playground"
                        aria-current={
                            pathname === "/playground" ? "page" : undefined
                        }
                        onClick={close}
                    >
                        Playground
                    </Link>
                    <a
                        href={links.vfxjs}
                        target="_blank"
                        rel="noreferrer"
                        onClick={close}
                    >
                        VFX-JS
                    </a>
                    <a
                        href={links.github}
                        target="_blank"
                        rel="noreferrer"
                        onClick={close}
                    >
                        GitHub
                    </a>
                </nav>
            )}
        </header>
    );
}
export function GitHubIcon() {
    return (
        <svg viewBox="0 0 16 16" width="18" height="18" role="img">
            <title>GitHub</title>
            <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
        </svg>
    );
}

/** The VFX-JS Transitions logo. Takes the text color. */
export function BrandMark() {
    return (
        <svg
            className="brand-mark"
            viewBox="0 0 320 320"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M27.8288 78.9485C25.3089 76.4287 27.0935 72.12 30.6572 72.12H83.9833C85.0441 72.12 86.0614 72.5414 86.8115 73.2914L173.646 160.116C174.906 161.376 177.06 160.484 177.06 158.702V129.14C177.06 126.931 178.851 125.14 181.06 125.14H218.77C220.979 125.14 222.77 126.931 222.77 129.14V264.224C222.77 267.787 218.462 269.572 215.942 267.052L27.8288 78.9485Z" />
            <path d="M99.3951 75.5344C98.135 74.2745 99.0272 72.12 100.809 72.12H284.703C286.404 72.12 287.328 74.1067 286.234 75.4076L276.729 86.7037C276.123 87.4247 275.79 88.3367 275.79 89.2789V193.67C275.79 194.515 275.523 195.338 275.026 196.021L233.698 252.901C232.559 254.468 230.08 253.662 230.08 251.725V121.82C230.08 119.611 228.289 117.82 226.08 117.82H143.347C142.286 117.82 141.269 117.399 140.518 116.649L99.3951 75.5344Z" />
        </svg>
    );
}
