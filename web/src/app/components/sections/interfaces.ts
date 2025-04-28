// Common interfaces for dropdown components
export interface DropdownItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
  disabled?: boolean;
}

export interface DropdownProps {
  show?: boolean;
  setShow?: (show: boolean) => void;
  resolvedTheme?: string;
  onSelect?: (item: DropdownItem) => void;
}
