"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-states";

export type GoogleBusinessResult = {
  placeId: string;
  name: string;
  address: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string | null;
  phone: string;
  website: string;
  reviewUrl: string;
};

export function BusinessSearch({
  query,
  selected,
  onQueryChange,
  onSelect,
  onClear
}: {
  query: string;
  selected?: GoogleBusinessResult | null;
  onQueryChange: (value: string) => void;
  onSelect: (place: GoogleBusinessResult) => void;
  onClear: () => void;
}) {
  const listboxId = useId();
  const selectedPlaceId = selected?.placeId;
  const [results, setResults] = useState<GoogleBusinessResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (selectedPlaceId || query.trim().length < 3) {
      abortRef.current?.abort();
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/google/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, sessionToken: sessionToken() }),
          signal: controller.signal
        });
        const json = (await response.json()) as { configured?: boolean; places?: GoogleBusinessResult[]; error?: string };
        if (!response.ok) throw new Error(json.error ?? "Business search failed.");
        setConfigured(json.configured ?? false);
        setResults(json.places ?? []);
        setActiveIndex(-1);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Business search failed.");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedPlaceId]);

  function choose(place: GoogleBusinessResult) {
    setLoading(false);
    onSelect(place);
    setResults([]);
    setActiveIndex(-1);
  }

  function clear() {
    setLoading(false);
    setResults([]);
    setActiveIndex(-1);
    onClear();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === "Escape") {
      setResults([]);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="space-y-3">
      {selected ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-emerald-600 p-1 text-white"><Check className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{selected.name}</p>
              <p className="mt-1 text-sm text-emerald-900/75">{selected.address || "Address not provided by Google"}</p>
              {selected.category ? <p className="mt-1 text-xs capitalize text-emerald-900/65">{selected.category}</p> : null}
            </div>
            <button type="button" onClick={clear} className="cursor-pointer rounded-md p-1 text-emerald-900/70 hover:bg-emerald-100" aria-label="Change business"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => { setLoading(false); setResults([]); setActiveIndex(-1); setError(""); onQueryChange(event.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="Search business name or address"
            className="h-12 pl-10"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={results.length > 0}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          />
          {loading ? <LoadingSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-primary" label="Searching businesses" /> : null}
          {results.length ? (
            <div id={listboxId} role="listbox" className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-xl border bg-card shadow-xl">
              {results.map((place, index) => (
                <button
                  key={place.placeId}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(place)}
                  className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left text-sm ${index === activeIndex ? "bg-primary/10" : "hover:bg-muted"}`}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0"><span className="block font-medium">{place.name}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{place.address || "Address unavailable"}</span></span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      {!selected && !loading && configured === false ? <p className="text-sm text-muted-foreground">Google business search is not configured for this workspace yet. You can use manual entry below.</p> : null}
      {!selected && !loading && configured !== false && query.trim().length >= 3 && !error && !results.length ? <p className="text-sm text-muted-foreground">No matching businesses found. Try a fuller name or address.</p> : null}
    </div>
  );
}

let currentSessionToken = "";
function sessionToken() {
  if (!currentSessionToken) currentSessionToken = crypto.randomUUID();
  return currentSessionToken;
}
