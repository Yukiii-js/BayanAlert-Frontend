import React, { useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { api } from '../api/client';

export function LocationAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  required = false,
  maxLength = 255,
  placeholder = 'Enter a barangay, street, or landmark',
  className = '',
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const query = String(value || '').trim();
    if (query.length < 2) {
      setSuggestions([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.getLocationSuggestions(query, controller.signal);
        const result = response?.data?.suggestions;
        if (!Array.isArray(result)) {
          throw new Error('The address suggestions response was invalid.');
        }
        setSuggestions(result);
        setError('');
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setSuggestions([]);
          setError(requestError.message || 'Address suggestions are unavailable.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function selectSuggestion(suggestion) {
    onSelect(suggestion);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={id}
          name="address_details"
          value={value}
          onChange={(event) => {
            onChange(event);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          maxLength={maxLength}
          required={required}
          autoComplete="off"
          placeholder={placeholder}
          className={`${className} pr-9`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={`${id}-suggestions`}
        />
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      {open && suggestions.length > 0 && (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute inset-x-0 top-full z-[700] mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-xl"
        >
          {suggestions.map((suggestion, index) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={`${suggestion.label}-${suggestion.source}-${index}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              className="flex w-full items-start gap-2 border-b border-slate-800 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-800"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="min-w-0">
                <span className="block text-xs text-slate-100">{suggestion.label}</span>
                <span className="mt-0.5 block text-[9px] uppercase tracking-wide text-slate-500">
                  {suggestion.source}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {open && loading && (
        <p role="status" className="mt-1 text-[10px] text-slate-500">Searching locations...</p>
      )}
      {error && (
        <p role="status" className="mt-1 text-[10px] text-amber-300">
          Suggestions unavailable. You can still enter the address manually.
        </p>
      )}
    </div>
  );
}
