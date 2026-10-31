/**
 * Plugin-owned enable/disable state for individual capabilities, globally and per session.
 *
 * Resolution order for one capability: session override, then global override, then the
 * configured default (enabled unless the configuration denies it). The state lives in one
 * JSON file under the Harness home so it survives upgrades and never adds event types to
 * session logs.
 * @module
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
/** Sessions retained in the file; the least recently changed are dropped first. */
const MAX_SESSIONS = 500;
function emptyLayer() {
    return { servers: {}, skills: {} };
}
function sanitizeLayer(value) {
    const layer = emptyLayer();
    if (value === null || typeof value !== 'object')
        return layer;
    for (const key of ['servers', 'skills']) {
        const record = value[key];
        if (record === null || typeof record !== 'object')
            continue;
        for (const [name, enabled] of Object.entries(record))
            if (typeof enabled === 'boolean')
                layer[key][name] = enabled;
    }
    return layer;
}
/** The toggle store. Reads are synchronous from memory; writes persist atomically. */
export class ToggleStore {
    path;
    state = { version: 1, global: emptyLayer(), sessions: {} };
    listeners = new Set();
    writing = Promise.resolve();
    constructor(path) {
        this.path = path;
    }
    /** Load the file; a missing or malformed file starts empty. */
    async load() {
        try {
            const raw = JSON.parse(await readFile(this.path, 'utf8'));
            const sessions = {};
            for (const [id, layer] of Object.entries(raw.sessions ?? {})) {
                sessions[id] = { ...sanitizeLayer(layer), updatedAt: typeof layer.updatedAt === 'number' ? layer.updatedAt : 0 };
            }
            this.state = { version: 1, global: sanitizeLayer(raw.global), sessions };
        }
        catch {
            this.state = { version: 1, global: emptyLayer(), sessions: {} };
        }
    }
    /** Subscribe to changes; returns the unsubscriber. */
    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    global() {
        return this.state.global;
    }
    session(sessionId) {
        return sessionId === undefined ? undefined : this.state.sessions[sessionId];
    }
    /**
     * Effective state of one capability.
     * @param kind - server or skill.
     * @param name - server name or skill name.
     * @param sessionId - viewing session, when known.
     * @param configured - the configured default.
     */
    enabled(kind, name, sessionId, configured = true) {
        const key = kind === 'server' ? 'servers' : 'skills';
        const session = this.session(sessionId)?.[key][name];
        if (session !== undefined)
            return session;
        return this.state.global[key][name] ?? configured;
    }
    /** Whether a server is enabled for at least the global scope (decides whether it may run). */
    globallyEnabled(name, configured = true) {
        return this.state.global.servers[name] ?? configured;
    }
    /**
     * Set or clear one override.
     * @param scope - `global`, or a session id.
     * @param kind - server or skill.
     * @param name - capability name.
     * @param value - true/false to override, null to follow the next scope.
     */
    async set(scope, kind, name, value) {
        const key = kind === 'server' ? 'servers' : 'skills';
        let layer;
        if (scope === 'global')
            layer = this.state.global;
        else {
            const existing = this.state.sessions[scope.sessionId];
            const session = existing ?? { ...emptyLayer(), updatedAt: 0 };
            session.updatedAt = Date.now();
            this.state.sessions[scope.sessionId] = session;
            layer = session;
        }
        if (value === null)
            delete layer[key][name];
        else
            layer[key][name] = value;
        if (scope !== 'global') {
            const session = this.state.sessions[scope.sessionId];
            if (Object.keys(session.servers).length === 0 && Object.keys(session.skills).length === 0)
                delete this.state.sessions[scope.sessionId];
            this.prune();
        }
        for (const listener of [...this.listeners])
            listener();
        await this.persist();
    }
    prune() {
        const ids = Object.keys(this.state.sessions);
        if (ids.length <= MAX_SESSIONS)
            return;
        ids.sort((a, b) => this.state.sessions[a].updatedAt - this.state.sessions[b].updatedAt);
        for (const id of ids.slice(0, ids.length - MAX_SESSIONS))
            delete this.state.sessions[id];
    }
    persist() {
        const snapshot = JSON.stringify(this.state, null, 1);
        this.writing = this.writing.catch(() => undefined).then(async () => {
            await mkdir(dirname(this.path), { recursive: true });
            const temp = `${this.path}.${process.pid}.tmp`;
            await writeFile(temp, snapshot, { mode: 0o600 });
            await rename(temp, this.path);
        });
        return this.writing;
    }
}
