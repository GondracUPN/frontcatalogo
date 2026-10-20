"use client";

import { useEffect } from "react";
import { trackCatalogEvent } from "@/lib/analytics";

export default function HomeViewTracker() {
  useEffect(() => { trackCatalogEvent("view_home"); }, []);
  return null;
}
