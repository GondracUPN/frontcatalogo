import { permanentRedirect } from "next/navigation";

// Dirección corta y fácil de dictar por WhatsApp.
export default function AyudaPage() {
  permanentRedirect("/preguntas-frecuentes");
}
