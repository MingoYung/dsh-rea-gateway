import { type FamilyRule } from '../families.js';
import type { CallOutcome, CapabilityEntry, CapabilitySource, SourceIndex, ViewContext } from '../types.js';
/** Resolved configuration of one MCP server. */
export interface McpServerConfig {
    readonly name: string;
    readonly enabled: boolean;
    readonly title?: string;
    readonly description?: string;
    readonly transport: 'stdio' | 'streamable-http';
    readonly command?: string;
    readonly args: readonly string[];
    readonly env: Readonly<Record<string, string>>;
    readonly cwd?: string;
    readonly url?: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly allowTools: readonly string[];
    readonly denyTools: readonly string[];
    readonly families: readonly FamilyRule[];
    readonly idleDisconnectMs: number;
    readonly callTimeoutMs: number;
    readonly discoveryTimeoutMs: number;
    readonly catalogTtlMs: number;
}
/** Read a server-declared family from MCP `_meta`, under any vendor namespace. */
export declare function declaredFamily(meta: unknown): string | undefined;
type Logger = {
    info(...a: unknown[]): void;
    warn(...a: unknown[]): void;
    debug(...a: unknown[]): void;
};
/** Hash of the launch-defining fields; a change invalidates the cache. */
export declare function cacheKey(config: McpServerConfig): string;
/** One MCP server exposed as a capability source. */
export declare class McpSource implements CapabilitySource {
    private readonly config;
    private readonly cacheDir;
    private readonly logger;
    readonly key: string;
    private catalog;
    private entryList;
    private descriptions;
    private failure;
    private client;
    private connecting;
    private idleTimer;
    private inFlight;
    private disposed;
    private refreshing;
    private started;
    /** Whether discovery has been allowed to run (the server is not switched off). */
    get discovered(): boolean;
    /** Decides whether a viewer wants this server; set by the plugin from the switches. */
    isWanted: (view: ViewContext) => boolean;
    /** Discover lazily for a viewer that switched on a server that did not start globally. */
    refresh(view: ViewContext): Promise<void>;
    constructor(config: McpServerConfig, cacheDir: string, logger: Logger);
    private get cachePath();
    /**
     * Load the cached catalog and discover when it is missing or belongs to another launch identity.
     * A stale but matching cache is used immediately and refreshed in the background.
     */
    start(options?: {
        discover?: boolean;
    }): Promise<void>;
    /**
     * Connect, list every tool page and cache the result.
     * @param keepAlive - keep the connection for its idle period; startup discovery closes it at once.
     */
    discover(keepAlive?: boolean): Promise<void>;
    private adopt;
    entries(): readonly CapabilityEntry[];
    /** Server name as configured. */
    get name(): string;
    /** Display title for settings views. */
    get title(): string;
    /** Configured default enablement. */
    get configuredEnabled(): boolean;
    /** Number of tools after allow/deny filtering. */
    get toolCount(): number;
    /** Discovery failure, if the server has no usable catalog. */
    get problem(): string | undefined;
    index(_view: unknown, entries: readonly CapabilityEntry[]): SourceIndex | undefined;
    private ensureClient;
    private connect;
    private clearIdle;
    private release;
    /** Close the live connection, if any. */
    disconnect(reason: string): Promise<void>;
    /** Whether a server process or connection is currently live. */
    get connected(): boolean;
    call(entry: CapabilityEntry, args: Record<string, unknown>, signal: AbortSignal): Promise<CallOutcome>;
    dispose(): Promise<void>;
}
export {};
