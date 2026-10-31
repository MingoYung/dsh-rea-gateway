/**
 * Lazy capability catalog for DeepSeek Harness.
 *
 * One compact index in the system prompt tells the model which capability families exist;
 * three fixed tools find, describe and run them. MCP tools and skills share one catalog, so
 * hundreds of capabilities cost a few hundred prompt tokens instead of every schema on every
 * request, and the provider tool array never changes during a session.
 * @module dsh-rea-gateway
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { Catalog } from './catalog.js';
import { McpSource } from './sources/mcp.js';
import { SkillSource } from './sources/skills.js';
import { createTools } from './tools.js';
import { ToggleStore } from './toggles.js';
import { CatalogRemote } from './remote.js';
export { Catalog } from './catalog.js';
export { compactSignature, resolvePointer } from './schema-view.js';
export { SearchIndex, tokenize } from './search.js';
export const name = 'rea-gateway';
export const inject = ['tools', 'systemPrompt'];
/** Position right after the Harness MCP server section. */
const SECTION_ORDER = 3150;
const FamilyRuleSchema = z.object({
    name: z.string().required().description('Family name shown in the index.'),
    description: z.string().description('Short family description shown in the index.'),
    match: z.array(String).default([]).description('Glob patterns over capability names; the first matching family wins.'),
});
const McpServerObject = z.object({
    name: z.string().required().pattern(/^[A-Za-z0-9_-]{1,32}$/u).description('Server key; entries get ids such as mcp:<name>/<tool>.'),
    enabled: z.boolean().default(true).description('Off: the server is never started and leaves the index.'),
    title: z.string().description('Short title for the index.'),
    description: z.string().description('One or two sentences shown in the index; defaults to the server instructions.'),
    transport: z.union([z.const('stdio'), z.const('streamable-http')]).default('stdio'),
    command: z.string().description('stdio: executable.'),
    args: z.array(String).default([]).description('stdio: arguments.'),
    env: z.dict(String).default({}).description('stdio: extra environment over the credential-scrubbed parent environment.'),
    cwd: z.string().description('stdio: working directory.'),
    url: z.string().description('streamable-http: endpoint URL.'),
    headers: z.dict(String).default({}).description('streamable-http: request headers.'),
    allowTools: z.array(String).default([]).description('Glob allow list over tool names; empty allows all.'),
    denyTools: z.array(String).default([]).description('Glob deny list; wins over allowTools.'),
    families: z.array(FamilyRuleSchema).default([]).description('Curated families; unmatched tools are grouped by name.'),
    idleDisconnectMs: z.number().min(1000).default(300_000).description('Close the connection after this idle time.'),
    callTimeoutMs: z.number().min(1000).default(600_000).description('Per-call timeout.'),
    discoveryTimeoutMs: z.number().min(1000).default(60_000).description('Connect and tools/list timeout.'),
    catalogTtlMs: z.number().min(0).default(86_400_000).description('Refresh the cached tool list in the background after this age.'),
});
/** Schema of one MCP server entry, shared with the `/server` row plugin. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const McpServerSchema = McpServerObject;
const ConfigSchema = z.object({
    enabled: z.boolean().default(true).description('Master switch. Off: no tools, no index, every MCP server stopped.'),
    mcp: z.array(McpServerObject).default([]).description('MCP servers served lazily through the catalog.'),
    skills: z.object({
        enabled: z.boolean().default(false).description('Opt in to indexing the Harness skill catalog; disabled by default.'),
        takeOverCatalog: z.boolean().default(false).description('Opt in to replacing the native per-session skill catalog; disabled by default.'),
        indexMode: z.union([z.const('brief'), z.const('names')]).default('brief').description('brief: names with a short description; names: names only.'),
        briefChars: z.number().min(20).default(80).description('Character budget of each brief description.'),
        families: z.array(FamilyRuleSchema).default([]),
        allow: z.array(String).default([]),
        deny: z.array(String).default([]),
    }).default({}),
    toolNames: z.object({
        search: z.string().default('rea_search'),
        describe: z.string().default('rea_describe'),
        call: z.string().default('rea_call'),
    }).default({}),
    limits: z.object({
        searchLimit: z.number().min(1).default(8),
        maxSearchLimit: z.number().min(1).default(60),
        schemaInlineMaxBytes: z.number().min(256).default(6_000),
        describeMaxChars: z.number().min(1000).default(14_000),
        callResultMaxChars: z.number().min(1000).default(120_000),
    }).default({}),
    cacheDir: z.string().description('Catalog cache directory; defaults to $DSH_HOME/dsh-rea-gateway.'),
});
/** Plugin configuration schema (`config` of the `rea-gateway` row). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Config = ConfigSchema;
function dshHome() {
    const value = process.env.DSH_HOME?.trim();
    if (!value)
        return join(homedir(), '.dsh');
    if (value === '~' || value.startsWith('~/'))
        return join(homedir(), value.slice(1));
    return value;
}
/**
 * Activate the catalog.
 * Declared `async` so Cordis treats it as startup work rather than a constructor.
 * @param rawCtx - plugin context.
 * @param config - resolved configuration.
 */
