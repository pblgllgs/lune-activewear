import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { Loader2, Mail, MessageCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { getAuthSettings, saveMagicLinkEnabled } from "@/lib/auth-settings";
import { formatWhatsAppDisplay, normalizeWhatsAppNumber, setWhatsAppNumber } from "@/lib/contact";
import { db } from "@/lib/firebase";
import { getSiteContent } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Ajustes del sitio y acceso de las clientas (Admin → Ajustes).
 */
export function AuthSettings() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [whatsappNumber, setWhatsappNumberInput] = useState("");
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    getSiteContent()
      .then((content) => {
        if (!cancelled) setWhatsappNumberInput(content.whatsappNumber || "");
      })
      .finally(() => {
        if (!cancelled) setLoadingWhatsApp(false);
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

  const saveWhatsApp = async () => {
    if (!db) {
      toast.error("Firebase no está configurado.");
      return;
    }
    const normalized = normalizeWhatsAppNumber(whatsappNumber);
    if (normalized.length < 8) {
      toast.error("Ingresa un número de WhatsApp válido (con código de país).");
      return;
    }
    setSavingWhatsApp(true);
    try {
      await setDoc(
        doc(db, "settings", "site"),
        { whatsappNumber: normalized, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setWhatsAppNumber(normalized);
      setWhatsappNumberInput(normalized);
      toast.success("Número de WhatsApp actualizado.");
    } catch {
      toast.error("No se pudo guardar el número de WhatsApp.");
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const preview = formatWhatsAppDisplay(whatsappNumber);

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <MessageCircle className="h-4 w-4" /> Contacto por WhatsApp
          </CardTitle>
          <CardDescription>
            Número usado en los botones de WhatsApp, el pie de página, contacto y los mensajes de
            pedido. Se guarda en la configuración del sitio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">Número de WhatsApp</Label>
            <Input
              id="whatsapp-number"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumberInput(e.target.value)}
              placeholder="56957592973"
              inputMode="tel"
              disabled={loadingWhatsApp || savingWhatsApp}
            />
            <p className="text-[11px] text-muted-foreground">
              Incluye el código de país (Chile: 56). Solo se guardan los dígitos.
              {preview ? ` Se mostrará como ${preview}.` : ""}
            </p>
          </div>
          <Button type="button" onClick={() => void saveWhatsApp()} disabled={loadingWhatsApp || savingWhatsApp}>
            {savingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar número
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
