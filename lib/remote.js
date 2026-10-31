var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { z } from 'zod';
/** Wire namespace and Cordis service key. */
export const REMOTE_NAMESPACE = 'reaGateway';
export const catalogRequestSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('overview'), sessionId: z.string().min(1).max(200).optional() }),
    z.object({
        action: z.literal('set'),
        scope: z.enum(['global', 'session']),
        sessionId: z.string().min(1).max(200).optional(),
        kind: z.enum(['server', 'skill']),
        name: z.string().min(1).max(200),
        value: z.boolean().nullable(),
    }),
]);
const overrideSchema = z.boolean().nullable();
export const catalogOverviewSchema = z.object({
    enabled: z.boolean(),
    sessionId: z.string().nullable(),
    takeOverSkills: z.boolean(),
    servers: z.array(z.object({
        name: z.string(),
        title: z.string(),
        tools: z.number(),
        connected: z.boolean(),
        problem: z.string().nullable(),
        configured: z.boolean(),
        global: overrideSchema,
        session: overrideSchema,
        effective: z.boolean(),
    })),
    skills: z.array(z.object({
        name: z.string(),
        family: z.string(),
        summary: z.string(),
        global: overrideSchema,
        session: overrideSchema,
        effective: z.boolean(),
    })),
    indexChars: z.number(),
});
/** Host service exposed to the browser as `ctx.remote.reaGateway`. */
let CatalogRemote = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _request_decorators;
    return class CatalogRemote extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _request_decorators = [Remote('request')];
            __esDecorate(this, null, _request_decorators, { kind: "method", name: "request", static: false, private: false, access: { has: obj => "request" in obj, get: obj => obj.request }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        api = __runInitializers(this, _instanceExtraInitializers);
        constructor(ctx, api) {
            super(ctx, REMOTE_NAMESPACE);
            this.api = api;
        }
        /** Validate and execute one request. */
        async request(rawRequest, signal) {
            const request = catalogRequestSchema.parse(rawRequest);
            if (request.action === 'set') {
                if (request.scope === 'session' && request.sessionId === undefined)
                    throw new Error('A session override needs a sessionId.');
                await this.api.set(request);
                return this.api.overview(request.sessionId, signal);
            }
            return this.api.overview(request.sessionId, signal);
        }
    };
})();
export { CatalogRemote };
/** Typert codec whose schema is created lazily, as the official registry expects. */
function strictCodec(typeSymbol, schema) {
    return { mode: 'strict', typeSymbol, create: () => schema };
}
/** Descriptor shared by the Host contribution; the browser carries a structural copy. */
export const catalogRequestDescriptor = {
    id: 'dsh-rea-gateway#reaGateway/request',
    service: REMOTE_NAMESPACE,
    namespace: REMOTE_NAMESPACE,
    method: 'request',
    invocation: { kind: 'direct' },
    parameters: [{
            name: 'rawRequest',
            wire: 'rawRequest',
            source: 'json',
            codec: strictCodec('dsh-rea-gateway#CatalogRequest', catalogRequestSchema),
        }],
    cancellation: { parameter: 'signal' },
    result: strictCodec('dsh-rea-gateway#CatalogOverview', catalogOverviewSchema),
    sourceLocation: { file: 'src/remote.ts', line: 1, column: 1 },
};
