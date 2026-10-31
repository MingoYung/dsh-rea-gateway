/**
 * Row plugin that adds one MCP server to the capability catalog.
 *
 * Bundles insert one row per server, so they never overwrite the main catalog row's
 * configuration:
 *
 * ```yaml
 * - insert:
 *     - id: rea-gateway-rea
 *       name: 'dsh-rea-gateway/server'
 *       config: { name: rea, command: rea, args: [mcp] }
 * ```
 * @module dsh-rea-gateway/server
 */
import type { ReaGatewayService } from './index.js'
import { McpServerSchema } from './index.js'
import type { McpServerConfig } from './sources/mcp.js'
import type { HarnessContext } from './types.js'

export const name = 'rea-gateway-server'
export const inject = ['reaGatewayServers']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Config: any = McpServerSchema

/**
 * Register the configured server while this row is active.
 * @param rawCtx - row context with the catalog service.
 * @param config - resolved server configuration.
 */
export async function apply(rawCtx: unknown, config: McpServerConfig): Promise<void> {
  const ctx = rawCtx as HarnessContext & { reaGatewayServers: ReaGatewayService }
  let dispose: (() => Promise<void>) | undefined
  let disposed = false
  ctx.effect(() => () => {
    disposed = true
    void dispose?.()
  }, `rea-gateway.server(${config.name})`)
  const remove = await ctx.reaGatewayServers.addMcpServer(config)
  if (disposed) await remove()
  else dispose = remove
}
