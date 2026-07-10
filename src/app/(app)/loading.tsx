/** Estado de carga con skeleton (4a). Se muestra mientras el servidor resuelve
 * los datos (sobre todo con fuentes en vivo). Bloques con shimmer, no spinner. */
export default function AppLoading() {
  const bar = 'animate-shimmer rounded bg-bg-raised motion-reduce:animate-none';
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-base">
      {/* cabecera */}
      <div className="flex h-[50px] flex-none items-center gap-2.5 border-b px-screen">
        <div className={`${bar} h-6 w-6 rounded-[5px]`} />
        <div className={`${bar} h-4 w-32`} />
      </div>
      {/* KPIs */}
      <div className="flex flex-none gap-px border-b bg-bg-raised">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 px-screen py-2.5">
            <div className={`${bar} mb-2 h-2 w-14`} />
            <div className={`${bar} h-6 w-12`} />
          </div>
        ))}
      </div>
      {/* zona principal */}
      <div className={`${bar} m-screen min-h-0 flex-1 rounded-card`} />
      {/* filas */}
      <div className="flex-none px-screen pb-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5 border-t border-subtle py-[11px]">
            <div className={`${bar} h-3 w-3 flex-none rounded-full`} />
            <div className="flex-1">
              <div className={`${bar} mb-1.5 h-3 w-32`} />
              <div className={`${bar} h-2 w-20`} />
            </div>
            <div className={`${bar} h-3 w-12`} />
          </div>
        ))}
      </div>
    </div>
  );
}
