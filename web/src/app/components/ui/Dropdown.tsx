import React from 'react';

interface DropdownItem {
  id: string;
  label: string;
}

interface DropdownProps {
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  onAdd?: () => void;
  onRemove?: (item: DropdownItem) => void;
  addLabel?: string;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  items,
  onSelect,
  onAdd,
  onRemove,
  addLabel = 'Add',
  className = '',
}) => {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        className="px-3 py-1.5 rounded-md bg-white dark:bg-gray-100 text-black dark:text-black font-medium shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-200"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        Select
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in flex flex-col py-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group">
              <span className="flex-1 text-gray-900 dark:text-gray-100" onClick={() => { setOpen(false); onSelect(item); }}>{item.label}</span>
              {onRemove && (
                <button
                  className="ml-2 text-red-500 opacity-70 group-hover:opacity-100 hover:text-red-700 text-xs p-1"
                  onClick={e => { e.stopPropagation(); onRemove(item); }}
                  aria-label="Remove"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          {onAdd && (
            <button
              className="flex items-center px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-full font-medium"
              onClick={() => { setOpen(false); onAdd(); }}
              type="button"
            >
              + {addLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
