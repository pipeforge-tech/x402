import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { InfrastructureInspector } from './inspector.js';
import { SafeNetworkInspector } from './network.js';
import { SafeDnsResolver } from './resolver.js';

const config = loadConfig();
const resolver = new SafeDnsResolver();
const inspector = new InfrastructureInspector(
  resolver,
  new SafeNetworkInspector(resolver, config.timeoutMs, config.maxRedirects),
);
const app = createApp(config, inspector);

const server = serve({ fetch: app.fetch, port: config.port }, info => {
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'server_started',
    port: info.port,
    network: config.network,
    payments_enabled: config.paymentsEnabled,
  }));
});

function shutdown(signal: string): void {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), event: 'server_stopping', signal }));
  server.close(error => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
