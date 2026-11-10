// The parts of TypeDoc's JSON output that the API pages use.
// See https://typedoc.org/api/modules/JSONOutput.html

export type CommentPart =
    | { kind: "text"; text: string }
    | { kind: "code"; text: string }
    | {
          kind: "inline-tag";
          tag: string;
          text: string;
          target?: number | { qualifiedName: string };
      }
    | { kind: "relative-link"; text: string };

export type Comment = {
    summary: CommentPart[];
    blockTags?: { tag: string; content: CommentPart[] }[];
    modifierTags?: string[];
};

export type Source = { fileName: string; line: number; url?: string };

export type ExternalTarget = {
    packageName: string;
    packagePath: string;
    qualifiedName: string;
};

export type Type =
    | { type: "intrinsic"; name: string }
    | {
          type: "literal";
          value:
              | string
              | number
              | boolean
              | null
              | { negative: boolean; value: string };
      }
    | {
          type: "reference";
          name: string;
          target: number | ExternalTarget;
          typeArguments?: Type[];
          package?: string;
          refersToTypeParameter?: boolean;
          externalUrl?: string;
      }
    | { type: "union"; types: Type[] }
    | { type: "intersection"; types: Type[] }
    | { type: "array"; elementType: Type }
    | { type: "tuple"; elements?: Type[] }
    | {
          type: "namedTupleMember";
          name: string;
          isOptional: boolean;
          element: Type;
      }
    | { type: "optional"; elementType: Type }
    | { type: "rest"; elementType: Type }
    | { type: "typeOperator"; operator: string; target: Type }
    | { type: "reflection"; declaration: Reflection }
    | {
          type: "conditional";
          checkType: Type;
          extendsType: Type;
          trueType: Type;
          falseType: Type;
      }
    | { type: "indexedAccess"; objectType: Type; indexType: Type }
    | { type: "inferred"; name: string; constraint?: Type }
    | { type: "predicate"; name: string; asserts: boolean; targetType?: Type }
    | { type: "query"; queryType: Type }
    | {
          type: "mapped";
          parameter: string;
          parameterType: Type;
          templateType: Type;
          readonlyModifier?: "+" | "-";
          optionalModifier?: "+" | "-";
          nameType?: Type;
      }
    | { type: "templateLiteral"; head: string; tail: [Type, string][] }
    | { type: "unknown"; name: string };

export type Flags = {
    isOptional?: boolean;
    isReadonly?: boolean;
    isStatic?: boolean;
    isAbstract?: boolean;
    isInherited?: boolean;
    isConst?: boolean;
    isRest?: boolean;
    isProtected?: boolean;
    isPrivate?: boolean;
};

export type Reflection = {
    id: number;
    name: string;
    variant: "project" | "declaration" | "signature" | "param" | "typeParam";
    kind: number;
    flags: Flags;
    comment?: Comment;
    children?: Reflection[];
    groups?: { title: string; children: number[] }[];
    signatures?: Reflection[];
    indexSignatures?: Reflection[];
    getSignature?: Reflection;
    setSignature?: Reflection;
    parameters?: Reflection[];
    typeParameters?: Reflection[];
    type?: Type;
    /** Type parameters: the constraint is in `type`. */
    default?: Type;
    defaultValue?: string;
    extendedTypes?: Type[];
    implementedTypes?: Type[];
    extendedBy?: Type[];
    implementedBy?: Type[];
    inheritedFrom?: Type;
    sources?: Source[];
};

export type Project = Reflection & { children: Reflection[] };

/** TypeDoc's ReflectionKind values. */
export const Kind = {
    Module: 2,
    Namespace: 4,
    Variable: 32,
    Function: 64,
    Class: 128,
    Interface: 256,
    Constructor: 512,
    Property: 1024,
    Method: 2048,
    CallSignature: 4096,
    IndexSignature: 8192,
    ConstructorSignature: 16384,
    Parameter: 32768,
    TypeLiteral: 65536,
    TypeParameter: 131072,
    Accessor: 262144,
    GetSignature: 524288,
    SetSignature: 1048576,
    TypeAlias: 2097152,
} as const;
