const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'its',
    'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with', 'use', 'when', 'you', 'your',
]);
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/u;
/**
 * Tokenize text for indexing and querying.
 * @param text - raw text, identifiers allowed.
 * @returns lower-case tokens; CJK runs become overlapping bigrams.
 */
export function tokenize(text) {
    const tokens = [];
    const spaced = text
        .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
        .replace(/[_\-./:]+/gu, ' ');
    for (const raw of spaced.split(/[^\p{L}\p{N}]+/u)) {
        if (raw === '')
            continue;
        if (CJK.test(raw)) {
            const chars = [...raw];
            if (chars.length === 1)
                tokens.push(chars[0]);
            for (let i = 0; i + 1 < chars.length; i++)
                tokens.push(chars[i] + chars[i + 1]);
            continue;
        }
        const word = raw.toLowerCase();
        if (STOP_WORDS.has(word))
            continue;
        tokens.push(stem(word));
    }
    return tokens;
}
/** Strip a few English suffixes so `inspecting`, `inspects` and `inspect` meet. */
function stem(word) {
    if (word.length <= 4)
        return word;
    for (const suffix of ['ations', 'ation', 'ings', 'ing', 'ies', 'es', 's', 'ed']) {
        if (suffix === 's' && (word.endsWith('ss') || word.endsWith('us')))
            continue;
        if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
            return suffix === 'ies' ? word.slice(0, -3) + 'y' : word.slice(0, -suffix.length);
        }
    }
    return word;
}
/** Field weights: names matter most, descriptions least. */
const WEIGHTS = { name: 3, family: 2, summary: 1.5, description: 1 };
/** An immutable BM25 index over a fixed entry set. */
export class SearchIndex {
    docs;
    df = new Map();
    avgLength;
    constructor(entries) {
        this.docs = entries.map((entry) => {
            const tf = new Map();
            const add = (text, weight) => {
                for (const token of tokenize(text))
                    tf.set(token, (tf.get(token) ?? 0) + weight);
            };
            add(entry.name, WEIGHTS.name);
            add(entry.family, WEIGHTS.family);
            add(entry.summary, WEIGHTS.summary);
            if (entry.description !== entry.summary)
                add(entry.description, WEIGHTS.description);
            let length = 0;
            for (const value of tf.values())
                length += value;
            return { entry, tf, length };
        });
        for (const doc of this.docs)
            for (const token of doc.tf.keys())
                this.df.set(token, (this.df.get(token) ?? 0) + 1);
        this.avgLength = this.docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, this.docs.length);
    }
    /**
     * Rank entries for a free-text query.
     * @param query - keywords, identifiers or a natural-language request.
     * @param limit - maximum hits.
     * @returns hits ordered by descending score; exact name or id matches come first.
     */
    search(query, limit) {
        const normalized = query.trim().toLowerCase();
        const terms = [...new Set(tokenize(query))];
        const k1 = 1.2;
        const b = 0.75;
        const n = this.docs.length;
        const hits = [];
        for (const doc of this.docs) {
            let score = 0;
            for (const term of terms) {
                const freq = doc.tf.get(term);
                if (freq === undefined)
                    continue;
                const df = this.df.get(term) ?? 0;
                const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
                score += idf * (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * doc.length / this.avgLength));
            }
            const name = doc.entry.name.toLowerCase();
            if (normalized !== '' && (name === normalized || doc.entry.id.toLowerCase() === normalized))
                score += 1000;
            else if (normalized.length >= 3 && name.includes(normalized))
                score += 5;
            if (score > 0)
                hits.push({ entry: doc.entry, score });
        }
        hits.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
        return hits.slice(0, limit);
    }
}
