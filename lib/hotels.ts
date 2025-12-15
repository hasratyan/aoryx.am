export type Hotel = {
  id: string;
  name: string;
  location: string;
  priceFrom: number;
  currency: string;
  rating: number;
  reviews: number;
  perks: string[];
  image: string;
  badge?: string;
  availability: string;
};

export const hotels: Hotel[] = [
  {
    id: "marina",
    name: "Marina Skyline Suites",
    location: "Dubai Marina, Dubai",
    priceFrom: 780,
    currency: "$",
    rating: 4.9,
    reviews: 2411,
    perks: ["Rooftop pool", "Executive lounge", "On-site yacht concierge"],
    image:
      "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80",
    badge: "Business favorite",
    availability: "Plenty of May dates",
  },
  {
    id: "palms",
    name: "Palm Crescent Resort",
    location: "Palm Jumeirah, Dubai",
    priceFrom: 1150,
    currency: "$",
    rating: 4.8,
    reviews: 1823,
    perks: ["Private beach", "Spa rituals", "Kids club"],
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    badge: "Top pick for families",
    availability: "7 rooms left for Eid",
  },
  {
    id: "saadiyat",
    name: "Saadiyat Dunes Retreat",
    location: "Saadiyat Island, Abu Dhabi",
    priceFrom: 920,
    currency: "$",
    rating: 4.7,
    reviews: 1034,
    perks: ["Golf access", "Late checkout", "Beachfront villas"],
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
    badge: "Cultural stays",
    availability: "3-night upgrade offers",
  },
  {
    id: "desert",
    name: "Qasr Desert Lodge",
    location: "Al Wathba Desert, Abu Dhabi",
    priceFrom: 680,
    currency: "$",
    rating: 4.6,
    reviews: 864,
    perks: ["Desert safari", "Starry-night dining", "Private plunge pools"],
    image:
      "https://images.unsplash.com/photo-1468855900780-8b4c1ccdd371?auto=format&fit=crop&w=1200&q=80",
    badge: "Desert escapes",
    availability: "Sunset safaris available",
  },
  {
    id: "creek",
    name: "Creekside Heritage Hotel",
    location: "Al Seef, Dubai",
    priceFrom: 540,
    currency: "$",
    rating: 4.5,
    reviews: 1398,
    perks: ["Creek views", "Early check-in", "Boutique souq access"],
    image:
      "https://images.unsplash.com/photo-1551888419-7faa540814b9?auto=format&fit=crop&w=1200&q=80",
    badge: "Historic charm",
    availability: "Weekend bundles available",
  },
  {
    id: "rak",
    name: "Lagoon Garden Villas",
    location: "Al Marjan Island, Ras Al Khaimah",
    priceFrom: 760,
    currency: "$",
    rating: 4.8,
    reviews: 1742,
    perks: ["Private pools", "Spa cabanas", "Airport fast track"],
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    badge: "Couples retreat",
    availability: "Popular for July – reserve now",
  },
];
