import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// unresolved components are only runtime warnings in Nuxt.
const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.nuxt', '.output', 'test'].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (path.endsWith('.vue')) found.push(path);
  }
  return found;
}

const pascal = (value: string) =>
  value
    .split(/[-_.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

function componentName(file: string): string {
  const parts = relative(join(root, 'components'), file).replace(/\.vue$/, '').split(sep);
  return parts.reduce((name, part) => {
    const next = pascal(part);
    return next.startsWith(name) ? next : name + next;
  }, '');
}

const BUILT_IN = new Set(['Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense', 'Component', 'NuxtLink', 'NuxtPage', 'NuxtLayout', 'ClientOnly', 'RouterView', 'RouterLink']);

describe('component names in templates', () => {
  const registered = new Set(walk(join(root, 'components')).map(componentName));

  it('registers the components the way Nuxt does', () => {
    expect(registered).toContain('AnnouncementCard');
    expect(registered).toContain('AnnouncementLocationPicker');
    expect(registered).toContain('LoginMain');
    expect(registered).toContain('RegistrationChooseRole');
    expect(registered).toContain('AppButton');
  });

  it('every component used in a template exists', () => {
    const generated = join(root, '.nuxt', 'components.d.ts');
    const known = new Set(registered);
    if (existsSync(generated)) for (const [, name] of readFileSync(generated, 'utf8').matchAll(/export const (\w+):/g)) known.add(name);

    const unresolved: string[] = [];
    for (const file of walk(root)) {
      const source = readFileSync(file, 'utf8');
      const template = source.match(/<template>([\s\S]*)<\/template>\s*(?:<style|$)/)?.[1] ?? '';
      for (const [, tag] of template.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) {
        if (!known.has(tag) && !BUILT_IN.has(tag)) unresolved.push(`${relative(root, file)}: <${tag}>`);
      }
    }
    expect([...new Set(unresolved)]).toEqual([]);
  });
});