export async function apply(rawCtx, config) {
    const ctx = rawCtx;
    if (!config.enabled) {
        // Server rows contributed by other bundles settle as no-ops instead of waiting forever.
        ctx.provide('reaGatewayServers', { addMcpServer: async () => async () => undefined });
        // The settings page still loads and explains that the catalog is off.
        const offApi = {
            overview: async (sessionId) => ({ enabled: false, sessionId: sessionId ?? null, takeOverSkills: false, servers: [], skills: [], indexChars: 0 }),
            set: async () => { throw new Error('The capability catalog is switched off (enabled: false).'); },
        };
        ctx.plugin(CatalogRemote, offApi);
        return;
    }
    const logger = ctx.logger('rea-gateway');
    const catalog = new Catalog();
    ctx.effect(() => () => void catalog.dispose(), 'rea-gateway.dispose');
    const names = { ...config.toolNames, skill: 'skill' };
    const skillsService = ctx.get('skills');
    const workingDirectory = ctx.get('workingDirectory');
    const cwdOf = async (agent, signal) => {
        if (agent === undefined || workingDirectory === undefined)
            return undefined;
        try {
            return await workingDirectory.ensure(agent, signal);
        }
        catch {
            return undefined;
        }
    };
    const viewFor = async (agent, signal) => {
        const cwd = await cwdOf(agent, signal);
        return { ...agent ? { scope: agent, sessionId: agent.id } : {}, ...cwd ? { cwd } : {} };
    };
    const viewOf = (exec) => viewFor(exec.agent, exec.signal);
    // Per-capability switches, globally and per session.
    const cacheDir = config.cacheDir || join(dshHome(), 'dsh-rea-gateway');
    const toggles = new ToggleStore(join(cacheDir, 'toggles.json'));
    await toggles.load();
    const servers = new Map();
    const serverOf = (sourceKey) => servers.get(sourceKey.replace(/^mcp:/u, ''));
    catalog.isEnabled = (entry, view) => entry.kind === 'skill'
        ? toggles.enabled('skill', entry.name, view.sessionId)
        : toggles.enabled('server', entry.source.replace(/^mcp:/u, ''), view.sessionId, serverOf(entry.source)?.configuredEnabled ?? true);
    catalog.isSourceEnabled = (source, view) => {
        const server = serverOf(source.key);
        return server === undefined || toggles.enabled('server', server.name, view.sessionId, server.configuredEnabled);
    };
    // MCP sources. A server switched off globally does not start at launch; a session that
    // switches it on discovers and runs it on demand for that session only.
    const startIfEnabled = async (source) => {
        if (toggles.globallyEnabled(source.name, source.configuredEnabled))
            await source.start();
        else
            await source.start({ discover: false });
    };
    const addMcpServer = async (server) => {
        if (servers.has(server.name))
            throw new Error(`rea-gateway: MCP server "${server.name}" is configured twice`);
        const source = new McpSource(server, cacheDir, logger);
        source.isWanted = (view) => toggles.enabled('server', server.name, view.sessionId, server.enabled);
        const remove = catalog.add(source);
        servers.set(server.name, source);
        const dispose = async () => {
            remove();
            if (servers.get(server.name) === source)
                servers.delete(server.name);
            await source.dispose();
        };
        await startIfEnabled(source);
        return dispose;
    };
    ctx.effect(() => toggles.onChange(() => {
        for (const source of servers.values()) {
            if (!toggles.globallyEnabled(source.name, source.configuredEnabled))
                void source.disconnect('switched off');
            else if (!source.discovered)
                void source.start().catch((error) => logger.warn(`rea-gateway: starting ${source.key} failed`, error));
        }
    }), 'rea-gateway.toggles');
    // Other bundles contribute servers through `dsh-rea-gateway/server` rows.
    ctx.provide('reaGatewayServers', { addMcpServer });
    await Promise.all(config.mcp.map((server) => addMcpServer(server)));
    // Skills.
    const skillTakeover = config.skills.enabled && config.skills.takeOverCatalog && skillsService !== undefined;
    let skillSource;
    if (config.skills.enabled && skillsService !== undefined) {
        skillSource = new SkillSource(skillsService, { indexMode: config.skills.indexMode, briefChars: config.skills.briefChars, families: config.skills.families, allow: config.skills.allow, deny: config.skills.deny });
        catalog.add(skillSource);
    }
    const tools = createTools(skillsService, catalog, names, config.limits, viewOf, ctx);
    ctx.tools.register(tools.search);
    ctx.tools.register(tools.describe);
    ctx.tools.register(tools.call);
    // The standing index. It depends only on catalog content and the viewer's switches, so it
    // stays byte-identical across steps while nothing is switched.
    ctx.systemPrompt.section({
        name: 'rea-gateway',
        order: SECTION_ORDER,
        interpolate: false,
        text: (context) => {
            const agent = context.scope;
            return catalog.renderIndex(agent ? { scope: agent, sessionId: agent.id } : {}, names, skillTakeover);
        },
    });
    // Prime an unscoped view so the first prompt of any agent already has an index, then
    // build each agent's own view when it is created, before its first prompt assembly.
    await catalog.refresh({}, AbortSignal.timeout(30_000)).catch((error) => logger.warn('rea-gateway: initial refresh failed', error));
    ctx.on('agent/created', async ({ agent, signal }) => {
        const effective = signal ?? AbortSignal.timeout(30_000);
        try {
            await catalog.refresh(await viewFor(agent, effective), effective);
        }
        catch (error) {
            if (!effective.aborted)
                logger.warn('rea-gateway: agent refresh failed', error);
        }
    });
    // Refresh per-agent state (skills depend on scope and working directory) before each step.
    ctx.on('agent/pre-step', async (payload, next) => {
        try {
            await catalog.refresh(await viewFor(payload.agent, payload.signal), payload.signal);
        }
        catch (error) {
            if (!payload.signal.aborted)
                logger.warn('rea-gateway: refresh failed', error);
        }
        return next();
    });
    // Skill takeover: a scoped `skill` tool shadows the native one for each agent, which also
    // stops the native catalog message, while `/name` invocation keeps working.
    if (skillTakeover) {
        const owned = new Map();
        ctx.effect(() => () => {
            for (const dispose of [...owned.values()])
                dispose();
            owned.clear();
        }, 'rea-gateway.skill-shadows');
        const shadow = (agent) => {
            const agentCtx = agent.ctx;
            if (agentCtx === undefined || owned.has(agent.id))
                return;
            try {
                const dispose = agentCtx.effect(() => {
                    const unregister = agentCtx.tools.register(tools.skill);
                    return () => {
                        unregister();
                        owned.delete(agent.id);
                    };
                }, 'rea-gateway.skill');
                owned.set(agent.id, dispose);
            }
            catch (error) {
                logger.warn(`rea-gateway: could not shadow the skill tool for ${agent.id}`, error);
            }
        };
        ctx.on('agent/created', ({ agent }) => shadow(agent));
        // A reload (plugin update, HMR) finds agents that are already live; shadow them too, or
        // the native catalog would come back for every open session.
        const liveAgents = ctx.get('agents');
        for (const agent of liveAgents?.list() ?? []) {
            shadow(agent);
            void viewFor(agent, AbortSignal.timeout(30_000)).then((view) => catalog.refresh(view, AbortSignal.timeout(30_000))).catch(() => undefined);
        }
    }
    // Settings page and per-session controls.
    const agents = ctx.get('agents');
    const api = {
        async overview(sessionId, signal) {
            const agent = sessionId === undefined ? undefined : agents?.get(sessionId);
            const view = agent ? await viewFor(agent, signal) : sessionId ? { sessionId } : {};
            if (agent)
                await catalog.refresh(view, signal).catch(() => undefined);
            const sessionLayer = toggles.session(sessionId);
            return {
                enabled: true,
                sessionId: sessionId ?? null,
                takeOverSkills: skillTakeover,
                servers: [...servers.values()].map((source) => ({
                    name: source.name,
                    title: source.title,
                    tools: source.toolCount,
                    connected: source.connected,
                    problem: source.problem ?? null,
                    configured: source.configuredEnabled,
                    global: toggles.global().servers[source.name] ?? null,
                    session: sessionLayer?.servers[source.name] ?? null,
                    effective: toggles.enabled('server', source.name, sessionId, source.configuredEnabled),
                })),
                skills: (skillSource?.entries(view) ?? []).map((entry) => ({
                    name: entry.name,
                    family: entry.family,
                    summary: entry.summary,
                    global: toggles.global().skills[entry.name] ?? null,
                    session: sessionLayer?.skills[entry.name] ?? null,
                    effective: toggles.enabled('skill', entry.name, sessionId),
                })),
                indexChars: catalog.renderIndex(view, names, skillTakeover).length,
            };
        },
        async set(request) {
            await toggles.set(request.scope === 'global' ? 'global' : { sessionId: request.sessionId }, request.kind, request.name, request.value);
        },
    };
    ctx.plugin(CatalogRemote, api);
    logger.info(`rea-gateway: ${catalog.entries({}).length} entries from ${catalog.list().length} sources`);
}
