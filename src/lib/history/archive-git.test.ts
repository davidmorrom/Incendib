import { describe, it, expect } from 'vitest';
import { readArchivedFireGit, listArchivedGitSlugs } from './archive-git';

describe('readArchivedFireGit', () => {
  it('rechaza slugs con caracteres inválidos (anti path-traversal)', () => {
    expect(readArchivedFireGit('../../etc/passwd')).toBeNull();
    expect(readArchivedFireGit('foo/bar')).toBeNull();
    expect(readArchivedFireGit('foo.bar')).toBeNull();
    expect(readArchivedFireGit('Foo Bar')).toBeNull();
  });

  it('devuelve null para un slug válido inexistente', () => {
    expect(readArchivedFireGit('no-existe-9999')).toBeNull();
  });

  it('lee y parsea un fire archivado real (con coordenadas para el mapa)', () => {
    const fire = readArchivedFireGit('cyl-canseco-24-323-26');
    expect(fire).not.toBeNull();
    expect(fire?.slug).toBe('cyl-canseco-24-323-26');
    expect(Array.isArray(fire?.coordinates)).toBe(true);
    expect(fire?.coordinates).toHaveLength(2);
  });
});

describe('listArchivedGitSlugs', () => {
  it('devuelve un array que incluye los slugs archivados', () => {
    const slugs = listArchivedGitSlugs();
    expect(Array.isArray(slugs)).toBe(true);
    expect(slugs).toContain('cyl-canseco-24-323-26');
  });
});
