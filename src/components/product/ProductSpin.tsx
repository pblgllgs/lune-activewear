import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

/**
 * Giro de 180° con dos fotos (frente y espalda) de la misma prenda.
 *
 * Es CSS 3D puro: no hay modelo ni librería de 3D. Las fotos deben venir
 * recortadas y alineadas (ver `scripts/cutout-photos.py`), porque comparten el
 * mismo lienzo y se intercambian al girar la tarjeta.
 *
 * Se usa en la ficha de producto como última diapositiva del carrusel.
 */
const SNAP = 90;

export interface ProductSpinHandle {
  showFront: () => void;
  showBack: () => void;
}

interface ProductSpinProps {
  front: string;
  back: string;
  /** Nombre del producto para los textos alternativos. */
  alt?: string;
  className?: string;
  /** Sello con la cara visible (Frente / Espalda). */
  sideLabel?: boolean;
  /** Pista «Arrastra para girar»; desaparece al primer movimiento. */
  hint?: boolean;
  /** Avisa de la cara visible, para reflejarla en controles externos. */
  onSideChange?: (side: "Frente" | "Espalda") => void;
}

export const ProductSpin = forwardRef<ProductSpinHandle, ProductSpinProps>(
  function ProductSpin(
    {
      front,
      back,
      alt = "Vista del producto",
      className = "",
      sideLabel = true,
      hint = true,
      onSideChange,
    },
    ref
  ) {
    const [angle, setAngle] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [touched, setTouched] = useState(false);
    const drag = useRef<{ x: number; start: number } | null>(null);

    const side = Math.abs(angle) >= SNAP ? "Espalda" : "Frente";
    const clamp = (value: number) => Math.max(-180, Math.min(180, value));

    useEffect(() => {
      onSideChange?.(side);
    }, [side, onSideChange]);

    useImperativeHandle(
      ref,
      () => ({
        showFront: () => setAngle(0),
        showBack: () => setAngle((value) => (value <= 0 ? -180 : 180)),
      }),
      []
    );

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { x: event.clientX, start: angle };
      setDragging(true);
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (!current) return;
      if (!touched) setTouched(true);
      setAngle(clamp(current.start + (event.clientX - current.x) * 0.8));
    };

    const endDrag = () => {
      if (!drag.current) return;
      drag.current = null;
      setDragging(false);
      // Se queda en la cara más cercana.
      setAngle((value) => (Math.abs(value) >= SNAP ? Math.sign(value) * 180 : 0));
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      setTouched(true);
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setAngle((value) => (Math.abs(value) >= SNAP ? 0 : direction * 180));
    };

    return (
      <div
        role="group"
        aria-label={`${alt}: vista ${side.toLowerCase()}. Arrastra o usa las flechas para girar.`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={`relative touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        } ${className}`}
        style={{ perspective: "1400px" }}
      >
        <div
          className="relative h-full w-full [transform-style:preserve-3d]"
          style={{
            transform: `rotateY(${angle}deg)`,
            transition: dragging ? "none" : "transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <img
            src={front}
            alt={`${alt} — vista frontal`}
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain [backface-visibility:hidden] [filter:drop-shadow(0_18px_26px_rgba(73,55,45,0.18))]"
          />
          <img
            src={back}
            alt={`${alt} — vista trasera`}
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain [backface-visibility:hidden] [transform:rotateY(180deg)] [filter:drop-shadow(0_18px_26px_rgba(73,55,45,0.18))]"
          />
        </div>

        {sideLabel && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full border bg-background/80 px-2.5 py-1 text-[10px] uppercase tracking-wider2 text-muted-foreground backdrop-blur">
            {side}
          </span>
        )}
        {hint && (
          <span
            className={`pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[10px] uppercase tracking-wider2 text-muted-foreground transition-opacity ${
              touched ? "opacity-0" : "opacity-100"
            }`}
          >
            Arrastra para girar
          </span>
        )}
      </div>
    );
  }
);
