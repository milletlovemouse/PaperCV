import { zhCN } from "date-fns/locale/zh-CN";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef, useId, useRef, useState, type ComponentProps } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parseDateParts } from "@resume/editor-config";
import { CALENDAR_YEARS, calendarDate, calendarValue } from "./date-picker";
import "./date-picker.css";
import { TextField } from "./index";

// Forward the library's ref to the actual Radix input for focus and keyboard handling.
const CalendarInput = forwardRef<
  HTMLInputElement,
  ComponentProps<typeof TextField.Root> & { openCalendar?: () => void }
>(function CalendarInput({ openCalendar, ...props }, ref) {
  return (
    <TextField.Root {...props} ref={ref} type="text">
      <TextField.Slot side="right">
        <button
          className="calendar-trigger"
          type="button"
          aria-label={`选择${props["aria-label"] || "日期"}`}
          disabled={props.disabled}
          onClick={openCalendar}
        >
          <CalendarDays size={15} aria-hidden="true" />
        </button>
      </TextField.Slot>
    </TextField.Root>
  );
});

export default function DateField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const picker = useRef<DatePicker>(null);
  const parts = parseDateParts(value);
  const daily = !!parts?.day;
  const selected = calendarDate(value);
  const [error, setError] = useState("");
  const format = daily ? "yyyy-MM-dd" : "yyyy-MM";
  return (
    <div className="field date-field">
      <label htmlFor={id}>{label}</label>
      <DatePicker
        ref={picker}
        id={id}
        selected={selected}
        disabled={disabled}
        onChange={(date: Date | null) => {
          setError("");
          onChange(date ? calendarValue(date, daily) : "");
        }}
        customInput={<CalendarInput openCalendar={() => picker.current?.setOpen(true)} />}
        locale={zhCN}
        dateFormat={format}
        strictParsing
        showMonthYearPicker={!daily}
        showFullMonthYearPicker={!daily}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        portalId="papercv-date-picker-portal"
        calendarClassName="papercv-calendar"
        popperClassName="papercv-calendar-popper"
        minDate={new Date(1900, 0, 1)}
        maxDate={new Date(2100, 11, 31)}
        placeholderText={disabled ? "至今" : daily ? "选择日期" : "选择年月"}
        autoComplete="off"
        ariaLabel={label}
        ariaInvalid={error ? "true" : undefined}
        ariaDescribedBy={error ? `${id}-error` : undefined}
        onInputError={() => setError(`请输入有效日期，格式为 ${daily ? "2026-11-04" : "2026-11"}`)}
        isClearable={!!selected && !disabled}
        clearButtonTitle={`清除${label}`}
        ariaLabelClose={`清除${label}`}
        previousYearAriaLabel="上一年"
        nextYearAriaLabel="下一年"
        previousMonthAriaLabel="上个月"
        nextMonthAriaLabel="下个月"
        monthAriaLabelPrefix="选择月份"
        chooseDayAriaLabelPrefix="选择日期"
        renderCustomHeader={(header) => (
          <div className="calendar-header">
            <button
              type="button"
              aria-label={daily ? "上个月" : "上一年"}
              title={daily ? "上个月" : "上一年"}
              disabled={daily ? header.prevMonthButtonDisabled : header.prevYearButtonDisabled}
              onClick={daily ? header.decreaseMonth : header.decreaseYear}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="calendar-header-selects">
              <select
                aria-label="选择年份"
                value={header.date.getFullYear()}
                onChange={(event) => header.changeYear(+event.target.value)}
              >
                {CALENDAR_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
              {daily && (
                <select
                  aria-label="选择月份"
                  value={header.date.getMonth()}
                  onChange={(event) => header.changeMonth(+event.target.value)}
                >
                  {Array.from({ length: 12 }, (_, month) => (
                    <option key={month} value={month}>
                      {month + 1}月
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="button"
              aria-label={daily ? "下个月" : "下一年"}
              title={daily ? "下个月" : "下一年"}
              disabled={daily ? header.nextMonthButtonDisabled : header.nextYearButtonDisabled}
              onClick={daily ? header.increaseMonth : header.increaseYear}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      />
      {error && !disabled ? (
        <small id={`${id}-error`} className="date-field-error" role="alert">
          {error}
        </small>
      ) : disabled ? (
        <small>至今</small>
      ) : value && !selected ? (
        <small>原值：{value}，选择日期后替换</small>
      ) : null}
    </div>
  );
}
