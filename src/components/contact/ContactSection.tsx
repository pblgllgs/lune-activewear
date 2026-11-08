import { useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { EMAIL, LOCATION, WHATSAPP_DISPLAY, whatsappLink } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REASONS = ["Consulta general", "Estado de mi pedido", "Cambio o devolución", "Colaboración"];

export function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ingresa tu nombre.");
      return;
    }
    const lines = ["Hola Luné! Tengo una consulta.", `Nombre: ${name.trim()}`];
    if (email.trim()) lines.push(`Correo: ${email.trim()}`);
    if (phone.trim()) lines.push(`Teléfono: ${phone.trim()}`);
    if (reason) lines.push(`Motivo: ${reason}`);
    if (message.trim()) lines.push(`Mensaje: ${message.trim()}`);

    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
    toast.success("Abriendo WhatsApp para enviar tu consulta.");
  };

  return (
    <section id="contacto" className="scroll-mt-24 bg-secondary/60 py-20">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-[11px] uppercase tracking-brand text-muted-foreground">Estamos para ti</p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
              ¿Te ayudamos a elegir?
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              Escríbenos y te asesoramos con tallas, colores y disponibilidad. También coordinamos
              entregas y retiros en Chillán.
            </p>

            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                  <Phone className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                    Teléfono / WhatsApp
                  </p>
                  <p className="font-medium">{WHATSAPP_DISPLAY}</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Correo</p>
                  <p className="font-medium">{EMAIL}</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">Ubicación</p>
                  <p className="font-medium">{LOCATION}</p>
                </div>
              </li>
            </ul>

            <a
              href={whatsappLink("Hola Luné! Quiero información sobre sus prendas.")}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-[11px] font-medium uppercase tracking-wider2 text-primary-foreground transition hover:bg-primary/90"
            >
              <MessageCircle className="h-4 w-4" /> Escribir por WhatsApp
            </a>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 md:p-8">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Correo</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@mail.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 ..." />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Motivo</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cuéntanos qué necesitas..."
                rows={4}
              />
            </div>
            <Button type="submit" className="mt-6 w-full">
              <Send className="h-4 w-4" /> Enviar por WhatsApp
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
