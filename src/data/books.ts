import { faker } from "@faker-js/faker";

export type Book = {
  title: string;
  author: string;
  year: string;
  image: string;
  rating: number;
};

export const generateBooks = (count: number): Book[] =>
  Array.from({ length: count }, () => ({
    title: faker.lorem.words(3),
    author: faker.person.fullName(),
    year: String(faker.date.past({ years: 100 }).getFullYear()),
    image: faker.image.urlLoremFlickr({ width: 150, height: 150, category: "book" }),
    rating: faker.number.int({ min: 0, max: 100 }),
  }));

export const books: Book[] = generateBooks(30);
