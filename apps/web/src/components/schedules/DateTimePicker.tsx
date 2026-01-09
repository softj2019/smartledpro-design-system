import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';

interface DateTimePickerProps {
  value: string; // ISO string or local datetime string
  onChange: (isoString: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export function DateTimePicker({
  value,
  onChange,
  label,
  required = false,
  error,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // ✅ ISO string을 한국 시간(KST)으로 파싱
  const parseValue = (isoString: string) => {
    if (!isoString) {
      // 현재 한국 시간
      const now = new Date();
      const kstOffset = 9 * 60; // 9시간
      const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
      
      return {
        year: kstTime.getUTCFullYear(),
        month: kstTime.getUTCMonth() + 1,
        day: kstTime.getUTCDate(),
        hour: kstTime.getUTCHours(),
        minute: kstTime.getUTCMinutes(),
      };
    }
    
    // ✅ UTC 시간을 KST로 변환하여 표시 (+9시간)
    const utcDate = new Date(isoString);
    const kstTime = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    
    return {
      year: kstTime.getUTCFullYear(),
      month: kstTime.getUTCMonth() + 1,
      day: kstTime.getUTCDate(),
      hour: kstTime.getUTCHours(),
      minute: kstTime.getUTCMinutes(),
    };
  };

  const current = parseValue(value);
  const [selectedYear, setSelectedYear] = useState(current.year);
  const [selectedMonth, setSelectedMonth] = useState(current.month);
  const [selectedDay, setSelectedDay] = useState(current.day);
  const [selectedHour, setSelectedHour] = useState(current.hour);
  const [selectedMinute, setSelectedMinute] = useState(current.minute);
  const [calendarYear, setCalendarYear] = useState(current.year);
  const [calendarMonth, setCalendarMonth] = useState(current.month);

  useEffect(() => {
    const updated = parseValue(value);
    setSelectedYear(updated.year);
    setSelectedMonth(updated.month);
    setSelectedDay(updated.day);
    setSelectedHour(updated.hour);
    setSelectedMinute(updated.minute);
    setCalendarYear(updated.year);
    setCalendarMonth(updated.month);
  }, [value]);

  const formatDisplay = () => {
    if (!value) return '날짜 및 시간 선택';
    
    // ✅ KST 시간 표시
    const parsed = parseValue(value);
    const year = parsed.year;
    const month = String(parsed.month).padStart(2, '0');
    const day = String(parsed.day).padStart(2, '0');
    const hour = String(parsed.hour).padStart(2, '0');
    const minute = String(parsed.minute).padStart(2, '0');
    
    return `${year}. ${month}. ${day}. ${hour}:${minute} (한국시간)`;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const handleApply = () => {
    // ✅ 사용자가 입력한 KST 시간을 UTC로 변환 (-9시간)
    const kstYear = selectedYear;
    const kstMonth = selectedMonth - 1; // JS Date는 0-based month
    const kstDay = selectedDay;
    const kstHour = selectedHour;
    const kstMinute = selectedMinute;
    
    // KST 시간으로 Date 객체 생성
    const kstDate = new Date(Date.UTC(kstYear, kstMonth, kstDay, kstHour, kstMinute, 0, 0));
    
    // UTC로 변환 (-9시간)
    const utcTime = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
    
    // ISO 문자열로 변환
    const isoString = utcTime.toISOString();
    onChange(isoString);
    setIsOpen(false);
  };

  const handleCancel = () => {
    const current = parseValue(value);
    setSelectedYear(current.year);
    setSelectedMonth(current.month);
    setSelectedDay(current.day);
    setSelectedHour(current.hour);
    setSelectedMinute(current.minute);
    setCalendarYear(current.year);
    setCalendarMonth(current.month);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    setSelectedYear(calendarYear);
    setSelectedMonth(calendarMonth);
    setSelectedDay(day);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const isSelectedDate = (day: number | null) => {
      if (!day) return false;
      return selectedYear === calendarYear && 
             selectedMonth === calendarMonth && 
             selectedDay === day;
    };

    const isToday = (day: number | null) => {
      if (!day) return false;
      const today = new Date();
      return today.getFullYear() === calendarYear &&
             today.getMonth() + 1 === calendarMonth &&
             today.getDate() === day;
    };

    return (
      <div>
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base">
            {calendarYear}년 {calendarMonth}월
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div key={i} className="text-center text-xs text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <button
              key={index}
              type="button"
              onClick={() => day && handleDayClick(day)}
              disabled={!day}
              className={`
                aspect-square flex items-center justify-center text-sm rounded
                transition-colors
                ${!day ? 'cursor-default' : 'hover:bg-gray-100'}
                ${isSelectedDate(day) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                ${isToday(day) && !isSelectedDate(day) ? 'border border-blue-500 text-blue-500' : ''}
                ${day && !isSelectedDate(day) && !isToday(day) ? 'text-gray-900' : ''}
              `}
            >
              {day || ''}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Generate hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Generate minutes (0-59, step 5)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-3 py-2 border rounded-md
          hover:border-blue-500 transition-colors
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : ''}
        `}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {formatDisplay()}
        </span>
        <CalendarIcon className="w-5 h-5 text-gray-400" />
      </button>

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}

      {/* Picker Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Picker Panel */}
          <div className="absolute top-full left-0 mt-2 w-full max-w-sm bg-white border rounded-lg shadow-xl z-20 p-4">
            <div className="space-y-4">
              {/* Calendar */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">날짜 선택</span>
                </div>
                {renderCalendar()}
              </div>

              {/* Time Selection */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">시간 선택</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Hour */}
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {hours.map((hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, '0')}시
                      </option>
                    ))}
                  </select>

                  {/* Minute */}
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {minutes.map((minute) => (
                      <option key={minute} value={minute}>
                        {String(minute).padStart(2, '0')}분
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                >
                  적용
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}