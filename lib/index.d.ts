import z from '@deepseek-ai/schemastery';
import { type McpServerConfig } from './sources/mcp.js';
import { type ToolLimits } from './tools.js';
import type { FamilyRule } from './families.js';
export { Catalog } from './catalog.js';
export { compactSignature, resolvePointer } from './schema-view.js';
export { SearchIndex, tokenize } from './search.js';
export type * from './types.js';
export declare const name = "rea-gateway";
/** Service through which other rows contribute MCP servers to the catalog. */
export interface ReaGatewayService {
    addMcpServer(server: McpServerConfig): Promise<() => Promise<void>>;
}
export declare const inject: string[];
/** Schema of one MCP server entry, shared with the `/server` row plugin. */
export declare const McpServerSchema: z<any, any>;
/** Plugin configuration schema (`config` of the `rea-gateway` row). */
export declare const Config: z<any, any>;
/** Resolved configuration. */
export interface ResolvedConfig {
    enabled: boolean;
    mcp: Array<McpServerConfig>;
    skills: {
        enabled: boolean;
        takeOverCatalog: boolean;
        indexMode: 'brief' | 'names';
        briefChars: number;
        families: FamilyRule[];
        allow: string[];
        deny: string[];
    };
    toolNames: {
        search: string;
        describe: string;
        call: string;
    };
    limits: ToolLimits;
    cacheDir?: string;
}
/**
 * Activate the catalog.
 * Declared `async` so Cordis treats it as startup work rather than a constructor.
 * @param rawCtx - plugin context.
 * @param config - resolved configuration.
 */
export declare function apply(rawCtx: unknown, config: ResolvedConfig): Promise<void>;
