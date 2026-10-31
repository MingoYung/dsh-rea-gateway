/**
 * Remote surface for the settings page and the per-session controls.
 *
 * One strict `request` endpoint keeps the wire contract small: `overview` reads the
 * catalog as one session sees it, `set` changes one global or session override and
 * returns the new overview.
 * @module
 */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { z } from 'zod';
/** Wire namespace and Cordis service key. */
export declare const REMOTE_NAMESPACE = "reaGateway";
export declare const catalogRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"overview">;
    sessionId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"set">;
    scope: z.ZodEnum<{
        session: "session";
        global: "global";
    }>;
    sessionId: z.ZodOptional<z.ZodString>;
    kind: z.ZodEnum<{
        skill: "skill";
        server: "server";
    }>;
    name: z.ZodString;
    value: z.ZodNullable<z.ZodBoolean>;
}, z.core.$strip>], "action">;
export declare const catalogOverviewSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    sessionId: z.ZodNullable<z.ZodString>;
    takeOverSkills: z.ZodBoolean;
    servers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        title: z.ZodString;
        tools: z.ZodNumber;
        connected: z.ZodBoolean;
        problem: z.ZodNullable<z.ZodString>;
        configured: z.ZodBoolean;
        global: z.ZodNullable<z.ZodBoolean>;
        session: z.ZodNullable<z.ZodBoolean>;
        effective: z.ZodBoolean;
    }, z.core.$strip>>;
    skills: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        family: z.ZodString;
        summary: z.ZodString;
        global: z.ZodNullable<z.ZodBoolean>;
        session: z.ZodNullable<z.ZodBoolean>;
        effective: z.ZodBoolean;
    }, z.core.$strip>>;
    indexChars: z.ZodNumber;
}, z.core.$strip>;
export type CatalogRequest = z.infer<typeof catalogRequestSchema>;
export type CatalogOverview = z.infer<typeof catalogOverviewSchema>;
/** What the Remote service needs from the running catalog. */
export interface CatalogRemoteApi {
    overview(sessionId: string | undefined, signal: AbortSignal): Promise<CatalogOverview>;
    set(request: Extract<CatalogRequest, {
        action: 'set';
    }>): Promise<void>;
}
/** Host service exposed to the browser as `ctx.remote.reaGateway`. */
export declare class CatalogRemote extends TypertRemoteService {
    private readonly api;
    constructor(ctx: Context, api: CatalogRemoteApi);
    /** Validate and execute one request. */
    request(rawRequest: CatalogRequest, signal: AbortSignal): Promise<CatalogOverview>;
}
/** Descriptor shared by the Host contribution; the browser carries a structural copy. */
export declare const catalogRequestDescriptor: {
    readonly id: "dsh-rea-gateway#reaGateway/request";
    readonly service: "reaGateway";
    readonly namespace: "reaGateway";
    readonly method: "request";
    readonly invocation: {
        readonly kind: "direct";
    };
    readonly parameters: readonly [{
        readonly name: "rawRequest";
        readonly wire: "rawRequest";
        readonly source: "json";
        readonly codec: {
            mode: "strict";
            typeSymbol: string;
            create: () => z.ZodDiscriminatedUnion<[z.ZodObject<{
                action: z.ZodLiteral<"overview">;
                sessionId: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>, z.ZodObject<{
                action: z.ZodLiteral<"set">;
                scope: z.ZodEnum<{
                    session: "session";
                    global: "global";
                }>;
                sessionId: z.ZodOptional<z.ZodString>;
                kind: z.ZodEnum<{
                    skill: "skill";
                    server: "server";
                }>;
                name: z.ZodString;
                value: z.ZodNullable<z.ZodBoolean>;
            }, z.core.$strip>], "action">;
        };
    }];
    readonly cancellation: {
        readonly parameter: "signal";
    };
    readonly result: {
        mode: "strict";
        typeSymbol: string;
        create: () => z.ZodObject<{
            enabled: z.ZodBoolean;
            sessionId: z.ZodNullable<z.ZodString>;
            takeOverSkills: z.ZodBoolean;
            servers: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                title: z.ZodString;
                tools: z.ZodNumber;
                connected: z.ZodBoolean;
                problem: z.ZodNullable<z.ZodString>;
                configured: z.ZodBoolean;
                global: z.ZodNullable<z.ZodBoolean>;
                session: z.ZodNullable<z.ZodBoolean>;
                effective: z.ZodBoolean;
            }, z.core.$strip>>;
            skills: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                family: z.ZodString;
                summary: z.ZodString;
                global: z.ZodNullable<z.ZodBoolean>;
                session: z.ZodNullable<z.ZodBoolean>;
                effective: z.ZodBoolean;
            }, z.core.$strip>>;
            indexChars: z.ZodNumber;
        }, z.core.$strip>;
    };
    readonly sourceLocation: {
        readonly file: "src/remote.ts";
        readonly line: 1;
        readonly column: 1;
    };
};
