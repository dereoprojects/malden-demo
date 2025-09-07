import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const g = globalThis as any;
if (!g.__otelNodeSDK__) {
  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318';
  const url = base.endsWith('/v1/traces') ? base : `${base.replace(/\/$/, '')}/v1/traces`;

  const resource = defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'madlen-web',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '0.0.0',
    })
  );

  const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({ url }),
    instrumentations: [
      new HttpInstrumentation(),
      new UndiciInstrumentation(),
    ],
  });

  sdk.start();
  g.__otelNodeSDK__ = sdk;
}
