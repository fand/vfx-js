/**
 * Gallery viewer — client-side logic.
 *
 * Reads a JSON manifest injected into the page by the `gallery-index`
 * Vite plugin and renders a filterable grid of cards. Clicking a card
 * opens a modal with the live iframe + any baseline screenshots.
 */

interface Snapshot {
    url: string;
    filename: string;
    project: string | null;
}

interface GalleryPage {
    id: string;
    urlPath: string;
    kind: string;
    title: string;
    hasScenario: boolean;
    snapshots: Snapshot[];
}

interface Manifest {
    generatedAt: string;
    pages: GalleryPage[];
}

type KindFilter = "all" | string;

// --- Bootstrap manifest ----------------------------------------------------

const manifestEl = document.getElementById("manifest-data");
if (!manifestEl) {
    throw new Error("#manifest-data not found");
}
const manifest: Manifest = JSON.parse(manifestEl.textContent ?? "{}");
const pages: GalleryPage[] = manifest.pages ?? [];

// --- DOM refs --------------------------------------------------------------

const grid = requireEl<HTMLElement>("grid");
const searchInput = requireEl<HTMLInputElement>("search");
const kindFilter = requireEl<HTMLElement>("kind-filter");
const countEl = requireEl<HTMLElement>("count");

const modal = requireEl<HTMLElement>("modal");
const modalTitle = requireEl<HTMLElement>("modal-title");
const modalLink = requireEl<HTMLAnchorElement>("modal-link");
const modalClose = requireEl<HTMLElement>("modal-close");
const modalFrame = requireEl<HTMLIFrameElement>("modal-frame");
const modalTabs = requireEl<HTMLElement>("modal-tabs");
const modalPaneLive = requireEl<HTMLElement>("modal-pane-live");
const modalPaneSnaps = requireEl<HTMLElement>("modal-pane-snaps");
const modalSnapCount = requireEl<HTMLElement>("modal-snap-count");

function requireEl<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`#${id} not found`);
    }
    return el as T;
}

// --- State -----------------------------------------------------------------

const state = {
    kind: "all" as KindFilter,
    query: "",
};

// --- Rendering -------------------------------------------------------------

