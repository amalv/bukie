"use client";

import Link from "next/link";
import * as s from "./page.css";

type Props = {
  defaultValue?: string;
};

/**
 * Accessible search form with improved focus behavior:
 * - Clicking anywhere inside the search box focuses the input.
 * - Icon is decorative and doesn't steal focus.
 */
export function SearchForm({ defaultValue = "" }: Props) {
  return (
    <div className={s.searchRow}>
      <div className={s.searchBox}>
        <div>
          <form method="get" aria-label="Search books" className={s.form}>
            <label htmlFor="q" className={s.labelWrap}>
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
                id="q"
                name="q"
                type="search"
                defaultValue={defaultValue}
                placeholder="Search books, authors, or genres..."
                className={s.input}
                autoComplete="off"
                enterKeyHint="search"
              />
            </label>
          </form>
        </div>
      </div>
      {defaultValue ? (
        <Link href="/" className={s.clearLink} prefetch={false}>
          Clear
        </Link>
      ) : null}
    </div>
  );
}
