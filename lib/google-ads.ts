"use client";

export function reportGoogleAdsConversion(sendTo: string) {
  if (!sendTo) return;

  try {
    const gtag = (window as Window & {
      gtag?: (command: string, eventName: string, parameters: Record<string, string | number>) => void;
    }).gtag;
    gtag?.("event", "conversion", {
      send_to: sendTo,
      value: 1.0,
      currency: "PEN",
    });
  } catch (error) {
    console.error("[google-ads] Conversion could not be sent", error);
  }
}
