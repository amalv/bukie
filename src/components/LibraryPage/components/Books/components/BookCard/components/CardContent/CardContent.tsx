import { faker } from "@faker-js/faker";

import {
  CardActionAreaWrapper,
  CardWrapper,
  Cover,
  InfoWrapper,
  TextWrapper,
} from "./CardContent.styles";
import { BookDetails, CircularProgressWithLabel } from "./components";

import type { Book } from "@/data/books";

interface CardContentProps {
  book: Book;
}

export const CardContent: React.FC<CardContentProps> = ({ book }) => (
  <CardWrapper>
    <CardActionAreaWrapper>
      <Cover
        component="img"
        image={book.image || faker.image.url({ width: 150, height: 150 })}
        aria-label={book.title}
      />
      <InfoWrapper>
        <TextWrapper>
          <BookDetails
            title={book.title}
            author={book.author}
            publicationDate={book.publicationDate}
          />
        </TextWrapper>
        <CircularProgressWithLabel
          value={book.rating}
          aria-label={`${book.rating}%`}
        />
      </InfoWrapper>
    </CardActionAreaWrapper>
  </CardWrapper>
);
