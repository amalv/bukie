"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId } from "react";
import {
  type CatalogQuery,
  parseCatalogQuery,
  serializeCatalogQuery,
} from "@/features/books/catalogQuery";
import { pageStyles as s } from "./pageStyles";

type Props = {
  defaultValue?: string;
  query?: CatalogQuery;
};

/**
 * Accessible search form with improved focus behavior:
 * - Clicking anywhere inside the search box focuses the input.
 * - Icon is decorative and doesn't steal focus.
 */
export function SearchForm({ defaultValue = "", query }: Props) {
  const id = useId();
  const router = useRouter();
  const activeQuery = query ?? { q: defaultValue || undefined, sort: "title" };
  const retainedParams = serializeCatalogQuery({
    ...activeQuery,
    q: undefined,
  });
  const clearParams = serializeCatalogQuery({
    ...activeQuery,
    q: undefined,
  });

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(retainedParams);
    const data = new FormData(event.currentTarget);
    params.set("q", String(data.get("q") ?? ""));
    const canonical = serializeCatalogQuery(parseCatalogQuery(params));
    router.push(canonical.size > 0 ? `/?${canonical}` : "/");
  }

  return (
    <div className={s.searchRow}>
      <div className={s.searchBox}>
        <form
          method="get"
          aria-label="Search books"
          className={s.form}
          onSubmit={search}
        >
          {Array.from(retainedParams.entries()).map(([name, value]) => (
            <input type="hidden" name={name} value={value} key={name} />
          ))}
          <label htmlFor={id} className={s.labelWrap}>
            <span className={s.srOnly}>Search books</span>
            <svg
              aria-hidden="true"
              className={s.icon}
              viewBox="0 0 24 24"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
              />
            </svg>
            <input
              id={id}
              name="q"
              type="search"
              defaultValue={defaultValue}
              placeholder="Search titles or authors..."
              className={s.input}
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
        </form>
      </div>
      {defaultValue ? (
        <Link
          href={clearParams.size > 0 ? `/?${clearParams}` : "/"}
          className={s.clearLink}
          prefetch={false}
        >
          Clear
        </Link>
      ) : null}
    </div>
  );
}
