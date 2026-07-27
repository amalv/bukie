import Clock from "lucide-react/dist/esm/icons/clock.js";
import { Container } from "@/design/layout/grid";
import { BookList } from "@/features/books/BookList";
import {
  HOME_SECTIONS,
  sectionContext,
} from "@/features/discovery/homeSections";
import { CategoryDiscovery } from "./components/CategoryDiscovery";
import { SectionHeader } from "./components/SectionHeader";
import { pageStyles as s } from "./pageStyles";

export default function Loading() {
  const arrivals = HOME_SECTIONS["new-arrivals"];
  const allBooks = HOME_SECTIONS["all-books"];

  return (
    <main aria-busy="true">
      <section className={s.hero}>
        <Container>
          <header className={s.header}>
            <h1 className={s.title}>Discover Your Next Great Read</h1>
            <p className={s.subtitle}>Loading Bukie's catalog…</p>
          </header>
        </Container>
      </section>
      <div className={s.contentSurface}>
        <CategoryDiscovery loading />
        <div className={s.sectionDivider} />
        <section aria-labelledby="new-arrivals-loading">
          <Container>
            <SectionHeader
              id="new-arrivals-loading"
              icon={
                <Clock
                  className={s.sectionHeaderIcon}
                  width={20}
                  height={20}
                  aria-hidden
                />
              }
              title={arrivals.label}
              description={arrivals.userNeed}
              context={sectionContext(arrivals)}
            />
          </Container>
          <BookList loading spacing="dense" testId="new-arrivals-list" />
        </section>
        <div className={s.sectionDivider} />
        <section aria-labelledby="all-books-loading">
          <Container>
            <SectionHeader
              id="all-books-loading"
              title={allBooks.label}
              description={allBooks.userNeed}
              context={sectionContext(allBooks)}
            />
          </Container>
          <BookList loading />
        </section>
      </div>
    </main>
  );
}
