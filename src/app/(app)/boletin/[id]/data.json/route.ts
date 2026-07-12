import { getBoletin, listBoletines } from '@/lib/boletin/store';

/**
 * Datos crudos de una edición en JSON, para reutilización (periodismo de datos,
 * verificación, citación). URL estable `/boletin/{id}/data.json`. Estático: lee
 * el sistema de ficheros del repo (disponible solo en build). CC BY 4.0 (EFFIS)
 * / dominio público (NASA FIRMS) — ver /fuentes.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return listBoletines().map((b) => ({ id: b.id }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = getBoletin(id);
  if (!b) {
    return new Response(JSON.stringify({ error: 'edición no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  return new Response(JSON.stringify(b, null, 2) + '\n', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `inline; filename="incendib-${b.id}.json"`,
    },
  });
}
