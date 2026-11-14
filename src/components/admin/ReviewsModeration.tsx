import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  EyeOff,
  MessageSquare,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  approveReview,
  deleteReview,
  getPendingReviews,
  getPublishedReviews,
  hideReview,
  type Review,
} from "@/lib/reviews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/lib/use-pagination";

function Stars({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-primary text-primary" : "text-primary/20"}`}
        />
      ))}
    </div>
  );
}

type Tab = "pending" | "published";

export function ReviewsModeration() {
  const [tab, setTab] = useState<Tab>("pending");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const pagination = usePagination(reviews, { pageSize: 10, resetKey: tab });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const request = tab === "pending" ? getPendingReviews() : getPublishedReviews();
    request
      .then((items) => {
        if (active) setReviews(items);
      })
      .catch((err) => {
        if (!active) return;
        setReviews([]);
        setError(
          err instanceof Error ? err.message : "No se pudieron cargar los comentarios."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setReviews(tab === "pending" ? await getPendingReviews() : await getPublishedReviews());
    } catch (err) {
      setReviews([]);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los comentarios.");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (review: Review) => {
    setBusy(review.id);
    try {
      await approveReview(review.productId, review.id);
      setReviews((current) => current.filter((r) => r.id !== review.id));
      toast.success("Comentario aprobado y publicado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo aprobar el comentario.");
    } finally {
      setBusy(null);
    }
  };

  const hide = async (review: Review) => {
    setBusy(review.id);
    try {
      await hideReview(review.productId, review.id);
      setReviews((current) => current.filter((r) => r.id !== review.id));
      toast.success("Comentario ocultado. Quedó pendiente de revisión.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo ocultar el comentario.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (review: Review) => {
    const photoNote =
      review.photos.length > 0
        ? ` Se eliminarán también sus ${review.photos.length} foto${review.photos.length === 1 ? "" : "s"}.`
        : "";
    const result = await Swal.fire({
      title: "¿Eliminar comentario?",
      text: `Se eliminará el comentario de ${review.name}.${photoNote}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#49372D",
    });
    if (!result.isConfirmed) return;
    setBusy(review.id);
    try {
      await deleteReview(review.productId, review.id);
      setReviews((current) => current.filter((r) => r.id !== review.id));
      toast.success("Comentario eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el comentario.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              {tab === "pending" ? "Comentarios pendientes" : "Comentarios publicados"}
            </CardTitle>
            <CardDescription>
              {tab === "pending"
                ? "Revisa el texto y las fotos antes de publicar. El sello de compra verificada se valida contra el pedido real de la clienta."
                : "Estos comentarios ya se ven en la ficha del producto. Puedes ocultarlos o eliminarlos."}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant={tab === "pending" ? "default" : "outline"}
            onClick={() => setTab("pending")}
          >
            Pendientes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "published" ? "default" : "outline"}
            onClick={() => setTab("published")}
          >
            Publicados
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando comentarios…</p>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-medium">No se pudieron cargar los comentarios.</p>
            <p className="mt-1 break-words text-xs">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Si acabas de desplegar, espera a que Firestore termine de construir los índices y
              pulsa «Actualizar».
            </p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-5 w-5" />
            <p>
              {tab === "pending"
                ? "No hay comentarios pendientes de revisión."
                : "Todavía no hay comentarios publicados."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pagination.pageItems.map((review) => (
              <div key={`${review.productId}-${review.id}`} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider2 text-muted-foreground">
                      {review.productName || review.productId}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="font-medium">{review.name}</p>
                      <Stars rating={review.rating} />
                      {review.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider2 text-primary">
                          <BadgeCheck className="h-3 w-3" />
                          Compra verificada
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">“{review.text}”</p>

                    {review.photos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {review.photos.map((photo, i) => (
                          <a
                            key={photo}
                            href={photo}
                            target="_blank"
                            rel="noreferrer"
                            className="h-20 w-20 overflow-hidden rounded-md border transition hover:opacity-90"
                            title={`Abrir foto ${i + 1}`}
                          >
                            <img
                              src={photo}
                              alt={`Foto ${i + 1} del comentario de ${review.name}`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {review.createdAt && <span>{new Date(review.createdAt).toLocaleString("es-CL")}</span>}
                      {review.orderId && <span className="font-mono">Pedido {review.orderId}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {tab === "pending" ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void approve(review)}
                        disabled={busy === review.id}
                      >
                        <Check className="h-3.5 w-3.5" /> Aprobar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void hide(review)}
                        disabled={busy === review.id}
                      >
                        <EyeOff className="h-3.5 w-3.5" /> Ocultar
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void remove(review)}
                      disabled={busy === review.id}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" /> Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="comentarios"
              className="pt-1"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
