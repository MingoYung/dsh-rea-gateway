export declare const TYPERT: {
    readonly package: "dsh-rea-gateway";
    readonly face: "host";
    readonly schemas: readonly [{
        name: string;
        create: () => import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"overview">;
            sessionId: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            action: import("zod").ZodLiteral<"set">;
            scope: import("zod").ZodEnum<{
                session: "session";
                global: "global";
            }>;
            sessionId: import("zod").ZodOptional<import("zod").ZodString>;
            kind: import("zod").ZodEnum<{
                skill: "skill";
                server: "server";
            }>;
            name: import("zod").ZodString;
            value: import("zod").ZodNullable<import("zod").ZodBoolean>;
        }, import("zod/v4/core").$strip>], "action">;
    }, {
        name: string;
        create: () => import("zod").ZodObject<{
            enabled: import("zod").ZodBoolean;
            sessionId: import("zod").ZodNullable<import("zod").ZodString>;
            takeOverSkills: import("zod").ZodBoolean;
            servers: import("zod").ZodArray<import("zod").ZodObject<{
                name: import("zod").ZodString;
                title: import("zod").ZodString;
                tools: import("zod").ZodNumber;
                connected: import("zod").ZodBoolean;
                problem: import("zod").ZodNullable<import("zod").ZodString>;
                configured: import("zod").ZodBoolean;
                global: import("zod").ZodNullable<import("zod").ZodBoolean>;
                session: import("zod").ZodNullable<import("zod").ZodBoolean>;
                effective: import("zod").ZodBoolean;
            }, import("zod/v4/core").$strip>>;
            skills: import("zod").ZodArray<import("zod").ZodObject<{
                name: import("zod").ZodString;
                family: import("zod").ZodString;
                summary: import("zod").ZodString;
                global: import("zod").ZodNullable<import("zod").ZodBoolean>;
                session: import("zod").ZodNullable<import("zod").ZodBoolean>;
                effective: import("zod").ZodBoolean;
            }, import("zod/v4/core").$strip>>;
            indexChars: import("zod").ZodNumber;
        }, import("zod/v4/core").$strip>;
    }];
    readonly model: {
        readonly services: readonly [];
        readonly events: readonly [];
        readonly objects: readonly [];
    };
    readonly invocations: readonly [{
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
                create: () => import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
                    action: import("zod").ZodLiteral<"overview">;
                    sessionId: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                    action: import("zod").ZodLiteral<"set">;
                    scope: import("zod").ZodEnum<{
                        session: "session";
                        global: "global";
                    }>;
                    sessionId: import("zod").ZodOptional<import("zod").ZodString>;
                    kind: import("zod").ZodEnum<{
                        skill: "skill";
                        server: "server";
                    }>;
                    name: import("zod").ZodString;
                    value: import("zod").ZodNullable<import("zod").ZodBoolean>;
                }, import("zod/v4/core").$strip>], "action">;
            };
        }];
        readonly cancellation: {
            readonly parameter: "signal";
        };
        readonly result: {
            mode: "strict";
            typeSymbol: string;
            create: () => import("zod").ZodObject<{
                enabled: import("zod").ZodBoolean;
                sessionId: import("zod").ZodNullable<import("zod").ZodString>;
                takeOverSkills: import("zod").ZodBoolean;
                servers: import("zod").ZodArray<import("zod").ZodObject<{
                    name: import("zod").ZodString;
                    title: import("zod").ZodString;
                    tools: import("zod").ZodNumber;
                    connected: import("zod").ZodBoolean;
                    problem: import("zod").ZodNullable<import("zod").ZodString>;
                    configured: import("zod").ZodBoolean;
                    global: import("zod").ZodNullable<import("zod").ZodBoolean>;
                    session: import("zod").ZodNullable<import("zod").ZodBoolean>;
                    effective: import("zod").ZodBoolean;
                }, import("zod/v4/core").$strip>>;
                skills: import("zod").ZodArray<import("zod").ZodObject<{
                    name: import("zod").ZodString;
                    family: import("zod").ZodString;
                    summary: import("zod").ZodString;
                    global: import("zod").ZodNullable<import("zod").ZodBoolean>;
                    session: import("zod").ZodNullable<import("zod").ZodBoolean>;
                    effective: import("zod").ZodBoolean;
                }, import("zod/v4/core").$strip>>;
                indexChars: import("zod").ZodNumber;
            }, import("zod/v4/core").$strip>;
        };
        readonly sourceLocation: {
            readonly file: "src/remote.ts";
            readonly line: 1;
            readonly column: 1;
        };
    }];
};
export default TYPERT;
