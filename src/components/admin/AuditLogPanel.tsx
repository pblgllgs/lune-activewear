import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  ChevronDown,
  Download,
  History,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  auditActionLabel,
  auditEntityLabel,
  subscribeAuditLogs,
} from "@/lib/audit";
import { usePagination } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@/types/audit";

const PERIODS = [
  { value: "all", label: "Todo el historial" },
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  client: "Clienta",
  system: "Sistema",
};

const SOURCE_LABELS: Record<string, string> = {
  admin: "Panel admin",
  web: "Tienda web",
  system: "Sistema",
};

function formatDateTime(value: Date | null, fallback?: string): string {
  const date = value ?? (fallback ? new Date(fallback) : null);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const json = JSON.stringify(value);
    return json.length > 180 ? `${json.slice(0, 180)}…` : json;
  } catch {
    return String(value);
  }
}

function csvCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function logTime(log: AuditLog): number {
  if (log.timestamp) return log.timestamp.getTime();
  if (log.createdAt) {
    const date = new Date(log.createdAt);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
  return 0;
}

function AuditRow({
  log,
  expanded,
  onToggle,
}: {
  log: AuditLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const changes = log.changes ? Object.entries(log.changes) : [];
  const metadataEntries = log.metadata ? Object.entries(log.metadata) : [];

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div className={cn("rounded-lg border transition-colors", expanded && "bg-secondary/30")}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer flex-wrap items-start gap-3 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            log.actorRole === "admin"
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-muted-foreground"
          )}
        >
          {log.actorRole === "admin" ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <UserRound className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={log.actorRole === "admin" ? "default" : "secondary"}>
              {auditActionLabel(log.action)}
            </Badge>
            <span className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
              {auditEntityLabel(log.entity)}
            </span>
            {log.entityLabel && (
              <span className="max-w-full truncate text-xs font-medium">{log.entityLabel}</span>
            )}
          </div>
          <p className="mt-1 text-sm">{log.summary}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {log.actorName}
            {log.actorEmail ? ` · ${log.actorEmail}` : ""} ·{" "}
            {formatDateTime(log.timestamp, log.createdAt)}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </div>

      {expanded && (
        <div className="space-y-3 border-t px-3 py-3 text-xs">
          <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Rol</dt>
              <dd className="mt-0.5">{ROLE_LABELS[log.actorRole] ?? log.actorRole}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Origen</dt>
              <dd className="mt-0.5">{SOURCE_LABELS[log.source] ?? log.source}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                Identificador
              </dt>
              <dd className="mt-0.5 break-all font-mono text-[11px]">
                {log.entityId || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider2 text-muted-foreground">UID</dt>
              <dd className="mt-0.5 break-all font-mono text-[11px]">{log.actorUid || "—"}</dd>
            </div>
          </dl>

          {changes.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Cambios</p>
              <div className="mt-1 overflow-x-auto rounded-md border">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-secondary/60 text-[10px] uppercase tracking-wider2 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Campo</th>
                      <th className="px-2 py-1.5 font-medium">Antes</th>
                      <th className="px-2 py-1.5 font-medium">Después</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map(([field, change]) => (
                      <tr key={field} className="border-t align-top">
                        <td className="px-2 py-1.5 font-medium">{field}</td>
                        <td className="max-w-[18rem] px-2 py-1.5 text-muted-foreground">
                          <span title={formatValue(change.before)}>{formatValue(change.before)}</span>
                        </td>
                        <td className="max-w-[18rem] px-2 py-1.5">
                          <span title={formatValue(change.after)}>{formatValue(change.after)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {metadataEntries.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                Datos adicionales
              </p>
              <pre className="mt-1 max-h-56 overflow-auto rounded-md bg-secondary/50 p-2 text-[11px] leading-relaxed">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("all");
  const [role, setRole] = useState("all");
  const [period, setPeriod] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAuditLogs(
      (next) => {
        setLogs(next);
        setError("");
        setLoading(false);
      },
      {
        max: 500,
        onError: (nextError) => {
          setError(nextError.message || "No se pudo leer el registro de auditoría.");
          setLoading(false);
        },
      }
    );
    return unsubscribe;
  }, []);

  const actionOptions = useMemo(
    () =>
      Object.keys(AUDIT_ACTION_LABELS).sort((a, b) =>
        auditActionLabel(a).localeCompare(auditActionLabel(b), "es")
      ),
    []
  );

  const entityOptions = useMemo(
    () =>
      Object.keys(AUDIT_ENTITY_LABELS).sort((a, b) =>
        auditEntityLabel(a).localeCompare(auditEntityLabel(b), "es")
      ),
    []
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minTime =
      period === "today"
        ? today.getTime()
        : period === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : period === "30d"
            ? now - 30 * 24 * 60 * 60 * 1000
            : null;

    return logs.filter((log) => {
      if (action !== "all" && log.action !== action) return false;
      if (entity !== "all" && log.entity !== entity) return false;
      if (role !== "all" && log.actorRole !== role) return false;
      if (minTime !== null && logTime(log) < minTime) return false;
      if (!term) return true;

      return [
        log.actorName,
        log.actorEmail,
        log.actorUid,
        log.action,
        auditActionLabel(log.action),
        log.entity,
        auditEntityLabel(log.entity),
        log.entityLabel,
        log.entityId,
        log.summary,
        JSON.stringify(log.metadata ?? {}),
        JSON.stringify(log.changes ?? {}),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [logs, search, action, entity, role, period]);

  const pagination = usePagination(filtered, {
    pageSize: 15,
    resetKey: `${search}|${action}|${entity}|${role}|${period}`,
  });

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      today: logs.filter((log) => logTime(log) >= today.getTime()).length,
      actors: new Set(logs.map((log) => log.actorUid || log.actorEmail || log.actorName)).size,
      last: logs[0] ?? null,
    };
  }, [logs]);

  const exportCsv = () => {
    const headers = [
      "Fecha y hora",
      "Usuario",
      "Correo",
      "Rol",
      "Acción",
      "Entidad",
      "Elemento",
      "Identificador",
      "Resumen",
      "Origen",
      "Cambios",
      "Datos adicionales",
    ];
    const rows = filtered.map((log) => [
      formatDateTime(log.timestamp, log.createdAt),
      log.actorName,
      log.actorEmail,
      ROLE_LABELS[log.actorRole] ?? log.actorRole,
      auditActionLabel(log.action),
      auditEntityLabel(log.entity),
      log.entityLabel ?? "",
      log.entityId ?? "",
      log.summary,
      SOURCE_LABELS[log.source] ?? log.source,
      log.changes ?? "",
      log.metadata ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria-lune-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{logs.length}</CardTitle>
            <CardDescription>Acciones cargadas (máx. 500 recientes)</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{metrics.today}</CardTitle>
            <CardDescription>Acciones registradas hoy</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{metrics.actors}</CardTitle>
            <CardDescription>Usuarios distintos</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {metrics.last
                ? formatDateTime(metrics.last.timestamp, metrics.last.createdAt)
                : "—"}
            </CardTitle>
            <CardDescription>Última acción registrada</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <History className="h-4 w-4" /> Registro de actividad
              </CardTitle>
              <CardDescription>
                Quién hizo cada acción, qué cambió y cuándo. Se actualiza en vivo y se guarda en
                Firestore (`auditLogs`). Las acciones de invitadas sin sesión no se registran.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por usuario, acción, producto o detalle…"
                className="pl-9"
                aria-label="Buscar en el registro de auditoría"
              />
            </div>

            <Select value={action} onValueChange={setAction}>
              <SelectTrigger aria-label="Filtrar por acción">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {actionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {auditActionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger aria-label="Filtrar por entidad">
                <SelectValue placeholder="Entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las entidades</SelectItem>
                {entityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {auditEntityLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={role} onValueChange={setRole}>
              <SelectTrigger aria-label="Filtrar por rol">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="client">Clienta</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger aria-label="Filtrar por fecha" className="md:col-span-2 xl:col-span-1">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando registro de auditoría.
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p>{error}</p>
              <p className="text-xs">
                Revisa que las reglas de Firestore permitan leer `auditLogs` al administrador.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <History className="h-5 w-5" />
              <p>
                {logs.length === 0
                  ? "Todavía no hay acciones registradas."
                  : "No hay acciones que coincidan con los filtros."}
              </p>
              <p className="text-xs">
                Las próximas acciones del panel, los pedidos y los comentarios aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pagination.pageItems.map((log) => (
                <AuditRow
                  key={log.id}
                  log={log}
                  expanded={expanded === log.id}
                  onToggle={() => setExpanded((current) => (current === log.id ? null : log.id))}
                />
              ))}
            </div>
          )}

          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={[10, 15, 25, 50]}
            itemLabel="acciones"
          />
        </CardContent>
      </Card>
    </div>
  );
}
