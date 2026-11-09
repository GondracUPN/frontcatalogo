"use client";
import type { AnchorHTMLAttributes } from "react";
import { trackCatalogEvent } from "@/lib/analytics";
import { GENERAL_WHATSAPP_MESSAGE, whatsappUrl } from "@/lib/store-config";
import WhatsAppIcon from "./WhatsAppIcon";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { source: string; message?: string; productId?: string; productSlug?: string; productTitle?: string; sku?: string };
export default function WhatsAppLink({ source, message = GENERAL_WHATSAPP_MESSAGE, productId, productSlug, productTitle, sku, children = "Consultar por WhatsApp", onClick, ...props }: Props) {
  return <a {...props} data-whatsapp-tracked href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" onClick={(event) => {
    event.stopPropagation();
    trackCatalogEvent("click_whatsapp", { source, product_id: productId, product_slug: productSlug, product_title: productTitle, sku });
    onClick?.(event);
  }}><WhatsAppIcon className="h-5 w-5 shrink-0" />{children}</a>;
}
