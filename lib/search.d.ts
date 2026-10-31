/**
 * Keyword retrieval over catalog entries: BM25 with identifier splitting and CJK bigrams.
 *
 * Tool catalogs are dominated by snake_case and camelCase identifiers and short English
 * descriptions, while users often ask in Chinese. Splitting identifiers and indexing CJK
 * character bigrams lets plain BM25 match both without an embedding model.
 * @module
 */
import type { CapabilityEntry } from './types.js';
/**
 * Tokenize text for indexing and querying.
 * @param text - raw text, identifiers allowed.
 * @returns lower-case tokens; CJK runs become overlapping bigrams.
 */
export declare function tokenize(text: string): string[];
/** A search hit. */
export interface SearchHit {
    readonly entry: CapabilityEntry;
    readonly score: number;
}
/** An immutable BM25 index over a fixed entry set. */
export declare class SearchIndex {
    private readonly docs;
    private readonly df;
    private readonly avgLength;
    constructor(entries: readonly CapabilityEntry[]);
    /**
     * Rank entries for a free-text query.
     * @param query - keywords, identifiers or a natural-language request.
     * @param limit - maximum hits.
     * @returns hits ordered by descending score; exact name or id matches come first.
     */
    search(query: string, limit: number): SearchHit[];
}
