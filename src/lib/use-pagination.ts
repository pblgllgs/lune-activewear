import { useEffect, useMemo, useState } from "react";

interface UsePaginationOptions {
  /** Cantidad de elementos por página. */
  pageSize?: number;
  /**
   * Valor que, al cambiar, devuelve la lista a la primera página.
   * Úsalo con búsquedas, filtros u ordenamientos.
   */
  resetKey?: unknown;
}

/**
 * Paginación local para listas y tablas.
 *
 * Devuelve solo la página visible y ajusta la página actual si la lista
 * se achica (por ejemplo, al aplicar un filtro o eliminar el último elemento).
 */
export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { pageSize: initialPageSize = 12, resetKey } = options;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Página efectiva: evita mostrar una página vacía entre el render y el efecto
  // cuando cambian los filtros o se elimina el último elemento de la página.
  const currentPage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total,
    pageItems,
  };
}
