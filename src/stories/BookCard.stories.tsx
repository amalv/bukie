import { lightThemeClass } from "@/design/tokens.css";
import { BookCard } from "@/features/books/BookCard";

export default {
  title: "Book Card",
};

export const Rich = () => (
  <div className={lightThemeClass} style={{ background: "#fff", padding: 12 }}>
    <div style={{ maxWidth: 160 }}>
      <BookCard
        book={{
          id: "99",
          title: "Neuromancer",
          author: "William Gibson",
          cover: "https://placehold.co/120x180.png?text=Neuromancer",
          genre: "Sci-Fi",
          rating: 4.5,
          ratingsCount: 12847,
          year: 1984,
        }}
      />
    </div>
  </div>
);
