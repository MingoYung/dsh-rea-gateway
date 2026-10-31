import { type FamilyRule } from '../families.js';
import type { CapabilityEntry, CapabilitySource, HarnessContext, SourceIndex, ViewContext } from '../types.js';
/** Resolved skill-source configuration. */
export interface SkillSourceConfig {
    /** `brief`: names plus a short description; `names`: names only. */
    readonly indexMode: 'brief' | 'names';
    /** Character budget of a brief description. */
    readonly briefChars: number;
    readonly families: readonly FamilyRule[];
    readonly allow: readonly string[];
    readonly deny: readonly string[];
}
/**
 * Group skill names: a shared multi-word suffix (`*-history-ingest`) or prefix (`wiki-*`)
 * used by at least three skills names a family; the rest are `general`.
 * @param names - skill names.
 */
export declare function skillFamilies(names: readonly string[]): Map<string, string>;
/** The Harness skill catalog as a capability source. */
export declare class SkillSource implements CapabilitySource {
    private readonly skills;
    private readonly config;
    readonly key = "skills";
    private readonly states;
    private fallback;
    constructor(skills: NonNullable<HarnessContext['skills']>, config: SkillSourceConfig);
    private state;
    refresh(view: ViewContext, signal: AbortSignal): Promise<void>;
    private build;
    entries(view: ViewContext): readonly CapabilityEntry[];
    index(view: ViewContext, entries: readonly CapabilityEntry[]): SourceIndex | undefined;
}
