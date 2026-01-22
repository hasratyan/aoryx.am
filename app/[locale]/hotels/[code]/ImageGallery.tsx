"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "@/components/language-provider";

type ImageGalleryProps = {
  images: string[];
  altText: string;
};

export default function ImageGallery({ images, altText }: ImageGalleryProps) {
  const t = useTranslations();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const buildAlt = (index: number) =>
    t.gallery.imageAlt.replace("{name}", altText).replace("{index}", String(index + 1));

  const openFullSizeImage = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeFullSizeImage = () => {
    setSelectedImageIndex(null);
  };

  const navigateImages = (direction: "prev" | "next") => {
    if (selectedImageIndex === null) return;

    if (direction === "prev") {
      setSelectedImageIndex((prev) =>
        prev === null ? null : prev === 0 ? images.length - 1 : prev - 1
      );
    } else {
      setSelectedImageIndex((prev) =>
        prev === null ? null : prev === images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (selectedImageIndex === null) return;

    if (event.key === "Escape") {
      closeFullSizeImage();
    } else if (event.key === "ArrowLeft") {
      navigateImages("prev");
    } else if (event.key === "ArrowRight") {
      navigateImages("next");
    }
  };

  useEffect(() => {
    if (selectedImageIndex !== null) return;

    const list = listRef.current;
    if (!list || images.length < 2) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let rafId = 0;
    let lastTime: number | null = null;
    let scrollStarted = false;
    let stopped = false;
    let paused = false;
    let direction = 1; // 1 = forward, -1 = reverse
    const startedAt = performance.now();
    const maxWaitMs = 12000;

    const onMouseEnter = () => {
      paused = true;
    };
    
    const onMouseLeave = () => {
      paused = false;
      lastTime = null; // Reset time to avoid jump after pause
    };

    list.addEventListener("mouseenter", onMouseEnter, { passive: true });
    list.addEventListener("mouseleave", onMouseLeave, { passive: true });

    const step = (time: number) => {
      if (stopped) return;

      const maxScroll = list.scrollWidth - list.clientWidth;
      
      // Wait for images to load and scrollable area to be available
      if (maxScroll <= 0) {
        if (time - startedAt < maxWaitMs) {
          rafId = requestAnimationFrame(step);
        }
        return;
      }

      // Reset lastTime when scroll actually starts to avoid large delta jumps
      if (!scrollStarted) {
        scrollStarted = true;
        lastTime = time;
        // Disable scroll-snap during auto-scroll
        list.style.scrollSnapType = "none";
        rafId = requestAnimationFrame(step);
        return;
      }

      // If paused, just keep requesting frames but don't scroll
      if (paused) {
        rafId = requestAnimationFrame(step);
        return;
      }

      if (lastTime === null) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      const speedPxPerSecond = 30;
      const scrollAmount = (delta * speedPxPerSecond) / 1000;
      const next = list.scrollLeft + scrollAmount * direction;

      // Reverse direction at the ends
      if (next >= maxScroll - 0.5) {
        list.scrollLeft = maxScroll;
        direction = -1;
      } else if (next <= 0.5) {
        list.scrollLeft = 0;
        direction = 1;
      } else {
        list.scrollLeft = next;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      list.style.scrollSnapType = "";
      list.removeEventListener("mouseenter", onMouseEnter);
      list.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [images, selectedImageIndex]);

  return (
    <>
      <div ref={listRef} className="image-gallery-wrapper" aria-label={t.gallery.label}>
        <ul className="image-gallery">
          {images.map((src, idx) => (
            <li key={src} onClick={() => openFullSizeImage(idx)}>
              <Image
                src={src}
                alt={buildAlt(idx)}
                width={0}
                height={0}
                sizes="100vw"
              />
            </li>
          ))}
        </ul>

        {selectedImageIndex !== null && (
          <div
            className="fullsize-image-overlay"
            onClick={closeFullSizeImage}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <div
              className="fullsize-image-container"
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={images[selectedImageIndex]}
                alt={buildAlt(selectedImageIndex)}
                width={0}
                height={0}
                sizes="100vw"
                priority
              />
              <button onClick={closeFullSizeImage} className="close" aria-label={t.gallery.closeLabel}>
                <i className="material-symbols-rounded">close</i>
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  navigateImages("prev");
                }}
                className="prev"
                aria-label={t.gallery.prevLabel}
              >
                <i className="material-symbols-rounded">arrow_back_ios</i>
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  navigateImages("next");
                }}
                className="next"
                aria-label={t.gallery.nextLabel}
              >
                <i className="material-symbols-rounded">arrow_forward_ios</i>
              </button>
              <div>
                {selectedImageIndex + 1} / {images.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
