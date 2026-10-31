/**
 * MCP source: discovers a server's tools, caches the catalog on disk, connects on demand,
 * and disconnects after an idle period.
 *
 * The cached catalog lets the standing index appear without starting the server at every
 * Harness launch; the server process runs only while the model is actually using it.
 * @module
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { scrubbedParentEnv } from '@deepseek-ai/dsh-subprocess';
import { summarize, summarizeFamilies } from '../catalog.js';
import { assignFamilies, globToRegExp, passesFilter } from '../families.js';
/** Read a server-declared family from MCP `_meta`, under any vendor namespace. */
export function declaredFamily(meta) {
    if (meta === null || typeof meta !== 'object')
        return undefined;
    const direct = meta.family;
    if (typeof direct === 'string' && direct !== '')
        return direct;
    for (const value of Object.values(meta)) {
        if (value !== null && typeof value === 'object' && typeof value.family === 'string') {
            const family = value.family;
            if (family !== '')
                return family;
        }
    }
    return undefined;
}
/** Hash of the launch-defining fields; a change invalidates the cache. */
export function cacheKey(config) {
    const identity = {
        transport: config.transport,
        command: config.command,
        args: config.args,
        env: Object.entries(config.env).sort(),
        cwd: config.cwd,
        url: config.url,
        headers: Object.keys(config.headers).sort(),
    };
    return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}
