import { useEffect, useState } from "react";
import { ExternalLink, Map as MapIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type MapFormatKey = "story" | "feed-vertical" | "square" | "landscape";

export interface MapFormat {
  key: MapFormatKey;
  label: string;
  /** largura máxima do modal para esse formato */
  dialogWidth: string;
}

/** Identifica se a imagem enviada é story, feed (4:5 ou 1:1) ou paisagem. */
export function getMapFormat(width: number, height: number): MapFormat {
  const ratio = width / height;
  if (ratio < 0.7) {
    return { key: "story", label: "Story (9:16)", dialogWidth: "max-w-[min(92vw,420px)]" };
  }
  if (ratio < 0.95) {
    return { key: "feed-vertical", label: "Feed vertical (4:5)", dialogWidth: "max-w-[min(92vw,520px)]" };
  }
  if (ratio <= 1.1) {
    return { key: "square", label: "Feed quadrado (1:1)", dialogWidth: "max-w-[min(92vw,640px)]" };
  }
  return { key: "landscape", label: "Paisagem", dialogWidth: "max-w-[min(95vw,960px)]" };
}

/** Carrega a imagem só para descobrir o tamanho (usado no formulário do produtor). */
export function useImageSize(url?: string | null) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!url) {
      setSize(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (!cancelled) setSize(null);
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  return size;
}

/** Texto "Formato detectado: Story (9:16) · 1080×1920" para o formulário do produtor. */
export function MapFormatHint({ url }: { url?: string | null }) {
  const size = useImageSize(url);
  if (!url || !size) return null;
  const format = getMapFormat(size.width, size.height);
  return (
    <p className="text-xs text-primary font-medium">
      Formato detectado: {format.label} · {size.width}×{size.height}px
    </p>
  );
}

interface EventMapDialogProps {
  imageUrl: string;
  eventTitle: string;
}

/** Link clicável "Ver mapa do evento" que abre o mapa num modal ajustado ao formato da imagem. */
const EventMapDialog = ({ imageUrl, eventTitle }: EventMapDialogProps) => {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const format = size ? getMapFormat(size.width, size.height) : null;
  const widthClass = format?.dialogWidth ?? "max-w-[min(92vw,520px)]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
      >
        <MapIcon className="w-4 h-4" />
        Ver mapa do evento
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`${widthClass} max-h-[94vh] overflow-y-auto p-3 sm:p-4`}>
          <DialogHeader className="pr-6">
            <DialogTitle className="text-base">Mapa do evento</DialogTitle>
            <DialogDescription className="line-clamp-1">{eventTitle}</DialogDescription>
          </DialogHeader>

          <img
            src={imageUrl}
            alt={`Mapa do evento ${eventTitle}`}
            onLoad={(e) =>
              setSize({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              })
            }
            className="mx-auto block h-auto w-auto max-h-[72vh] max-w-full rounded-lg object-contain"
          />

          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir imagem inteira para ampliar
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventMapDialog;
