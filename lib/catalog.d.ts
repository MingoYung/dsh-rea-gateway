/**
 * The catalog: merges sources, renders the standing index, and answers lookups.
 * @module
 */
import { type SearchHit } from './search.js';
import type { CapabilityEntry, CapabilitySource, FamilySummary, SourceIndex, ViewContext } from './types.js';
/**
 * Derive a one-line summary from a description.
 * @param description - full text.
 * @param max - character budget.
 */
export declare function summarize(description: string, max?: number): string;
/**
 * Summarize families of a source's entries.
 * @param entries - entries of one source.
 * @param descriptions - optional family descriptions.
 * @param examples - representative names per family.
 */
export declare function summarizeFamilies(entries: readonly CapabilityEntry[], descriptions?: ReadonlyMap<string, string>, examples?: number): FamilySummary[];
/** The tool names the index tells the model to use. */
export interface MetaToolNames {
    readonly search: string;
    readonly describe: string;
    readonly call: string;
    readonly skill: string;
}
/** Merged view over every registered source. */
export declare class Catalog {
    private readonly sources;
    private cache;
    /** Decides whether an entry is enabled for a viewer; everything is enabled by default. */
    isEnabled: (entry: CapabilityEntry, view: ViewContext) => boolean;
    /** Decides whether a whole source is switched on for a viewer; a switched-off source leaves the index. */
    isSourceEnabled: (source: CapabilitySource, view: ViewContext) => boolean;
    /**
     * Add a source; returns its disposer.
     * @param source - capability source with a unique key.
     */
    add(source: CapabilitySource): () => void;
    list(): CapabilitySource[];
    source(key: string): CapabilitySource | undefined;
    /** Every entry enabled for the viewer. */
    entries(view: ViewContext): CapabilityEntry[];
    /** Every entry, enabled or not (for settings views and precise error messages). */
    allEntries(view: ViewContext): CapabilityEntry[];
    /**
     * Find one entry by id, accepting a bare name when it is unambiguous.
     * @param id - entry id or bare name.
     * @param view - viewing scope.
     */
    find(id: string, view: ViewContext, includeDisabled?: boolean): CapabilityEntry | {
        ambiguous: CapabilityEntry[];
    } | undefined;
    /**
     * Keyword search across sources.
     * @param query - free text.
     * @param view - viewing scope.
     * @param filter - optional source, family and kind filters.
     * @param limit - maximum hits.
     */
    search(query: string, view: ViewContext, filter: {
        source?: string;
        family?: string;
        kind?: string;
    }, limit: number): SearchHit[];
    /** Index blocks of every source, in registration order. */
    indexes(view: ViewContext): SourceIndex[];
    /**
     * Render the standing index text.
     * @param view - viewing scope.
     * @param names - meta-tool names to reference.
     * @param skillTakeover - whether skills load through the replacement `skill` tool.
     * @returns prompt text, or an empty string when there is nothing to index.
     */
    renderIndex(view: ViewContext, names: MetaToolNames, skillTakeover: boolean): string;
    refresh(view: ViewContext, signal: AbortSignal): Promise<void>;
    dispose(): Promise<void>;
}
