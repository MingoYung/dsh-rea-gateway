import type { McpServerConfig } from './sources/mcp.js';
export declare const name = "rea-gateway-server";
export declare const inject: string[];
export declare const Config: any;
/**
 * Register the configured server while this row is active.
 * @param rawCtx - row context with the catalog service.
 * @param config - resolved server configuration.
 */
export declare function apply(rawCtx: unknown, config: McpServerConfig): Promise<void>;
