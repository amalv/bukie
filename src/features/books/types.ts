export type Book = {
  id: string;
  title: string;
  /** Preferred: list of authors; first entry used as primary in UI/DB */
  authors?: string[];
  author: string;
  cover: string;
  /** Optional genre badge to show over the cover */
  genre?: string;
  /** Optional numeric rating 0-5; decimals allowed */
  rating?: number;
  /** Optional number of ratings/reviews to display alongside rating */
  ratingsCount?: number;
  /** Optional timestamp (ms since epoch) when the book was added */
  addedAt?: number;
  /** Optional published year */
  year?: number;
  /** Optional long description */
  description?: string;
  /** Optional number of pages */
  pages?: number;
  /** Optional publisher name */
  publisher?: string;
  /** Optional ISBN */
  isbn?: string;
};
