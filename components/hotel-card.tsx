import Image from "next/image";
import type { Hotel } from "@/lib/hotels";

export type HotelCardCopy = {
  from: string;
  perNight: string;
  reviews: string;
  cta: string;
};

type Props = {
  hotel: Hotel;
  copy: HotelCardCopy;
};

// const formatPrice = (amount: number, currency: string) =>
//   new Intl.NumberFormat("en", {
//     style: "currency",
//     currency,
//     maximumFractionDigits: 0,
//   }).format(amount);

export default function HotelCard({ hotel, copy }: Props) {
  return (
    <div className="hotel-card">
      <div className="chip-row">
        {hotel.badge && <span className="badge">{hotel.badge}</span>}
        <span className="availability">{hotel.availability}</span>
      </div>
      <div className="image">
        <Image src={hotel.image} alt={hotel.name} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw" />
      </div>
      <div className="content">
        <div className="header">
          <div>
            <h3>{hotel.name}</h3>
            <p className="location"><span className="material-symbols-rounded">location_on</span>{hotel.location}</p>
          </div>
          <span className="rating">{hotel.rating.toFixed(1)} ★</span>
        </div>
        <div className="perks">
          {hotel.perks.map((perk) => (
            <span key={perk}>{perk}</span>
          ))}
        </div>
        <div className="footer">
          <div>
            <p className="price">
              {copy.from} {hotel.currency}{hotel.priceFrom} <small>{copy.perNight}</small>
            </p>
            <p className="reviews">
              {hotel.reviews.toLocaleString()} {copy.reviews}
            </p>
          </div>
          <button type="button">
            <span className="material-symbols-rounded">notifications_active</span>
            {copy.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
