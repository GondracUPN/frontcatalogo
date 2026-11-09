import { productWhatsAppMessage, type WhatsAppProduct } from "@/lib/store-config";
import WhatsAppLink from "./WhatsAppLink";
export { productWhatsAppMessage, WHATSAPP_NUMBER } from "@/lib/store-config";

export default function WhatsAppProductLink({ source = "product", compact = false, className, productId, ...product }: WhatsAppProduct & { productId?: string; source?: string; compact?: boolean; className?: string }) {
  return <WhatsAppLink source={source} productId={productId} productSlug={product.slug} productTitle={product.title} sku={product.sku} message={productWhatsAppMessage(product)} aria-label={"Consultar por WhatsApp: " + product.title} className={className || ("relative z-[1] inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold " + (compact ? "w-full border border-emerald-200 text-emerald-900 hover:bg-emerald-50" : "w-full bg-[#167344] text-white hover:bg-[#105c35]"))}>
    {compact ? "Consultar" : "Consultar por WhatsApp"}
  </WhatsAppLink>;
}
