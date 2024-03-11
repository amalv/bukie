import { type RefObject, useCallback, useEffect, useMemo } from "react";

const ROOT_MARGIN = "20px";

const createOptions = () => ({
  root: null,
  rootMargin: ROOT_MARGIN,
  threshold: 1.0,
});
const useObserverEffect = (
  loader: RefObject<HTMLElement>,
  handleObserver: (
    entries: IntersectionObserverEntry[],
    observer: IntersectionObserver,
  ) => void,
  options: IntersectionObserverInit,
) => {
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

export const useIntersectionObserver = (
  loader: RefObject<HTMLElement>,
  handleFetchMore: (observer: IntersectionObserver) => void,
  loading: boolean,
  lastPageReachedRef: RefObject<boolean>,
) => {
  const handleObserver = useCallback(
    (entities: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      const target = entities[0];
      if (target.isIntersecting && !loading && !lastPageReachedRef.current) {
        handleFetchMore(observer);
      }
    },
    [loading, handleFetchMore, lastPageReachedRef],
  );
  const options = useMemo(createOptions, []);

  useObserverEffect(loader, handleObserver, options);
};
