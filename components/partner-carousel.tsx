import { Children, type ReactNode } from "react";
import PartnerCarouselClient from "@/components/partner-carousel-client";

type PartnerCarouselProps = {
  children: ReactNode;
  loop?: boolean;
  autoplayDelay?: number;
};

export default function PartnerCarousel({
  children,
  loop,
  autoplayDelay,
}: PartnerCarouselProps) {
  return (
    <section className="embla">
      <PartnerCarouselClient loop={loop} autoplayDelay={autoplayDelay} />
      <div className="embla__viewport">
        <div className="embla__container">
          {Children.map(children, (child, index) => (
            <div className="embla__slide" key={index}>
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
