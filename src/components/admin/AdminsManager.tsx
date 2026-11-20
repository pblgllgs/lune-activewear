import { useEffect, useMemo, useState } from "react";
import { Crown, MailPlus, Shield, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { isSuperAdminEmail, normalizeEmail, SUPER_ADMIN_EMAIL } from "@/lib/admin";
import { getAdminAccess, saveAdminAccess, subscribeAdminAccess } from "@/lib/admin-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminsManagerProps {
  /** Correo del usuario autenticado (debe ser el super admin). */
  actorEmail: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AdminsManager({ actorEmail }: AdminsManagerProps) {
  const [emails, setEmails] = useState<string[]>([]);
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
      setEmails(access.emails);
      setLoading(false);
    });
    return unsubscribe;
  }, [isSuper]);

  const canAdd = useMemo(() => {
    const email = normalizeEmail(draft);
    if (!email || !isValidEmail(email)) return false;
    if (isSuperAdminEmail(email)) return false;
    return !emails.includes(email);
  }, [draft, emails]);

  const persist = async (nextEmails: string[], successMessage: string) => {
    if (!isSuper) {
      toast.error("Solo el super admin puede administrar los accesos.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAdminAccess(nextEmails, actorEmail);
      setEmails(saved.emails);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la lista de administradores.");
      // Re-sincroniza por si otro cliente modificó el documento.
      const fresh = await getAdminAccess();
      setEmails(fresh.emails);
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
    if (emails.includes(email)) {
      toast.error("Ese correo ya es administrador.");
      return;
    }
    await persist([...emails, email], `Se agregó ${email} como administrador.`);
    setDraft("");
  };

  const removeAdmin = async (email: string) => {
    const result = await Swal.fire({
      title: "¿Quitar administrador?",
      text: `${email} perderá acceso al panel de administración.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar acceso",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8f3f38",
    });
    if (!result.isConfirmed) return;
    await persist(emails.filter((item) => item !== email), `Se quitó el acceso de ${email}.`);
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
            El super admin puede agregar o quitar administradores. Los cambios aplican al
            iniciar sesión (y en las reglas/permisos del sistema).
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
                Ingresa el correo Google/cuenta que podrá acceder al panel de administración.
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
              <Button
                type="button"
                onClick={() => void addAdmin()}
                disabled={!canAdd || saving}
              >
                <MailPlus className="h-4 w-4" />
                {saving ? "Guardando…" : "Agregar"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Administradores adicionales</p>
              <Badge variant="secondary">{emails.length}</Badge>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando administradores…</p>
            ) : emails.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No hay administradores adicionales. Solo el super admin tiene acceso.
              </div>
            ) : (
              <ul className="divide-y rounded-lg border">
                {emails.map((email) => (
                  <li key={email} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="truncate text-sm font-medium">{email}</span>
                      <Badge variant="outline">Admin</Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start text-destructive hover:text-destructive sm:justify-center"
                      onClick={() => void removeAdmin(email)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" /> Quitar acceso
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
