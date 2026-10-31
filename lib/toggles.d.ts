/** Which capability a toggle addresses. */
export type ToggleKind = 'server' | 'skill';
/** Overrides of one scope; absent names follow the next scope. */
export interface ToggleLayer {
    servers: Record<string, boolean>;
    skills: Record<string, boolean>;
}
/** The toggle store. Reads are synchronous from memory; writes persist atomically. */
export declare class ToggleStore {
    private readonly path;
    private state;
    private readonly listeners;
    private writing;
    constructor(path: string);
    /** Load the file; a missing or malformed file starts empty. */
    load(): Promise<void>;
    /** Subscribe to changes; returns the unsubscriber. */
    onChange(listener: () => void): () => void;
    global(): Readonly<ToggleLayer>;
    session(sessionId: string | undefined): Readonly<ToggleLayer> | undefined;
    /**
     * Effective state of one capability.
     * @param kind - server or skill.
     * @param name - server name or skill name.
     * @param sessionId - viewing session, when known.
     * @param configured - the configured default.
     */
    enabled(kind: ToggleKind, name: string, sessionId: string | undefined, configured?: boolean): boolean;
    /** Whether a server is enabled for at least the global scope (decides whether it may run). */
    globallyEnabled(name: string, configured?: boolean): boolean;
    /**
     * Set or clear one override.
     * @param scope - `global`, or a session id.
     * @param kind - server or skill.
     * @param name - capability name.
     * @param value - true/false to override, null to follow the next scope.
     */
    set(scope: 'global' | {
        sessionId: string;
    }, kind: ToggleKind, name: string, value: boolean | null): Promise<void>;
    private prune;
    private persist;
}
