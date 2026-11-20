import { useEffect, useMemo, useState } from "react";
import { Crown, MailPlus, Power, PowerOff, Shield, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  isSuperAdminEmail,
  LEGACY_ADMIN_EMAILS,
  normalizeEmail,
  SUPER_ADMIN_EMAIL,
} from "@/lib/admin";
import {
  getAdminAccess,
  saveAdminAccess,
  subscribeAdminAccess,
  type ManagedAdmin,
} from "@/lib/admin-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface AdminsManagerProps {
  /** Correo del usuario autenticado (debe ser el super admin). */
  actorEmail: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AdminsManager({ actorEmail }: AdminsManagerProps) {
  const [managedAdmins, setManagedAdmins] = useState<ManagedAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");

  const isSuper = isSuperAdminEmail(actorEmail);

  useEffect(() => {
    if (!isSuper) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeAdminAccess((access) => {
      setManagedAdmins(access.admins);
      setLoading(false);
    });
    return unsubscribe;
  }, [isSuper]);

  const legacyEmails = useMemo(
    () =>
      Array.from(
        new Set(
          LEGACY_ADMIN_EMAILS.map(normalizeEmail).filter(
            (email) => email && !isSuperAdminEmail(email)
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    []
  );

  const managedByEmail = useMemo(
    () => new Map(managedAdmins.map((admin) => [admin.email, admin])),
    [managedAdmins]
  );

  const allEmails = useMemo(() => {
    const unique = new Set<string>([...legacyEmails, ...managedAdmins.map((a) => a.email)]);
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [legacyEmails, managedAdmins]);

  const canAdd = useMemo(() => {
    const email = normalizeEmail(draft);
    if (!email || !isValidEmail(email)) return false;
    if (isSuperAdminEmail(email)) return false;
    return !allEmails.includes(email);
  }, [draft, allEmails]);

  const persist = async (nextAdmins: ManagedAdmin[], successMessage: string) => {
    if (!isSuper) {
      toast.error("Solo el super admin puede administrar los accesos.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAdminAccess(nextAdmins, actorEmail);
      setManagedAdmins(saved.admins);
      toast.success(successMessage);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la lista de administradores."
      );
      const fresh = await getAdminAccess();
      setManagedAdmins(fresh.admins);
    } finally {
      setSaving(false);
    }
  };

  const addAdmin = async () => {
    const email = normalizeEmail(draft);
    if (!isValidEmail(email)) {
      toast.error("Ingresa un correo electrónico válido.");
      return;
    }
    if (isSuperAdminEmail(email)) {
      toast.error("El super admin ya tiene acceso y no se agrega a la lista.");
      return;
    }
    if (allEmails.includes(email)) {
      toast.error("Ese correo ya es administrador.");
      return;
    }
    await persist(
      [...managedAdmins, { email, active: true }],
      `Se agregó ${email} como administrador.`
    );
    setDraft("");
  };

  const toggleAdmin = async (email: string) => {
    const current = managedByEmail.get(email);
    const isLegacy = legacyEmails.includes(email);
    const currentActive = current ? current.active : isLegacy;
    const nextActive = !currentActive;

    let nextAdmins: ManagedAdmin[];
    if (current) {
      nextAdmins = managedAdmins.map((admin) =>
        admin.email === email ? { ...admin, active: nextActive } : admin
      );
    } else {
      // Admin de respaldo (.env) sin registro en panel: se crea anulación explícita.
      nextAdmins = [...managedAdmins, { email, active: nextActive }];
    }

    await persist(
      nextAdmins,
      nextActive ? `Se activó el acceso de ${email}.` : `Se desactivó el acceso de ${email}.`
    );
  };

  const removeManaged = async (email: string) => {
    const isLegacy = legacyEmails.includes(email);
    const current = managedByEmail.get(email);
    const result = await Swal.fire({
      title: "¿Quitar de la lista administrada?",
      text: isLegacy
        ? current && !current.active
          ? `${email} tiene acceso por respaldo (.env). Al quitar la anulación del panel volverá a tener acceso (según variables de entorno).`
          : `${email} tiene acceso por respaldo (.env). Se quitará el registro del panel, pero seguirá teniendo acceso mientras esté en las variables de entorno.`
        : `Se eliminará ${email} de la lista administrada. Podrás volver a agregarlo cuando quieras.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar de la lista",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8f3f38",
    });
    if (!result.isConfirmed) return;
    await persist(
      managedAdmins.filter((admin) => admin.email !== email),
      `Se quitó ${email} de la lista administrada.`
    );
  };

  if (!isSuper) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Administradores
          </CardTitle>
          <CardDescription>
            Solo el super admin puede administrar los accesos al panel.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Administradores del panel
          </CardTitle>
          <CardDescription>
            Activa o desactiva administradores sin perderlos de la lista. Los cambios aplican al
            iniciar sesión y en los permisos del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-secondary/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                  Super admin
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="font-medium break-all">{SUPER_ADMIN_EMAIL}</p>
                  <Badge className="gap-1">
                    <Crown className="h-3 w-3" /> Super admin
                  </Badge>
                  <Badge>Activo</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Configurado por la variable de entorno <code>VITE_SUPER_ADMIN_EMAIL</code> (con
                  valor por defecto). Siempre tiene acceso y puede gestionar a los demás.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <Label htmlFor="new-admin-email">Agregar administrador</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Ingresa el correo que podrá acceder al panel. Quedará activo y podrás desactivarlo
                sin eliminarlo.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="new-admin-email"
                type="email"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="correo@ejemplo.com"
                className="h-10 sm:max-w-sm"
                autoComplete="off"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (canAdd && !saving) void addAdmin();
                  }
                }}
              />
              <Button type="button" onClick={() => void addAdmin()} disabled={!canAdd || saving}>
                <MailPlus className="h-4 w-4" />
                {saving ? "Guardando…" : "Agregar"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Administradores adicionales</p>
              <Badge variant="secondary">{allEmails.length}</Badge>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando administradores…</p>
            ) : allEmails.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No hay administradores adicionales. Solo el super admin tiene acceso.
              </div>
            ) : (
              <ul className="divide-y rounded-lg border">
                {allEmails.map((email) => {
                  const managed = managedByEmail.get(email);
                  const isLegacy = legacyEmails.includes(email);
                  const isActive = managed ? managed.active : isLegacy;

                  return (
                    <li
                      key={email}
                      className={cn(
                        "flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between",
                        !isActive && "bg-muted/30"
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                          {isActive ? (
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <PowerOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "truncate text-sm font-medium",
                                !isActive && "text-muted-foreground"
                              )}
                            >
                              {email}
                            </span>
                            <Badge variant={isActive ? "default" : "outline"}>
                              {isActive ? "Activo" : "Inactivo"}
                            </Badge>
                            {isLegacy && <Badge variant="secondary">Respaldo (.env)</Badge>}
                            {managed && !isLegacy && <Badge variant="secondary">Panel</Badge>}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {managed
                              ? isActive
                                ? isLegacy
                                  ? "Acceso activo (incluye respaldo por entorno). Puedes desactivarlo desde el panel."
                                  : "Tiene acceso al panel. Puedes desactivarlo sin eliminarlo."
                                : "Acceso desactivado desde el panel. Se mantiene en la lista y puedes reactivarlo."
                              : "Acceso otorgado por variables de entorno. Puedes desactivarlo desde el panel."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
                          <Power className="h-3.5 w-3.5 text-muted-foreground" />
                          <Label
                            htmlFor={`active-${email}`}
                            className="cursor-pointer text-xs font-normal"
                          >
                            {isActive ? "Activo" : "Inactivo"}
                          </Label>
                          <Switch
                            id={`active-${email}`}
                            checked={isActive}
                            onCheckedChange={() => void toggleAdmin(email)}
                            disabled={saving}
                            aria-label={`${isActive ? "Desactivar" : "Activar"} a ${email}`}
                          />
                        </div>
                        {managed && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => void removeManaged(email)}
                            disabled={saving}
                            title={isLegacy ? "Quitar anulación/registro del panel" : "Quitar de la lista administrada"}
                          >
                            <Trash2 className="h-4 w-4" /> Quitar de la lista
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
