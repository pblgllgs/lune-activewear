import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        action && "sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-brand text-muted-foreground">{eyebrow}</p>
        )}
        <h2 className="mt-2 font-display text-3xl font-medium tracking-tight md:text-4xl">{title}</h2>
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
