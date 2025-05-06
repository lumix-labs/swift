import { useState, useTransition, useDeferredValue } from "react";

/**
 * A hook that provides search functionality with React 18 useTransition and useDeferredValue
 * to improve performance when filtering or searching through large datasets.
 *
 * @param items The array of items to search through
 * @param searchFn A function that determines if an item matches the search query
 * @returns An object containing search state and filtered items
 */
export function useTransitionSearch<T>(items: T[], searchFn: (item: T, query: string) => boolean) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Defer the value to avoid blocking the UI
  const deferredQuery = useDeferredValue(searchQuery);

  // Filter items based on the deferred search query
  const filteredItems = deferredQuery ? items.filter((item) => searchFn(item, deferredQuery)) : items;

  // Update search query with transition to keep UI responsive
  const updateSearchQuery = (query: string) => {
    setSearchQuery(query);
    startTransition(() => {
      // Empty function since the filtering happens in the render phase
      // with the deferred value
    });
  };

  return {
    searchQuery,
    updateSearchQuery,
    filteredItems,
    isPending,
  };
}
