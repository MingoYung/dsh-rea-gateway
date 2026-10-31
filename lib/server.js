import { McpServerSchema } from './index.js';
export const name = 'rea-gateway-server';
export const inject = ['reaGatewayServers'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Config = McpServerSchema;
/**
 * Register the configured server while this row is active.
 * @param rawCtx - row context with the catalog service.
 * @param config - resolved server configuration.
 */
export async function apply(rawCtx, config) {
    const ctx = rawCtx;
    let dispose;
    let disposed = false;
    ctx.effect(() => () => {
        disposed = true;
        void dispose?.();
    }, `rea-gateway.server(${config.name})`);
    const remove = await ctx.reaGatewayServers.addMcpServer(config);
    if (disposed)
        await remove();
    else
        dispose = remove;
}
