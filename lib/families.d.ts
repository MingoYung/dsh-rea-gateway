/**
 * Family assignment: curated glob rules first, then a name-based heuristic.
 * @module
 */
/** A configured family rule. */
export interface FamilyRule {
    readonly name: string;
    readonly description?: string;
    /** Glob patterns over entry names; `*` matches any run of characters. */
    readonly match: readonly string[];
}
/**
 * Compile a glob with `*` and `?` wildcards to an anchored regular expression.
 * @param glob - pattern such as `inspect_android_*`.
 */
export declare function globToRegExp(glob: string): RegExp;
/**
 * Whether a name passes allow and deny glob lists.
 * @param name - entry name.
 * @param allow - when non-empty, the name must match one pattern.
 * @param deny - a match removes the name; deny wins over allow.
 */
export declare function passesFilter(name: string, allow: readonly string[], deny: readonly string[]): boolean;
/**
 * Assign every name to a family.
 * @param names - entry names of one source.
 * @param rules - curated rules; the first matching rule wins.
 * @param minHeuristicSize - heuristic families smaller than this fold into `misc`.
 * @returns family name per entry name, plus rule descriptions.
 */
export declare function assignFamilies(names: readonly string[], rules: readonly FamilyRule[], minHeuristicSize?: number): {
    family: Map<string, string>;
    descriptions: Map<string, string>;
};
