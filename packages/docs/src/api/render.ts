// Renders TypeDoc types and comments to HTML strings.
import MarkdownIt from "markdown-it";
import { createHighlighter } from "shiki";
import { type Api, hrefOf } from "./model";
import {
    type Comment,
    type CommentPart,
    Kind,
    type Reflection,
    type Type,
} from "./types";

const theme = "github-dark";
const langs = ["ts", "tsx", "js", "jsx", "html", "css", "glsl", "json", "bash"];

const highlighter = await createHighlighter({ themes: [theme], langs });

const md = new MarkdownIt({
    html: false,
    linkify: true,
    highlight: (code, lang) => highlight(code.replace(/\n$/, ""), lang),
});

/** Highlighted <pre> for a code sample. */
export function highlight(code: string, lang = "ts"): string {
    const l = langs.includes(lang) ? lang : "text";
    // The page styles the box. Drop shiki's inline background.
    return highlighter
        .codeToHtml(code, { lang: l, theme })
        .replace(/^<pre([^>]*) style="[^"]*"/, "<pre$1");
}

export function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

//================ Comments ================//

function partsToMarkdown(api: Api, parts: CommentPart[]): string {
    return parts
        .map((p) => {
            if (p.kind === "inline-tag") {
                const text = p.text.trim();
                const href =
                    typeof p.target === "number"
                        ? hrefOf(api, p.target)
                        : undefined;
                if (/^https?:/.test(text)) {
                    return `<${text}>`;
                }
                return href ? `[\`${text}\`](${href})` : `\`${text}\``;
            }
            return p.text;
        })
        .join("");
}

export function markdownHtml(
    api: Api,
    parts: CommentPart[] | undefined,
): string {
    if (!parts || parts.length === 0) {
        return "";
    }
    return md.render(partsToMarkdown(api, parts));
}

/** Markdown on one line, without the wrapping <p>. */
export function inlineMarkdownHtml(
    api: Api,
    parts: CommentPart[] | undefined,
): string {
    if (!parts || parts.length === 0) {
        return "";
    }
    return md.renderInline(
        partsToMarkdown(api, parts).replace(/\s*\n\s*/g, " "),
    );
}

const blockTagTitles: Record<string, string> = {
    "@example": "Example",
    "@throws": "Throws",
    "@see": "See also",
    "@remarks": "Remarks",
    "@deprecated": "Deprecated",
    "@defaultValue": "Default",
    "@default": "Default",
};

/** Tags shown elsewhere or not at all. */
const hiddenBlockTags = new Set([
    "@returns",
    "@notExported",
    "@param",
    "@typeParam",
]);

export type BlockTag = { title: string; html: string };

export function blockTags(api: Api, comment: Comment | undefined): BlockTag[] {
    return (comment?.blockTags ?? [])
        .filter((t) => !hiddenBlockTags.has(t.tag))
        .map((t) => ({
            title:
                blockTagTitles[t.tag] ??
                t.tag.replace(/^@/, "").replace(/^./, (c) => c.toUpperCase()),
            html: markdownHtml(api, t.content),
        }));
}

export function returnsHtml(api: Api, comment: Comment | undefined): string {
    const tag = comment?.blockTags?.find((t) => t.tag === "@returns");
    return tag ? markdownHtml(api, tag.content) : "";
}

//================ Types ================//

const span = (cls: string, text: string) =>
    `<span class="${cls}">${escapeHtml(text)}</span>`;
const punct = (text: string) => span("tp", text);

/** Signatures longer than this put each parameter on its own line. */
const maxLineLength = 80;

/** Visible characters on the first line of our own type HTML. */
function textLength(html: string): number {
    let length = 0;
    let inTag = false;
    let inEntity = false;
    for (const c of html) {
        if (c === "\n") {
            break;
        }
        if (inTag) {
            inTag = c !== ">";
        } else if (c === "<") {
            inTag = true;
        } else if (inEntity) {
            inEntity = c !== ";";
        } else {
            // An entity like &lt; is one character.
            inEntity = c === "&";
            length++;
        }
    }
    return length;
}

/** Object types with more members than this go on several lines. */
const inlineMemberLimit = 2;

type Ctx = { api: Api; indent: number };

function pad(n: number): string {
    return "    ".repeat(n);
}

/** HTML for a type, with links to the API pages. */
export function typeHtml(api: Api, type: Type | undefined, indent = 0): string {
    if (!type) {
        return span("tk", "any");
    }
    return renderType({ api, indent }, type);
}

/** Whether a type needs parentheses inside an array or union. */
function needsParens(t: Type, inUnion: boolean): boolean {
    switch (t.type) {
        case "union":
        case "conditional":
            return true;
        case "intersection":
            return !inUnion;
        case "typeOperator":
            return !inUnion;
        case "reflection":
            return Boolean(t.declaration.signatures?.length);
        default:
            return false;
    }
}

function wrap(ctx: Ctx, t: Type, inUnion: boolean): string {
    const html = renderType(ctx, t);
    return needsParens(t, inUnion) ? `${punct("(")}${html}${punct(")")}` : html;
}

