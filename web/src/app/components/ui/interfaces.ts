export interface DropdownItem {
  id: string;
  name: string;
  type?: string;
  url?: string;
}

export interface DropdownProps {
  show: boolean;
  setShow: (show: boolean) => void;
  resolvedTheme: string;
  onSelect?: (item: DropdownItem) => void;
  selectedId?: string;
}
