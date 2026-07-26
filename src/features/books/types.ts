export type Book = {
  id: string;
  title: string;
  /** Preferred: list of authors; first entry used as primary in UI/DB */
  authors?: string[];
  author: string;
  cover: string;
  /** Optional primary category to show in bibliographic metadata */
  genre?: string;
  /** Raw catalog rating; UI display additionally requires an eligible evidence state */
  rating?: number;
  /** Raw catalog rating sample size */
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
