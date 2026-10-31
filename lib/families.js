/**
 * Family assignment: curated glob rules first, then a name-based heuristic.
 * @module
 */
/**
 * Compile a glob with `*` and `?` wildcards to an anchored regular expression.
 * @param glob - pattern such as `inspect_android_*`.
 */
export function globToRegExp(glob) {
    const escaped = glob.replace(/[.+^${}()|[\]\\]/gu, '\\$&').replace(/\*/gu, '.*').replace(/\?/gu, '.');
    return new RegExp(`^${escaped}$`, 'u');
}
/**
 * Whether a name passes allow and deny glob lists.
 * @param name - entry name.
 * @param allow - when non-empty, the name must match one pattern.
 * @param deny - a match removes the name; deny wins over allow.
 */
export function passesFilter(name, allow, deny) {
    if (deny.some((pattern) => globToRegExp(pattern).test(name)))
        return false;
    return allow.length === 0 || allow.some((pattern) => globToRegExp(pattern).test(name));
}
/** Leading verbs that say what a tool does rather than what it is about. */
const VERBS = new Set([
    'add', 'analyze', 'annotate', 'apply', 'batch', 'build', 'call', 'capture', 'check', 'close', 'collect', 'compare',
    'correlate', 'create', 'current', 'decode', 'decompile', 'delete', 'demangle', 'describe', 'discover', 'evaluate',
    'execute', 'export', 'extract', 'fetch', 'find', 'get', 'goto', 'identify', 'import', 'inspect', 'install', 'instrument',
    'list', 'load', 'next', 'observe', 'open', 'prev', 'project', 'pull', 'push', 'query', 'read', 'reconcile', 'record',
    'recover', 'remove', 'resolve', 'resume', 'run', 'search', 'send', 'set', 'start', 'stop', 'trace', 'uninstall',
    'unload', 'unset', 'update', 'upload', 'verify', 'write',
]);
/** Words too generic to name a family on their own. */
const GENERIC = new Set(['to', 'with', 'of', 'and', 'session', 'status', 'command', 'console', 'client', 'target', 'targets', 'file', 'files', 'data', 'info', 'the', 'a']);
function heuristicKey(name) {
    const words = name.split(/[_\-.:]+|(?<=[a-z0-9])(?=[A-Z])/u).map((word) => word.toLowerCase()).filter(Boolean);
    const subject = words.filter((word) => !VERBS.has(word) && !GENERIC.has(word));
    return subject[0] ?? words[0] ?? 'misc';
}
/**
 * Assign every name to a family.
 * @param names - entry names of one source.
 * @param rules - curated rules; the first matching rule wins.
 * @param minHeuristicSize - heuristic families smaller than this fold into `misc`.
 * @returns family name per entry name, plus rule descriptions.
 */
export function assignFamilies(names, rules, minHeuristicSize = 3) {
    const family = new Map();
    const descriptions = new Map();
    const compiled = rules.map((rule) => ({ rule, patterns: rule.match.map(globToRegExp) }));
    for (const { rule } of compiled)
        if (rule.description !== undefined)
            descriptions.set(rule.name, rule.description);
    const unassigned = [];
    for (const name of names) {
        const hit = compiled.find(({ patterns }) => patterns.some((pattern) => pattern.test(name)));
        if (hit)
            family.set(name, hit.rule.name);
        else
            unassigned.push(name);
    }
    // Each name joins the family of its most widely shared subject word; words shared by
    // fewer than `minHeuristicSize` names cannot found a family.
    const subjects = new Map(unassigned.map((name) => [name, subjectWords(name)]));
    const frequency = new Map();
    for (const words of subjects.values())
        for (const word of new Set(words))
            frequency.set(word, (frequency.get(word) ?? 0) + 1);
    for (const name of unassigned) {
        const words = subjects.get(name) ?? [];
        let best;
        let bestCount = 0;
        for (const word of words) {
            const count = frequency.get(word) ?? 0;
            if (count > bestCount) {
                best = word;
                bestCount = count;
            }
        }
        family.set(name, best !== undefined && (bestCount >= minHeuristicSize || unassigned.length < minHeuristicSize) ? best : 'misc');
    }
    // A word may have been shared widely yet chosen by few names; fold such small groups.
    if (unassigned.length >= minHeuristicSize) {
        const sizes = new Map();
        for (const name of unassigned)
            sizes.set(family.get(name), (sizes.get(family.get(name)) ?? 0) + 1);
        for (const name of unassigned)
            if ((sizes.get(family.get(name)) ?? 0) < minHeuristicSize)
                family.set(name, 'misc');
    }
    return { family, descriptions };
}
function subjectWords(name) {
    const words = name.split(/[_\-.:]+|(?<=[a-z0-9])(?=[A-Z])/u).map((word) => word.toLowerCase()).filter(Boolean);
    const subject = words.filter((word) => !VERBS.has(word) && !GENERIC.has(word));
    return subject.length > 0 ? subject : [heuristicKey(name)];
}