function renderType(ctx: Ctx, t: Type): string {
    switch (t.type) {
        case "intrinsic":
            return span("tk", t.name);
        case "literal": {
            const v = t.value;
            if (v === null) {
                return span("tk", "null");
            }
            if (typeof v === "string") {
                return span("ts", JSON.stringify(v));
            }
            if (typeof v === "object") {
                return span("tn", `${v.negative ? "-" : ""}${v.value}n`);
            }
            return span(typeof v === "number" ? "tn" : "tk", String(v));
        }
        case "reference": {
            let name: string;
            const href =
                typeof t.target === "number" && !t.refersToTypeParameter
                    ? hrefOf(ctx.api, t.target)
                    : t.externalUrl;
            if (href) {
                name = `<a class="tr" href="${escapeHtml(href)}">${escapeHtml(t.name)}</a>`;
            } else {
                name = span(t.refersToTypeParameter ? "tt" : "tr", t.name);
            }
            if (!t.typeArguments?.length) {
                return name;
            }
            const args = t.typeArguments
                .map((a) => renderType(ctx, a))
                .join(punct(", "));
            return `${name}${punct("<")}${args}${punct(">")}`;
        }
        case "union":
            return t.types.map((u) => wrap(ctx, u, true)).join(punct(" | "));
        case "intersection":
            return t.types.map((u) => wrap(ctx, u, true)).join(punct(" & "));
        case "array":
            return `${wrap(ctx, t.elementType, false)}${punct("[]")}`;
        case "tuple":
            return `${punct("[")}${(t.elements ?? [])
                .map((e) => renderType(ctx, e))
                .join(punct(", "))}${punct("]")}`;
        case "namedTupleMember":
            return `${span("tm", t.name)}${punct(t.isOptional ? "?: " : ": ")}${renderType(ctx, t.element)}`;
        case "optional":
            return `${wrap(ctx, t.elementType, false)}${punct("?")}`;
        case "rest":
            return `${punct("...")}${wrap(ctx, t.elementType, false)}`;
        case "typeOperator":
            return `${span("tk", t.operator)} ${wrap(ctx, t.target, false)}`;
        case "reflection":
            return reflectionType(ctx, t.declaration);
        case "conditional":
            return [
                wrap(ctx, t.checkType, false),
                span("tk", " extends "),
                renderType(ctx, t.extendsType),
                punct(" ? "),
                renderType(ctx, t.trueType),
                punct(" : "),
                renderType(ctx, t.falseType),
            ].join("");
        case "indexedAccess":
            return `${renderType(ctx, t.objectType)}${punct("[")}${renderType(ctx, t.indexType)}${punct("]")}`;
        case "inferred":
            return `${span("tk", "infer ")}${span("tt", t.name)}`;
        case "predicate":
            return [
                t.asserts ? span("tk", "asserts ") : "",
                span("tm", t.name),
                t.targetType
                    ? `${span("tk", " is ")}${renderType(ctx, t.targetType)}`
                    : "",
            ].join("");
        case "query":
            return `${span("tk", "typeof ")}${renderType(ctx, t.queryType)}`;
        case "mapped": {
            const ro =
                t.readonlyModifier === "+"
                    ? "readonly "
                    : t.readonlyModifier === "-"
                      ? "-readonly "
                      : "";
            const opt =
                t.optionalModifier === "+"
                    ? "?"
                    : t.optionalModifier === "-"
                      ? "-?"
                      : "";
            return [
                punct("{ "),
                ro ? span("tk", ro) : "",
                punct("["),
                span("tt", t.parameter),
                span("tk", " in "),
                renderType(ctx, t.parameterType),
                t.nameType
                    ? `${span("tk", " as ")}${renderType(ctx, t.nameType)}`
                    : "",
                punct(`]${opt}: `),
                renderType(ctx, t.templateType),
                punct(" }"),
            ].join("");
        }
        case "templateLiteral":
            return [
                span("ts", `\`${t.head}`),
                ...t.tail.map(
                    ([inner, text]) =>
                        `${span("ts", "${")}${renderType(ctx, inner)}${span("ts", `}${text}`)}`,
                ),
                span("ts", "`"),
            ].join("");
        case "unknown":
            return escapeHtml(t.name);
        default:
            return escapeHtml((t as { type: string }).type);
    }
}

/** An inline object or function type. */
function reflectionType(ctx: Ctx, decl: Reflection): string {
    const sigs = decl.signatures ?? [];
    if (sigs.length === 1 && !decl.children?.length) {
        return signatureHtml(ctx.api, sigs[0], {
            arrow: true,
            indent: ctx.indent,
        });
    }

    const lines: string[] = [];
    for (const s of decl.indexSignatures ?? []) {
        lines.push(indexSignatureHtml(ctx.api, s, ctx.indent + 1));
    }
    for (const s of sigs) {
        lines.push(signatureHtml(ctx.api, s, { indent: ctx.indent + 1 }));
    }
    for (const c of decl.children ?? []) {
        lines.push(memberLineHtml(ctx.api, c, ctx.indent + 1));
    }
    if (lines.length === 0) {
        return punct("{}");
    }
    const multiline =
        lines.length > inlineMemberLimit || lines.some((l) => l.includes("\n"));
    if (!multiline) {
        return `${punct("{ ")}${lines.join(punct("; "))}${punct(" }")}`;
    }
    const inner = lines.map((l) => `${pad(ctx.indent + 1)}${l}${punct(";")}`);
    return `${punct("{")}\n${inner.join("\n")}\n${pad(ctx.indent)}${punct("}")}`;
}

