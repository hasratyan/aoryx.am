import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <span>&copy; 2026 | MEGATOURS</span>
        <nav>
          <Link href={"/refund"}>Վերադարձի քաղաքականություն</Link>
          •
          <Link href={"/refund"}>Անվտանգության քաղաքականություն</Link>
          •
          <Link href={"https://b2b.megatours.am"} target={"_blank"}>B2B համագործակցություն</Link>
        </nav>
      </div>
    </footer>
  );
}
