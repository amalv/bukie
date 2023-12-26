import { useEffect, useCallback, useMemo, RefObject } from "react";

const ROOT_MARGIN = "20px";

export const useIntersectionObserver = (
  loader: RefObject<HTMLElement>,
  handleFetchMore: (observer: IntersectionObserver) => void,
  loading: boolean,
  lastPageReachedRef: RefObject<boolean>
) => {
  // Handle intersection events
  const handleObserver = useCallback(
    (entities: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      const target = entities[0];
      if (target.isIntersecting && !loading && !lastPageReachedRef.current) {
        handleFetchMore(observer);
      }
    },
    [loading, handleFetchMore, lastPageReachedRef]
  );

  // Intersection observer options
  const options = useMemo(
    () => ({
      root: null,
      rootMargin: ROOT_MARGIN,
      threshold: 1.0,
    }),
    []
  );

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (observer) {
        handleObserver(entries, observer);
      }
    }, options);

    const currentLoader = loader.current;

    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [handleObserver, options, loader]);
};
