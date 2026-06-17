'use client';
import DatePicker from 'react-datepicker';

interface Props {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (dates: [Date | null, Date | null]) => void;
  placeholderText?: string;
}

export function DateRangePicker({ startDate, endDate, onChange, placeholderText = 'dd/mm – dd/mm' }: Props) {
  return (
    <div className="datepicker-wrapper">
      <DatePicker
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={onChange}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholderText}
        className="input-field w-44"
        isClearable
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
      />
    </div>
  );
}