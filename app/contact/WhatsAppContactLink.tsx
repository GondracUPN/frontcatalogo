"use client";

import { reportGoogleAdsConversion } from "@/lib/google-ads";
import { trackCatalogEvent } from "@/lib/analytics";

import { whatsappUrl } from "@/lib/store-config";

const WHATSAPP_LINK = whatsappUrl();
const WHATSAPP_CONVERSION = process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_SEND_TO || "";

export default function WhatsAppContactLink() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noreferrer"
      onClick={() => { trackCatalogEvent("click_whatsapp", { source: "contact" }); reportGoogleAdsConversion(WHATSAPP_CONVERSION); }}
      className="btn-primary inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-[#141414] hover:bg-white/90"
    >
      Contactar por WhatsApp
    </a>
  );
}
