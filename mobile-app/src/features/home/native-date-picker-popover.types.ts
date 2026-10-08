export type DatePickerPopoverProps = {
  value: Date;
  minimumDate?: Date;
  displayValue: string;
  isPlaceholder: boolean;
  title: string;
  accessibilityLabel: string;
  onChange: (date: Date) => void;
};
