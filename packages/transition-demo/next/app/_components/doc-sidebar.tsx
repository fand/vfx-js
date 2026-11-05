"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "../_lib/site";

export function DocSidebar() {
    const pathname = usePathname();
    if (pathname === "/") {
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
        </nav>
    );
}
