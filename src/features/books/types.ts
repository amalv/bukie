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
};
