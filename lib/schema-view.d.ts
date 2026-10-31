/**
 * Model-facing views of large JSON Schemas.
 *
 * A selected tool can still carry a 100 KB+ input schema. The raw schema stays the only
 * validation authority; this module derives a compact signature that keeps names, types,
 * required markers, enums, defaults and short descriptions, collapses deep subtrees behind
 * JSON Pointers, and resolves a pointer back to a subtree on request.
 * @module
 */
import type { JsonSchema } from './types.js';
/** Options for {@link compactSignature}. */
export interface CompactOptions {
    /** Object nesting rendered inline before collapsing. */
    readonly maxDepth: number;
    /** Description characters kept per field. */
    readonly maxDescription: number;
    /** Enum values listed before eliding. */
    readonly maxEnum: number;
}
/**
 * Resolve an RFC 6901 JSON Pointer inside a schema.
 * @param schema - root schema.
 * @param pointer - pointer such as `/properties/filters`; empty means the root.
 * @returns the subtree, or undefined when the pointer does not resolve.
 */
export declare function resolvePointer(schema: unknown, rawPointer: string): unknown;
/**
 * Derive a compact, TypeScript-like signature from an object schema.
 * @param name - tool name used as the signature head.
 * @param schema - input schema or a subtree.
 * @param pointer - pointer of `schema` inside the full input schema.
 * @param options - rendering limits.
 * @returns signature text; collapsed subtrees name the pointer that expands them.
 */
export declare function compactSignature(name: string, schema: JsonSchema, pointer?: string, options?: Partial<CompactOptions>): string;
/** Drop annotation-only keywords that do not change validation. */
export declare function stripAnnotations(schema: unknown): unknown;
