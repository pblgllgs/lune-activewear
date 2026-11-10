import { useEffect, useState } from "react";
import { Check, MessageSquare, RefreshCw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { approveReview, deleteReview, getPendingReviews, type Review } from "@/lib/reviews";
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

export function ReviewsModeration() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const pagination = usePagination(reviews, { pageSize: 10 });

  const load = async () => {
    setLoading(true);
    try {
      setReviews(await getPendingReviews());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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

  const remove = async (review: Review) => {
    const result = await Swal.fire({
      title: "¿Eliminar comentario?",
      text: `Se eliminará el comentario de ${review.name}.`,
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
            <CardTitle>Comentarios pendientes</CardTitle>
            <CardDescription>
              Las clientas envían comentarios desde cada producto. Revisa y aprueba los que quieras
              publicar, o elimínalos.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando comentarios…</p>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-5 w-5" />
            <p>No hay comentarios pendientes de revisión.</p>
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
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">“{review.text}”</p>
                    {review.createdAt && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {new Date(review.createdAt).toLocaleString("es-CL")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void approve(review)}
                      disabled={busy === review.id}
                    >
                      <Check className="h-3.5 w-3.5" /> Aprobar
                    </Button>
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