/** Reject a pending promise after a deadline. */
function withTimeout(promise, ms, what) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
        }),
    ]).finally(() => clearTimeout(timer));
}
/** One MCP server exposed as a capability source. */
export class McpSource {
    config;
    cacheDir;
    logger;
    key;
    catalog;
    entryList = [];
    descriptions = new Map();
    failure;
    client;
    connecting;
    idleTimer;
    inFlight = 0;
    disposed = false;
    refreshing;
    started = false;
    /** Whether discovery has been allowed to run (the server is not switched off). */
    get discovered() {
        return this.started;
    }
    /** Decides whether a viewer wants this server; set by the plugin from the switches. */
    isWanted = () => true;
    /** Discover lazily for a viewer that switched on a server that did not start globally. */
    async refresh(view) {
        if (!this.started && !this.disposed && this.isWanted(view))
            await this.start();
    }
    constructor(config, cacheDir, logger) {
        this.config = config;
        this.cacheDir = cacheDir;
        this.logger = logger;
        this.key = `mcp:${config.name}`;
    }
    get cachePath() {
        return join(this.cacheDir, `mcp-${this.config.name}.json`);
    }
    /**
     * Load the cached catalog and discover when it is missing or belongs to another launch identity.
     * A stale but matching cache is used immediately and refreshed in the background.
     */
    async start(options = {}) {
        const allowDiscovery = options.discover ?? true;
        const key = cacheKey(this.config);
        try {
            const cached = JSON.parse(await readFile(this.cachePath, 'utf8'));
            if (cached.version === 1 && cached.key === key && Array.isArray(cached.tools))
                this.adopt(cached);
        }
        catch {
            // Missing or unreadable cache: discover below.
        }
        if (!allowDiscovery)
            return;
        this.started = true;
        if (this.catalog === undefined) {
            await this.discover(false).catch((error) => {
                this.failure = `discovery failed: ${error instanceof Error ? error.message : String(error)}`;
                this.logger.warn(`rea-gateway: ${this.key} ${this.failure}`);
            });
        }
        else if (Date.now() - this.catalog.fetchedAt > this.config.catalogTtlMs) {
            this.refreshing ??= this.discover(false)
                .catch((error) => this.logger.warn(`rea-gateway: ${this.key} background refresh failed`, error))
                .finally(() => { this.refreshing = undefined; });
        }
    }
    /**
     * Connect, list every tool page and cache the result.
     * @param keepAlive - keep the connection for its idle period; startup discovery closes it at once.
     */
    async discover(keepAlive = true) {
        const hadClient = this.client !== undefined;
        const client = await this.ensureClient();
        this.inFlight++;
        try {
            const tools = [];
            let cursor;
            do {
                const page = await withTimeout(client.listTools(cursor === undefined ? {} : { cursor }), this.config.discoveryTimeoutMs, `${this.key} tools/list`);
                for (const tool of page.tools) {
                    const family = declaredFamily(tool._meta);
                    tools.push({
                        ...family ? { family } : {},
                        name: tool.name,
                        description: tool.description ?? '',
                        inputSchema: (tool.inputSchema ?? { type: 'object' }),
                        ...tool.annotations?.readOnlyHint === true ? { readOnly: true } : {},
                    });
                }
                cursor = page.nextCursor;
            } while (cursor !== undefined);
            const version = client.getServerVersion();
            const instructions = client.getInstructions();
            const cache = {
                version: 1,
                key: cacheKey(this.config),
                fetchedAt: Date.now(),
                ...version ? { server: { name: version.name, version: version.version } } : {},
                ...instructions ? { instructions } : {},
                tools,
            };
            this.adopt(cache);
            this.failure = undefined;
            await mkdir(dirname(this.cachePath), { recursive: true });
            const temp = `${this.cachePath}.${process.pid}.tmp`;
            await writeFile(temp, JSON.stringify(cache), { mode: 0o600 });
            await rename(temp, this.cachePath);
        }
        finally {
            this.release();
            if (!keepAlive && !hadClient && this.inFlight === 0) {
                this.clearIdle();
                await this.disconnect('discovery finished');
            }
        }
    }
    adopt(cache) {
        this.catalog = cache;
        const visible = cache.tools.filter((tool) => passesFilter(tool.name, this.config.allowTools, this.config.denyTools));
        // Curated rules win; then families the server declares; then the name heuristic.
        const curatedNames = new Set(visible.filter((tool) => this.config.families.some((rule) => rule.match.some((pattern) => globToRegExp(pattern).test(tool.name)))).map((tool) => tool.name));
        const undeclared = visible.filter((tool) => curatedNames.has(tool.name) || tool.family === undefined).map((tool) => tool.name);
        const { family, descriptions } = assignFamilies(undeclared, this.config.families);
        for (const tool of visible)
            if (!curatedNames.has(tool.name) && tool.family !== undefined)
                family.set(tool.name, tool.family);
        this.descriptions = descriptions;
        this.entryList = visible.map((tool) => {
            const schemaBytes = Buffer.byteLength(JSON.stringify(tool.inputSchema));
            return {
                id: `${this.key}/${tool.name}`,
                kind: 'tool',
                source: this.key,
                name: tool.name,
                family: family.get(tool.name) ?? 'misc',
                summary: summarize(tool.description),
                description: tool.description,
                inputSchema: tool.inputSchema,
                schemaBytes,
                ...tool.readOnly ? { readOnly: true } : {},
            };
        });
    }
    entries() {
        return this.entryList;
    }
    /** Server name as configured. */
    get name() {
        return this.config.name;
    }
    /** Display title for settings views. */
    get title() {
        return this.config.title ?? this.config.name;
    }
    /** Configured default enablement. */
    get configuredEnabled() {
        return this.config.enabled;
    }
    /** Number of tools after allow/deny filtering. */
    get toolCount() {
        return this.entryList.length;
    }
    /** Discovery failure, if the server has no usable catalog. */
    get problem() {
        return this.failure;
    }
    index(_view, entries) {
        if (entries.length === 0 && !this.failure)
            return undefined;
        const title = this.config.title ?? `MCP server "${this.config.name}"`;
        const description = this.config.description ?? (this.catalog?.instructions ? summarize(this.catalog.instructions, 240) : undefined);
        return {
            source: this.key,
            title: `${this.key} — ${title}`,
            ...description ? { description } : {},
            total: entries.length,
            families: summarizeFamilies(entries, this.descriptions),
            ...this.failure && this.entryList.length === 0 ? { note: `${this.failure}; tools are unavailable until the next successful discovery` } : {},
        };
    }
    async ensureClient() {
        if (this.disposed)
            throw new Error(`${this.key} is disabled or unloaded`);
        this.clearIdle();
        if (this.client)
            return this.client;
        this.connecting ??= this.connect().finally(() => { this.connecting = undefined; });
        return this.connecting;
    }
    async connect() {
        const config = this.config;
        let transport;
        if (config.transport === 'stdio') {
            if (!config.command)
                throw new Error(`${this.key}: stdio transport requires "command"`);
            transport = new StdioClientTransport({
                command: config.command,
                args: [...config.args],
                env: { ...scrubbedParentEnv(), ...config.env },
                ...config.cwd ? { cwd: config.cwd } : {},
                stderr: 'ignore',
            });
        }
        else {
            if (!config.url)
                throw new Error(`${this.key}: streamable-http transport requires "url"`);
            transport = new StreamableHTTPClientTransport(new URL(config.url), { requestInit: { headers: { ...config.headers } } });
        }
        const client = new Client({ name: 'dsh-rea-gateway', version: '0.1.1' });
        client.onclose = () => {
            if (this.client === client)
                this.client = undefined;
        };
        try {
            await withTimeout(client.connect(transport), this.config.discoveryTimeoutMs, `${this.key} connect`);
        }
        catch (error) {
            // A timed-out or failed handshake must not leave the child process behind.
            await client.close().catch(() => undefined);
            await transport.close().catch(() => undefined);
            throw error;
        }
        if (this.disposed) {
            await client.close().catch(() => undefined);
            throw new Error(`${this.key} was unloaded while connecting`);
        }
        this.client = client;
        this.logger.info(`rea-gateway: connected ${this.key}`);
        return client;
    }
    clearIdle() {
        if (this.idleTimer)
            clearTimeout(this.idleTimer);
        this.idleTimer = undefined;
    }
    release() {
        this.inFlight = Math.max(0, this.inFlight - 1);
        if (this.inFlight > 0 || this.disposed)
            return;
        this.clearIdle();
        this.idleTimer = setTimeout(() => {
            this.idleTimer = undefined;
            if (this.inFlight === 0)
                void this.disconnect('idle');
        }, this.config.idleDisconnectMs);
        this.idleTimer.unref?.();
    }
    /** Close the live connection, if any. */
    async disconnect(reason) {
        const client = this.client;
        this.client = undefined;
        if (client) {
            this.logger.info(`rea-gateway: disconnecting ${this.key} (${reason})`);
            await client.close().catch((error) => this.logger.warn(`rea-gateway: closing ${this.key} failed`, error));
        }
    }
    /** Whether a server process or connection is currently live. */
    get connected() {
        return this.client !== undefined;
    }
    async call(entry, args, signal) {
        const client = await this.ensureClient();
        this.inFlight++;
        try {
            const result = await client.callTool({ name: entry.name, arguments: args }, { signal, timeout: this.config.callTimeoutMs });
            const content = Array.isArray(result.content) ? result.content : [];
            return {
                content,
                ...result.structuredContent !== undefined ? { structuredContent: result.structuredContent } : {},
                ...result.isError === true ? { isError: true } : {},
            };
        }
        finally {
            this.release();
        }
    }
    async dispose() {
        this.disposed = true;
        this.clearIdle();
        const pending = this.connecting;
        await this.disconnect('unload');
        if (pending)
            await pending.then((client) => client.close()).catch(() => undefined);
        await this.refreshing;
    }
}
