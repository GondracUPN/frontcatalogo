"use client";
import React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { addToCart, getCartId, getOfferStatus, submitOffer } from "@/app/cart/cartClient";

type Props = {
  productId: string;
  saleType?: string | null;
  salePrice: number;
  disabled?: boolean;
};

export default function AddToCartClient({ productId, saleType, salePrice, disabled }: Props) {
  const router = useRouter();
  const [offer, setOffer] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [offerModalOpen, setOfferModalOpen] = React.useState(false);
  const [offerError, setOfferError] = React.useState("");
  const [offerBlocked, setOfferBlocked] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const cartId = React.useMemo(() => getCartId(), []);
  const isOferta = String(saleType || "").toUpperCase() === "OFERTA";
  const isPreventa = String(saleType || "").toUpperCase() === "PREVENTA";
  const max = Number(salePrice || 0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!offerModalOpen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [offerModalOpen]);

  const cookieGet = (name: string) => {
    if (typeof document === "undefined") return "";
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
  };
  const cookieSet = (name: string, value: string, maxAgeDays = 365) => {
    if (typeof document === "undefined") return;
    const maxAge = maxAgeDays * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
  };
  const offerStateKey = React.useMemo(() => `offer_state_${cartId}_${productId}`, [cartId, productId]);
  const offerBlockKey = React.useMemo(() => `offer_block_${cartId}_${productId}`, [cartId, productId]);
  const offerAttemptsKey = React.useMemo(() => `offer_attempts_${cartId}_${productId}`, [cartId, productId]);
  const readOfferState = () => {
    if (typeof window === "undefined") return { blocked: false, attemptsRemaining: 3 };
    try {
      const raw = window.localStorage.getItem(offerStateKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    const blocked = cookieGet(offerBlockKey) === "1";
    const attempts = Number(cookieGet(offerAttemptsKey) || 0);
    return { blocked, attemptsRemaining: Math.max(0, 3 - attempts) };
  };
  const writeOfferState = (blocked: boolean, attemptsRemaining: number) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(offerStateKey, JSON.stringify({ blocked, attemptsRemaining }));
    }
    const attempts = Math.max(0, 3 - attemptsRemaining);
    cookieSet(offerBlockKey, blocked ? "1" : "0");
    cookieSet(offerAttemptsKey, String(attempts));
  };

  const handleAdd = async () => {
    if (disabled) return;
    setSaving(true);
    setError("");
    try {
      const offerValue = isOferta && offer ? Number(offer) : undefined;
      await addToCart(productId, 1, offerValue);
      router.push("/cart");
    } catch (e: any) {
      setError(e?.message || "No se pudo agregar");
    } finally {
      setSaving(false);
    }
  };

  const handleBuyOffer = async () => {
    if (disabled) return;
    setSaving(true);
    setError("");
    try {
      await addToCart(productId, 1, max);
      router.push("/cart");
    } catch (e: any) {
      setError(e?.message || "No se pudo agregar");
    } finally {
      setSaving(false);
    }
  };

  const openOfferModal = async () => {
    if (disabled) return;
    setOffer("");
    const local = readOfferState();
    setOfferBlocked(local.blocked);
    setOfferModalOpen(true);
    setOfferError(local.blocked ? "Ya no puedes realizar mas ofertas para este producto." : "");
    try {
      const status = await getOfferStatus(productId);
      setOfferBlocked(status.blocked);
      writeOfferState(status.blocked, status.attemptsRemaining);
      if (status.blocked) setOfferError("Ya no puedes realizar mas ofertas para este producto.");
    } catch (e: any) {
      setOfferError(e?.message || "");
    }
  };

  const submitBestOffer = async () => {
    if (offerBlocked) return;
    const offerNum = Number(offer);
    if (!offer || !isFinite(offerNum) || offerNum <= 0) {
      setOfferError("Ingresa tu oferta");
      return;
    }
    setSaving(true);
    setOfferError("");
    try {
      const res = await submitOffer(productId, offerNum);
      if (res.ok) {
        writeOfferState(false, res.attemptsRemaining ?? 3);
        router.push("/cart");
        return;
      }
      setOfferBlocked(Boolean(res.blocked));
      writeOfferState(Boolean(res.blocked), res.attemptsRemaining ?? 0);
      if (res.blocked) {
        setOfferError("Ya no puedes realizar mas ofertas para este producto.");
      } else {
        setOfferError("Oferta rechazada. Intenta nuevamente.");
      }
    } catch (e: any) {
      setOfferError(e?.message || "No se pudo enviar la oferta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {isOferta ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            disabled={disabled || saving}
            onClick={handleBuyOffer}
            className="btn-primary inline-flex w-full justify-center rounded-full bg-[color:var(--foreground)] px-8 py-3 text-base font-medium text-white shadow-lg shadow-black/10 hover:bg-black disabled:opacity-50"
          >
            Compra ya
          </button>
          <button
            disabled={disabled || saving}
            onClick={openOfferModal}
            className="btn-secondary inline-flex w-full justify-center rounded-full border border-black/10 bg-white/82 px-8 py-3 text-base font-medium text-[color:var(--foreground)] hover:bg-white disabled:opacity-50"
          >
            Hacer oferta
          </button>
        </div>
      ) : (
        <button
          disabled={disabled || saving}
          onClick={handleAdd}
          className="btn-primary inline-flex w-full justify-center rounded-full bg-[color:var(--accent)] px-8 py-3 text-base font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-[color:var(--accent-strong)] disabled:opacity-50"
        >
          {saving ? "Agregando..." : isPreventa ? "Separalo" : "Agregar al carrito"}
        </button>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {mounted && offerModalOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(14,20,32,0.54)] p-4 backdrop-blur-sm">
          <button
            className="absolute inset-0"
            aria-label="Cerrar oferta"
            onClick={() => setOfferModalOpen(false)}
          />
          <div className="surface-card-strong soft-outline relative z-[1] w-full max-w-md p-6 text-[color:var(--foreground)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Oferta
                </div>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Propone tu mejor precio</h3>
              </div>
              <button onClick={() => setOfferModalOpen(false)} className="btn-secondary rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm" aria-label="Cerrar">
                Cerrar
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
              Si la oferta encaja con el margen del producto, la enviaremos directo al carrito.
            </p>

            <input
              type="number"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              className="mt-5 w-full px-4 py-3"
              placeholder="Ingresa tu oferta"
              disabled={offerBlocked}
            />

            {offerError && <div className="mt-3 text-sm text-red-600">{offerError}</div>}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                disabled={offerBlocked || saving}
                onClick={submitBestOffer}
                className="btn-primary rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[color:var(--accent-strong)] disabled:opacity-50"
              >
                {saving ? "Enviando..." : "Enviar oferta"}
              </button>
              <button
                onClick={() => setOfferModalOpen(false)}
                className="btn-secondary rounded-full border border-black/10 bg-white/82 px-6 py-3 text-sm font-medium text-[color:var(--foreground)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
