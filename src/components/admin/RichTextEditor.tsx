import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  RemoveFormatting,
  Underline,
} from "lucide-react";
import { richTextIsEmpty, richTextToDisplayHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // Evita que el botón robe el foco y se pierda la selección del texto.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

/**
 * Editor de texto enriquecido liviano para la descripción del producto.
 * Guarda HTML saneado; la ficha pública lo vuelve a sanear al mostrarlo.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Escribe la descripción del producto…",
  id,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string | null>(null);
  const [focused, setFocused] = useState(false);

  // Sincroniza el contenido cuando cambia el producto editado, sin mover el
  // cursor mientras la persona está escribiendo. `lastValue` evita reemplazar
  // el HTML recién escrito por su versión saneada al perder el foco.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastValue.current) return;
    const next = richTextToDisplayHtml(value);
    if (editor.innerHTML !== next) editor.innerHTML = next;
    lastValue.current = value;
  }, [value]);

  const emit = () => {
    const editor = editorRef.current;
    if (!editor) return;
    lastValue.current = editor.innerHTML;
    onChange(editor.innerHTML);
  };

  const exec = (command: string, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("URL del enlace (debe empezar con https:// o http://)");
    if (!url) return;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) return;
    exec("createLink", trimmed);
  };

  return (
    <div className={cn("overflow-hidden rounded-md border border-input bg-background", className)}>
      <div
        className="flex flex-wrap items-center gap-0.5 border-b bg-secondary/40 px-1.5 py-1"
        role="toolbar"
        aria-label="Formato de la descripción"
      >
        <ToolbarButton label="Negrita" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Cursiva" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Subrayado" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <ToolbarButton label="Título" onClick={() => exec("formatBlock", "h3")}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Párrafo" onClick={() => exec("formatBlock", "p")}>
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <ToolbarButton label="Lista con viñetas" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <ToolbarButton label="Agregar enlace" onClick={addLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Quitar formato" onClick={() => exec("removeFormat")}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="relative">
        {!focused && richTextIsEmpty(value) && (
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground/70">
            {placeholder}
          </span>
        )}
        <div
          id={id}
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label="Descripción del producto"
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            emit();
          }}
          onInput={emit}
          onPaste={(event) => {
            // Pega siempre como texto plano para no arrastrar estilos externos.
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
            emit();
          }}
          className="rich-text min-h-[7rem] px-3 py-2.5 text-sm leading-relaxed outline-none"
        />
      </div>
    </div>
  );
}
