import { CreditCard, MapPin, Truck } from "lucide-react";

const items = [
  { icon: Truck, text: "Envío gratis en compras sobre $50.000" },
  { icon: CreditCard, text: "Efectivo y transferencias" },
  { icon: MapPin, text: "Retiro gratis en Chillán" },
];

export function AnnouncementBar() {
  return (
    <div className="overflow-hidden bg-primary py-2.5 text-primary-foreground">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {[0, 1].map((group) => (
          <div key={group} className="flex items-center">
            {Array.from({ length: 4 }).flatMap((_, j) => {
              const item = items[j % items.length];
              return (
                <span
                  key={`${group}-${j}`}
                  className="flex items-center gap-2 px-8 text-[10px] uppercase tracking-wider2"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