function filteredPages(): GalleryPage[] {
    const q = state.query.trim().toLowerCase();
    return pages.filter((p) => {
        if (state.kind !== "all" && p.kind !== state.kind) return false;
        if (q) {
            const haystack = `${p.title} ${p.id}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    });
}

function renderKindTabs(): void {
    const counts: Record<string, number> = { all: pages.length };
    for (const p of pages) {
        counts[p.kind] = (counts[p.kind] ?? 0) + 1;
    }
    const kinds = ["all", ...Object.keys(counts).filter((k) => k !== "all")];
    kinds.sort((a, b) => kindRank(a) - kindRank(b));

    kindFilter.innerHTML = kinds
        .map((k) => {
            const active = state.kind === k ? " active" : "";
            return `<button class="kind-tab${active}" data-kind="${escapeAttr(k)}">${escapeHtml(k)} <span class="count">${counts[k] ?? 0}</span></button>`;
        })
        .join("");
}

const KIND_ORDER = ["all", "test", "tutorial", "demo"];
function kindRank(kind: string): number {
    const i = KIND_ORDER.indexOf(kind);
    return i === -1 ? KIND_ORDER.length : i;
}

function renderCards(): void {
    const list = filteredPages();
    countEl.textContent = `${list.length} / ${pages.length} pages`;

    if (list.length === 0) {
        grid.innerHTML = `<p class="empty">No pages match.</p>`;
        return;
    }

    grid.innerHTML = list.map(renderCard).join("");
}

function renderCard(p: GalleryPage): string {
    const thumb = p.snapshots[0];
    const thumbHtml = thumb
        ? `<img class="thumb" src="${escapeAttr(thumb.url)}" alt="" loading="lazy">`
        : `<div class="thumb placeholder">no baseline yet</div>`;

    const badges: string[] = [
        `<span class="badge kind-${escapeAttr(p.kind)}">${escapeHtml(p.kind)}</span>`,
    ];
    if (p.hasScenario) {
        badges.push(`<span class="badge">scenario</span>`);
    }
    if (p.snapshots.length > 0) {
        const label =
            p.snapshots.length === 1 ? "1 snap" : `${p.snapshots.length} snaps`;
        badges.push(`<span class="badge">${label}</span>`);
    }

    return `
<article class="card" data-id="${escapeAttr(p.id)}" tabindex="0" role="button" aria-label="${escapeAttr(p.title)}">
    <div class="thumb-wrap">${thumbHtml}</div>
    <div class="card-meta">
        <h3 class="card-title">${escapeHtml(p.title)}</h3>
        <div class="badges">${badges.join("")}</div>
        <code class="card-path">${escapeHtml(p.urlPath)}</code>
    </div>
</article>`.trim();
}

// --- Interactions ----------------------------------------------------------

searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    renderCards();
});

kindFilter.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(
        ".kind-tab",
    ) as HTMLElement | null;
    if (!btn) return;
    const kind = btn.dataset.kind ?? "all";
    state.kind = kind;
    renderKindTabs();
    renderCards();
});

grid.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest(
        ".card",
    ) as HTMLElement | null;
    if (!card) return;
    const id = card.dataset.id;
    const page = pages.find((p) => p.id === id);
    if (page) openModal(page);
});

grid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = (e.target as HTMLElement).closest(
        ".card",
    ) as HTMLElement | null;
    if (!card) return;
    e.preventDefault();
    const page = pages.find((p) => p.id === card.dataset.id);
    if (page) openModal(page);
});

modalTabs.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(
        ".modal-tab",
    ) as HTMLElement | null;
    if (!btn) return;
    const pane = btn.dataset.pane;
    if (!pane) return;
    for (const t of modalTabs.querySelectorAll<HTMLElement>(".modal-tab")) {
        t.classList.toggle("active", t === btn);
    }
    modalPaneLive.hidden = pane !== "live";
    modalPaneSnaps.hidden = pane !== "snaps";
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
});

function openModal(page: GalleryPage): void {
    modalTitle.textContent = page.title;
    modalLink.href = `/${page.urlPath}`;
    modalFrame.src = `/${page.urlPath}`;
    modalSnapCount.textContent = page.snapshots.length
        ? `(${page.snapshots.length})`
        : "";

    if (page.snapshots.length > 0) {
        modalPaneSnaps.innerHTML = `<div class="snap-strip">${page.snapshots
            .map(
                (s) => `
<figure>
    <img src="${escapeAttr(s.url)}" alt="${escapeAttr(s.filename)}" loading="lazy">
    <figcaption>${escapeHtml(s.filename)}${s.project ? ` · ${escapeHtml(s.project)}` : ""}</figcaption>
</figure>`,
            )
            .join("")}</div>`;
    } else {
        modalPaneSnaps.innerHTML = `<p class="no-snap">No baseline screenshots yet. Run <code>npm --workspace=@vfx-js/gallery run test:visual:update</code>.</p>`;
    }

    // Reset to the live tab on each open.
    for (const t of modalTabs.querySelectorAll<HTMLElement>(".modal-tab")) {
        t.classList.toggle("active", t.dataset.pane === "live");
    }
    modalPaneLive.hidden = false;
    modalPaneSnaps.hidden = true;

    modal.hidden = false;
    modalClose.focus();
}

function closeModal(): void {
    modal.hidden = true;
    // Tear down the iframe so the page's WebGL context is released.
    modalFrame.src = "about:blank";
}

// --- Helpers ---------------------------------------------------------------

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => {
        switch (c) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            default:
                return "&#39;";
        }
    });
}

function escapeAttr(s: string): string {
    return escapeHtml(s);
}

// --- Go --------------------------------------------------------------------

renderKindTabs();
renderCards();
