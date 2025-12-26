'use client'

import React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

export default function PartnerCarousel({ children }: { children: React.ReactNode }) {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({delay: 4000})], )

  return (
    <section className="embla">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container">
          {React.Children.map(children, (child) => (
            <div className="embla__slide">
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
