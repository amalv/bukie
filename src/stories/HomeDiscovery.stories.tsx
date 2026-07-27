import { CategoryDiscovery } from "@/app/components/CategoryDiscovery";
import { darkThemeClass, lightThemeClass } from "@/design/tokens";

const categories = [
  { slug: "classics", label: "Classics" },
  { slug: "fantasy", label: "Fantasy" },
  { slug: "mystery-thriller", label: "Mystery & Thriller" },
  { slug: "non-fiction", label: "Non-fiction" },
  { slug: "science-fiction", label: "Science Fiction" },
];

export default {
  title: "Discovery/CategoryDiscovery",
};

export const Ready = () => (
  <div className={lightThemeClass}>
    <CategoryDiscovery categories={categories} />
  </div>
);

export const Partial = () => (
  <div className={lightThemeClass}>
    <CategoryDiscovery categories={categories.slice(0, 2)} />
  </div>
);

export const Empty = () => (
  <div className={lightThemeClass}>
    <CategoryDiscovery categories={[]} />
  </div>
);

export const ErrorState = () => (
  <div className={lightThemeClass}>
    <CategoryDiscovery error />
  </div>
);

export const Loading = () => (
  <div className={darkThemeClass}>
    <CategoryDiscovery loading />
  </div>
);
