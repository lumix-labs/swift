import React, { useEffect, useRef } from 'react';

export interface CommonDropdownProps {
  show: boolean;
  setShow: (show: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  widthClass?: string;
  align?: 'left' | 'right';
  dropdownClassName?: string;
}

export const CommonDropdown: React.FC<CommonDropdownProps> = ({
  show,
  setShow,
  trigger,
  children,
  widthClass = 'w-72',
  align = 'left',
  dropdownClassName = '',
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside or ESC
  useEffect(() => {
    if (!show) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShow(false);
    }
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShow(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [show, setShow]);

  return (
    <div className="relative inline-block">
      {trigger}
      {show && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 mt-2 ${align === 'right' ? 'right-0' : 'left-0'} ${widthClass} bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-md shadow-lg ${dropdownClassName}`}
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          tabIndex={-1}
        >
          {children}
        </div>
      )}
    </div>
  );
};
