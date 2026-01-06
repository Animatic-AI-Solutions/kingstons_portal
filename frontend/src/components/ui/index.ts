// Group 1: Text Input Family Components
export { default as BaseInput } from './inputs/BaseInput';
export type { BaseInputProps } from './inputs/BaseInput';

export { default as NumberInput } from './inputs/NumberInput';
export type { NumberInputProps } from './inputs/NumberInput';

export { default as TextArea } from './inputs/TextArea';
export type { TextAreaProps } from './inputs/TextArea';

export { default as DateInput } from './inputs/DateInput';
export type { DateInputProps } from './inputs/DateInput';

// Group 2: Search Input Family Components
export { default as SearchInput } from './search/SearchInput';
export type { SearchInputProps } from './search/SearchInput';

export { default as FilterSearch } from './search/FilterSearch';
export type { FilterSearchProps } from './search/FilterSearch';

export { default as AutocompleteSearch } from './search/AutocompleteSearch';
export type { AutocompleteSearchProps, AutocompleteOption } from './search/AutocompleteSearch';

// Group 3: Selection Family Components
export { default as BaseDropdown } from './dropdowns/BaseDropdown';
export type { BaseDropdownProps, DropdownOption } from './dropdowns/BaseDropdown';

export { default as MultiSelectDropdown } from './dropdowns/MultiSelectDropdown';
export type { MultiSelectDropdownProps } from './dropdowns/MultiSelectDropdown';

export { default as CreatableDropdown } from './dropdowns/CreatableDropdown';
export type { CreatableDropdownProps } from './dropdowns/CreatableDropdown';

export { default as CreatableMultiSelect } from './dropdowns/CreatableMultiSelect';
export type { CreatableMultiSelectProps } from './dropdowns/CreatableMultiSelect';

export { default as ComboDropdown } from './dropdowns/ComboDropdown';
export type { ComboDropdownProps } from './dropdowns/ComboDropdown';

// Group 4: Action Button Family Components
export { default as ActionButton } from './buttons/ActionButton';
export type { ActionButtonProps } from './buttons/ActionButton';

export { default as EditButton } from './buttons/EditButton';
export type { EditButtonProps } from './buttons/EditButton';

export { default as AddButton } from './buttons/AddButton';
export type { AddButtonProps } from './buttons/AddButton';

export { default as DeleteButton } from './buttons/DeleteButton';
export type { DeleteButtonProps } from './buttons/DeleteButton';

export { default as LapseButton } from './buttons/LapseButton';
export type { LapseButtonProps } from './buttons/LapseButton';

// Icon-only action buttons for Phase 2 tables
export { default as LapseIconButton } from './buttons/LapseIconButton';
export type { LapseIconButtonProps } from './buttons/LapseIconButton';

export { default as MakeDeceasedButton } from './buttons/MakeDeceasedButton';
export type { MakeDeceasedButtonProps } from './buttons/MakeDeceasedButton';

export { default as ReactivateButton } from './buttons/ReactivateButton';
export type { ReactivateButtonProps } from './buttons/ReactivateButton';

export { default as DeleteIconButton } from './buttons/DeleteIconButton';
export type { DeleteIconButtonProps } from './buttons/DeleteIconButton';

// Group 5: Filter and Sort Components
export { default as TableFilter } from './table-controls/TableFilter';
export type { TableFilterProps, FilterOption } from './table-controls/TableFilter';

export { default as TableSort } from './table-controls/TableSort';
export type { TableSortProps, SortDirection, SortType } from './table-controls/TableSort';

export { default as InputLabel } from './inputs/InputLabel';
export type { InputLabelProps } from './inputs/InputLabel';

export { default as InputError } from './inputs/InputError';
export type { InputErrorProps } from './inputs/InputError';

export { default as InputGroup, InputWithButton, InputWithAddon, InputRow, InputColumn } from './inputs/InputGroup';
export type { InputGroupProps } from './inputs/InputGroup';

export { default as FieldError } from './FieldError';
export type { FieldErrorProps } from './FieldError';

// Existing UI Components
export { default as Button } from './buttons/Button';
export { default as Card } from './card/Card';
export { default as StatCard } from './card/StatCard';
export { default as StatBox } from './card/StatBox';
export { default as ChangeIndicator } from './card/ChangeIndicator';
export { default as FundDistributionChart } from './data-displays/FundDistributionChart';
export { default as DataTable } from './data-displays/DataTable';
export { Skeleton, StatBoxSkeleton, ChartSkeleton, TableSkeleton } from './feedback/Skeleton';
export { default as ProfileAvatar } from './ProfileAvatar';
export { default as FilterDropdown } from './dropdowns/FilterDropdown';
export { EmptyState } from './feedback/EmptyState';
export { ErrorDisplay } from './feedback/ErrorDisplay';
export { default as ErrorStateNetwork } from './feedback/ErrorStateNetwork';
export { default as ErrorStateServer } from './feedback/ErrorStateServer';

// Group 9: Date Components
export { default as MiniYearSelector } from './date/MiniYearSelector';
export { default as EnhancedMonthHeader } from './date/EnhancedMonthHeader';

// Group 10: Modal Components
export { default as ModalShell } from './modals/ModalShell';

// Group 11: Navigation Components
export { default as TabNavigation } from './navigation/TabNavigation';

// Group 12: Badge Components
export { default as StatusBadge } from './badges/StatusBadge';

// Group 13: Table Components
export { default as SortableColumnHeader } from './tables/SortableColumnHeader';
export { default as TableSortHeader } from './tables/TableSortHeader';
export { default as SkeletonTable } from './tables/SkeletonTable';
export { default as StandardTable } from './tables/StandardTable';

// Group 14: Search Components
export { default as GlobalSearch } from './search/GlobalSearch';

// Group 15: Additional Inputs
export { default as PasswordInput } from './inputs/PasswordInput';

// Group 16: Table Constants (Icons and Styles)
export {
  ACTION_ICONS,
  SORT_ICONS,
  ICON_SIZES,
  ACTION_BUTTON_STYLES,
  ICON_COLORS,
} from './constants/tableIcons';