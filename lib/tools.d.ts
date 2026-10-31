import type { Catalog, MetaToolNames } from './catalog.js';
import type { HarnessContext, SkillDefinitionLike, ToolDefinitionLike, ToolExecutionLike, ViewContext } from './types.js';
/** Limits that shape tool results. */
export interface ToolLimits {
    readonly searchLimit: number;
    readonly maxSearchLimit: number;
    /** Schemas up to this many bytes are returned verbatim by describe. */
    readonly schemaInlineMaxBytes: number;
    /** Upper bound for a compact view before depth is reduced. */
    readonly describeMaxChars: number;
    /** Upper bound for rendered call text; longer text is truncated with a notice. */
    readonly callResultMaxChars: number;
}
/** Resolves the viewing context of a tool call. */
export type ViewOf = (exec: ToolExecutionLike) => Promise<ViewContext>;
/** Render an MCP content array as model text. */
export declare function renderMcpContent(content: readonly unknown[], structured: unknown, maxChars: number): string;
/** Render a skill exactly as the Harness `skill` tool does. */
export declare function renderSkillContent(skill: Pick<SkillDefinitionLike, 'name' | 'provider' | 'content' | 'resourceBase'>): string;
/**
 * Build the fixed tool set.
 * @param skills - the Harness skill registry, when composed.
 * @param catalog - the merged catalog.
 * @param names - configured tool names.
 * @param limits - result limits.
 * @param viewOf - viewing-context resolver.
 */
export declare function createTools(skills: HarnessContext['skills'], catalog: Catalog, names: MetaToolNames, limits: ToolLimits, viewOf: ViewOf, host?: HarnessContext): {
    search: ToolDefinitionLike;
    describe: ToolDefinitionLike;
    call: ToolDefinitionLike;
    skill: ToolDefinitionLike;
};
