import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildOpenIdeasSpawnSpec, resolveOpenIdeasRuntime } from '@/process/services/openIdeasSidecar';

describe('resolveOpenIdeasRuntime', () => {
  it('resolves the packaged runtime for the current target', () => {
    const root = '/Applications/Ideas.app/Contents/Resources';
    const result = resolveOpenIdeasRuntime({
      resourcesPath: root,
      platform: 'darwin',
      arch: 'arm64',
      pathExists: () => true,
    });

    expect(result?.directory).toBe(join(root, 'bundled-openideas', 'darwin-arm64'));
    expect(result?.executable).toBe(join(result!.directory, 'bin', 'node'));
    expect(result?.entrypoint).toBe(join(result!.directory, 'server', 'bin', 'run'));
  });

  it('returns null when the runtime is incomplete', () => {
    expect(
      resolveOpenIdeasRuntime({
        resourcesPath: '/missing',
        platform: 'darwin',
        arch: 'arm64',
        pathExists: () => false,
      })
    ).toBeNull();
  });
});

describe('buildOpenIdeasSpawnSpec', () => {
  it('binds the desktop service to loopback and isolates its persistent data', () => {
    const runtime = {
      directory: '/runtime',
      executable: '/runtime/bin/node',
      entrypoint: '/runtime/server/bin/run',
    };
    const spec = buildOpenIdeasSpawnSpec(runtime, '/data/openideas');

    expect(spec.command).toBe(runtime.executable);
    expect(spec.args).toEqual([runtime.entrypoint, 'start']);
    expect(spec.env.HOST).toBe('127.0.0.1');
    expect(spec.env.DATABASE_PATH).toBe('/data/openideas');
    expect(spec.env.FLOWISE_DESKTOP_EMBEDDED).toBe('true');
    expect(spec.env.CORS_ORIGINS).toBe('null');
    expect(spec.env.CORS_ALLOW_CREDENTIALS).toBe('true');
    expect(spec.env.SECURE_COOKIES).toBe('false');
  });
});
