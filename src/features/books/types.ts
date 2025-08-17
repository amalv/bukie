export type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;
  /** Optional genre badge to show over the cover */
  genre?: string;
  /** Optional numeric rating 0-5; decimals allowed */
  rating?: number;
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
