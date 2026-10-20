// Reseñas reales de Google Maps mediante la API de Places (New).
// Requiere dos variables de entorno del servidor (nunca NEXT_PUBLIC_):
//   GOOGLE_PLACES_API_KEY  clave con «Places API (New)» habilitada
//   GOOGLE_PLACE_ID        identificador del local de Macsomenos en Google Maps
// Sin ellas la portada solo enlaza a Google Maps; nunca se muestran cifras
// inventadas. Google devuelve como máximo 5 reseñas, en el orden que elige.

export type GoogleReview = {
  author: string;
  authorUrl: string | null;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  reviewUrl: string | null;
};

export type GooglePlaceReviews = {
  rating: number | null;
  total: number | null;
  mapsUrl: string | null;
  reviews: GoogleReview[];
};

const FIELDS = ["rating", "userRatingCount", "googleMapsUri", "reviews"].join(",");

export function googleReviewsConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim() && process.env.GOOGLE_PLACE_ID?.trim());
}

export async function getGoogleReviews(): Promise<GooglePlaceReviews | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();
  if (!key || !placeId) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=PE`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
      // Una consulta por hora como máximo: limita el costo de la API.
      next: { revalidate: 3600, tags: ["google-reviews"] },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reviews: GoogleReview[] = (Array.isArray(data?.reviews) ? data.reviews : [])
      .map((review: any) => ({
        author: String(review?.authorAttribution?.displayName || "").trim(),
        authorUrl: review?.authorAttribution?.uri || null,
        authorPhoto: review?.authorAttribution?.photoUri || null,
        rating: Number(review?.rating || 0),
        text: String(review?.text?.text || review?.originalText?.text || "").trim(),
        relativeTime: String(review?.relativePublishTimeDescription || "").trim(),
        reviewUrl: review?.googleMapsUri || null,
      }))
      .filter((review: GoogleReview) => review.author && review.rating > 0);
    return {
      rating: Number.isFinite(Number(data?.rating)) ? Number(data.rating) : null,
      total: Number.isFinite(Number(data?.userRatingCount)) ? Number(data.userRatingCount) : null,
      mapsUrl: data?.googleMapsUri || null,
      reviews,
    };
  } catch {
    // Si Google no responde, la portada sigue cargando sin la sección.
    return null;
  }
}
