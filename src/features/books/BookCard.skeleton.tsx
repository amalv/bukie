import * as s from "./BookCard.skeleton.css";

export function BookCardSkeleton() {
  return (
    <div className={s.skeleton}>
      <div className={s.image} />
      <div className={s.line} />
      <div className={s.line} style={{ width: "60%" }} />
    </div>
  );
}
