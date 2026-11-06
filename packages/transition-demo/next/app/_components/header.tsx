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
            <path d="M34 66.8257C34 65.0442 36.1535 64.1517 37.4136 65.4109L134.253 162.172C135.513 163.431 137.667 162.538 137.667 160.757V125.578C137.667 123.369 139.458 121.578 141.667 121.578H184C186.209 121.578 188 123.369 188 125.578V282.174C188 283.956 185.847 284.848 184.586 283.589L35.1727 134.298C34.4219 133.548 34 132.53 34 131.468V66.8257Z" />
            <path d="M49.4156 68.4145C48.1553 67.1546 49.0476 65 50.8296 65H288.547C292.152 65 293.917 69.3931 291.315 71.8875L247.271 114.11C246.484 114.865 246.039 115.908 246.039 116.998V221.382C246.039 222.42 245.636 223.417 244.914 224.163L199.169 271.447C197.919 272.739 195.731 271.854 195.731 270.056V119.291C195.731 117.082 193.94 115.291 191.731 115.291H97.9646C96.904 115.291 95.8868 114.87 95.1367 114.12L49.4156 68.4145Z" />
        </svg>
    );
}