/** `name?: Type` for a property, or a method signature. */
function memberLineHtml(api: Api, r: Reflection, indent: number): string {
    if (r.signatures?.length) {
        return r.signatures
            .map((s) => signatureHtml(api, s, { indent, name: r.name }))
            .join(`${punct(";")}\n${pad(indent)}`);
    }
    if (r.getSignature || r.setSignature) {
        const t = r.getSignature?.type ?? r.setSignature?.parameters?.[0]?.type;
        return `${r.setSignature ? "" : span("tk", "readonly ")}${span("tm", r.name)}${punct(": ")}${typeHtml(api, t, indent)}`;
    }
    return propertyHtml(api, r, indent);
}

/** `type Name<T> = ...`. Long unions put each member on its own line. */
export function typeAliasHtml(api: Api, decl: Reflection): string {
    const head = `${span("tk", "type ")}${span("tr", decl.name)}${typeParamsHtml(api, decl.typeParameters)}${punct(" =")}`;
    const t = decl.type;
    const oneLine = `${head} ${typeHtml(api, t)}`;
    if (t?.type !== "union" || textLength(oneLine) <= maxLineLength) {
        return oneLine;
    }
    const lines = t.types.map(
        (u) => `${pad(1)}${punct("| ")}${wrap({ api, indent: 1 }, u, true)}`,
    );
    return `${head}\n${lines.join("\n")}`;
}

export function propertyHtml(api: Api, r: Reflection, indent = 0): string {
    return [
        r.flags.isReadonly ? span("tk", "readonly ") : "",
        span("tm", propertyName(r.name)),
        punct(r.flags.isOptional ? "?: " : ": "),
        typeHtml(api, r.type, indent),
    ].join("");
}

function propertyName(name: string): string {
    return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

export function indexSignatureHtml(
    api: Api,
    s: Reflection,
    indent = 0,
): string {
    const p = s.parameters?.[0];
    return [
        punct("["),
        span("tm", p?.name ?? "key"),
        punct(": "),
        typeHtml(api, p?.type, indent),
        punct("]: "),
        typeHtml(api, s.type, indent),
    ].join("");
}

export function typeParamsHtml(
    api: Api,
    params: Reflection[] | undefined,
): string {
    if (!params?.length) {
        return "";
    }
    const items = params.map((p) =>
        [
            span("tt", p.name),
            p.type ? `${span("tk", " extends ")}${typeHtml(api, p.type)}` : "",
            p.default ? `${punct(" = ")}${typeHtml(api, p.default)}` : "",
        ].join(""),
    );
    return `${punct("<")}${items.join(punct(", "))}${punct(">")}`;
}

type SignatureOpts = {
    /** `(a) => R` instead of `name(a): R`. */
    arrow?: boolean;
    /** Name to show. Defaults to the signature's name. */
    name?: string;
    indent?: number;
};

/** `name<T>(a: A, b?: B): R` */
export function signatureHtml(
    api: Api,
    s: Reflection,
    opts: SignatureOpts = {},
): string {
    const indent = opts.indent ?? 0;
    const isCtor = s.kind === Kind.ConstructorSignature;
    const params = (s.parameters ?? []).map((p) =>
        [
            p.flags.isRest ? punct("...") : "",
            span("tm", p.name),
            punct(
                p.flags.isOptional || p.defaultValue !== undefined
                    ? "?: "
                    : ": ",
            ),
            typeHtml(api, p.type, indent),
            // Defaults show in the page's signatures, not in inline types.
            p.defaultValue !== undefined && !opts.arrow
                ? punct(` = ${p.defaultValue}`)
                : "",
        ].join(""),
    );
    const head = opts.arrow
        ? ""
        : isCtor
          ? `${span("tk", "new ")}${span("tf", opts.name ?? s.name)}`
          : span("tf", opts.name ?? s.name);
    const ret = typeHtml(api, s.type, indent);
    const oneLine = [
        head,
        typeParamsHtml(api, s.typeParameters),
        punct("("),
        params.join(punct(", ")),
        punct(")"),
        opts.arrow ? punct(" => ") : punct(": "),
        ret,
    ].join("");
    if (params.length < 2 || textLength(oneLine) <= maxLineLength) {
        return oneLine;
    }
    // Long signatures: one parameter per line.
    const inner = params.map((p) => `${pad(indent + 1)}${p}${punct(",")}`);
    return [
        head,
        typeParamsHtml(api, s.typeParameters),
        punct("("),
        `\n${inner.join("\n")}\n${pad(indent)}`,
        punct(")"),
        opts.arrow ? punct(" => ") : punct(": "),
        ret,
    ].join("");
}
