/** FileSearch — fuzzy-filter input for filenames within the open workspace */
import { useId } from 'react';
import './FileSearch.css';

interface FileSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
}

export default function FileSearch({ value, onChange, resultCount }: FileSearchProps) {
  const inputId = useId();

  return (
    <div className="file-search" role="search" aria-label="Search files">
      <label htmlFor={inputId} className="sr-only">
        Search files
      </label>
      <span className="file-search__icon" aria-hidden="true">🔍</span>
      <input
        id={inputId}
        type="text"
        className="file-search__input"
        placeholder="Search files…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        aria-label="Filter files by name"
      />
      {value && (
        <>
          {resultCount !== undefined && (
            <span className="file-search__count" aria-live="polite">
              {resultCount}
            </span>
          )}
          <button
            className="file-search__clear"
            onClick={() => onChange('')}
            aria-label="Clear search"
            title="Clear"
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}
