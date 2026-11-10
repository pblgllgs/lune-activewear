import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { getAuthSettings, saveMagicLinkEnabled } from "@/lib/auth-settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Ajustes de acceso de las clientas. El admin conserva siempre su ingreso con
 * correo y contraseña; este interruptor solo afecta el enlace mágico.
 */
export function AuthSettings() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAuthSettings()
      .then((settings) => {
        if (!cancelled) setEnabled(settings.magicLinkEnabled);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    try {
      await saveMagicLinkEnabled(next);
      setEnabled(next);
      toast.success(next ? "Enlace mágico activado." : "Enlace mágico desactivado.");
    } catch {
      toast.error("No se pudo guardar el ajuste.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Mail className="h-4 w-4" /> Acceso de clientas
        </CardTitle>
        <CardDescription>
          Permite que las clientas entren a «Mi cuenta» con un enlace enviado a su correo.
          El acceso del panel de administración no cambia: sigue con correo y contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Enlace mágico por correo</p>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Leyendo el ajuste…"
                : enabled
                  ? "Activo: la clienta puede pedir su enlace en /cuenta."
                  : "Desactivado: /cuenta no ofrece el enlace."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            role="switch"
            aria-checked={enabled}
            aria-label="Activar enlace mágico por correo"
            disabled={loading || saving}
            onClick={() => void toggle()}
            className={cn(
              "relative h-8 w-14 shrink-0 rounded-full border p-0 transition",
              enabled ? "border-primary bg-primary" : "border-border bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background shadow transition-all",
                enabled ? "left-8" : "left-1"
              )}
            />
            {saving && <Loader2 className="mx-auto h-3 w-3 animate-spin" />}
          </Button>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Este interruptor controla la aplicación. Para cortar el proveedor por completo hay
          que deshabilitar «Email link» en Firebase Console → Authentication → Sign-in method.
          El enlace caduca en 1 hora y es de un solo uso.
        </p>
      </CardContent>
    </Card>
  );
}
