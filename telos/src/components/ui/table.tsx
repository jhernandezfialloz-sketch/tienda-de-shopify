import type { ComponentProps } from "react";

// Tablas densas y legibles; en móvil hacen scroll horizontal dentro de su contenedor.
export function Table({ className = "", ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className={`w-full border-collapse text-sm ${className}`} {...props} />
    </div>
  );
}
export function Th({ className = "", ...props }: ComponentProps<"th">) {
  return <th className={`border-b border-line px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted ${className}`} {...props} />;
}
export function Td({ className = "", ...props }: ComponentProps<"td">) {
  return <td className={`border-b border-line/70 px-3 py-2.5 align-middle ${className}`} {...props} />;
}
