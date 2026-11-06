"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { nav } from "../_lib/site";

export function DocSidebar() {
    // Keep the path from mount. During a run the old page stays on screen,
    // and usePathname would already give it the new path.
    const pathname = useRef(usePathname()).current;
    if (pathname === "/" || pathname === "/playground") {
        return null;
    }
    const tone = pathname === "/transitions" ? "dark" : "light";
    return (
        <nav className="doc-sidebar" data-tone={tone} aria-label="Docs">
            <ul>
                {nav.map((item) => {
                    const current = item.href === pathname;
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={current ? "page" : undefined}
                            >
                                {item.label}
                            </Link>
                            {current && (
                                <ul>
                                    {item.sections.map((section) => (
                                        <li key={section.id}>
                                            <Link href={`#${section.id}`}>
                                                {section.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>
            {/* Not in `nav`: the Playground is a tool page, not a doc. */}
            <Link href="/playground" className="doc-sidebar-extra">
                Playground →
            </Link>
        </nav>
    );
}
