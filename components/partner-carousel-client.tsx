"use client";

import { useEffect, useRef } from "react";
import EmblaCarousel from "embla-carousel";
import Autoplay from "embla-carousel-autoplay";

type PartnerCarouselClientProps = {
  loop?: boolean;
  autoplayDelay?: number;
};

export default function PartnerCarouselClient({
  loop = true,
  autoplayDelay = 4000,
}: PartnerCarouselClientProps) {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const root = marker.closest(".embla");
    if (!root) return;
    const viewport = root.querySelector(".embla__viewport") as HTMLElement | null;
    if (!viewport) return;

    const embla = EmblaCarousel(viewport, { loop }, [Autoplay({ delay: autoplayDelay })]);
    return () => {
      embla.destroy();
    };
  }, [loop, autoplayDelay]);

  return <span ref={markerRef} data-embla-init="" aria-hidden="true" style={{ display: "none" }} />;
}
