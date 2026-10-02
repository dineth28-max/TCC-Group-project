import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  User,
  MapPin,
  CalendarClock,
  Sparkles,
  RotateCw,
} from "lucide-react";

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AcademicCalendar({
  slots = [],
  onDateSelect,
  onRefresh,
}) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(now);
    if (onDateSelect) {
      onDateSelect(now, DAY_NAMES_FULL[now.getDay()]);
    }
  };

  // Calendar math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  // Map slots by day of week for quick lookup
  const slotsByDay = useMemo(() => {
    const map = {};
    DAY_NAMES_FULL.forEach((day) => {
      map[day.toLowerCase()] = [];
    });
    slots.forEach((s) => {
      const d = (s.dayOfWeek || "").toLowerCase();
      if (map[d]) {
        map[d].push(s);
      } else {
        map[d] = [s];
      }
    });
    return map;
  }, [slots]);

  const selectedDayName = DAY_NAMES_FULL[selectedDate.getDay()];
  const selectedDaySlots = slotsByDay[selectedDayName.toLowerCase()] || [];

  const handleSelectDay = (dayNumber) => {
    const newDate = new Date(currentYear, currentMonth, dayNumber);
    setSelectedDate(newDate);
    if (onDateSelect) {
      onDateSelect(newDate, DAY_NAMES_FULL[newDate.getDay()]);
    }
  };

  // Helper checks
  const isToday = (dayNumber) => {
    const now = new Date();
    return (
      now.getDate() === dayNumber &&
      now.getMonth() === currentMonth &&
      now.getFullYear() === currentYear
    );
  };

  const isSelected = (dayNumber) => {
    return (
      selectedDate.getDate() === dayNumber &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EBE8] shadow-2xs space-y-5">
      {/* =====================================================================
          CALENDAR HEADER: Month/Year + Clock + Controls
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F4F2]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E6F6F3] text-[#00A389] flex items-center justify-center shadow-2xs">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{MONTH_NAMES[currentMonth]}</span>
              <span className="text-[#00A389]">{currentYear}</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Academic Timetable &amp; Class Schedule
            </span>
          </div>
        </div>

        {/* Live Clock + Nav Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Real-time Clock Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-600">
            <Clock size={12} className="text-[#00A389]" />
            <span>
              {currentTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-[#00A389] border border-slate-200 text-xs font-semibold transition"
          >
            Today
          </button>

          {/* Month Steppers */}
          <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
              aria-label="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
              aria-label="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl text-slate-500 hover:text-[#00A389] hover:bg-slate-50 border border-slate-200 transition"
              title="Refresh timetable slots"
              aria-label="Refresh"
            >
              <RotateCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          MAIN LAYOUT: 7-Column Grid (Left) + Selected Day Inspector (Right)
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* MONTHLY CALENDAR GRID (lg:col-span-7) */}
        <div className="lg:col-span-7">
          {/* Day of week header row */}
          <div className="grid grid-cols-7 mb-2 text-center">
            {DAY_NAMES_SHORT.map((day, idx) => (
              <span
                key={day}
                className={`text-[11px] font-bold uppercase tracking-wider py-1 ${
                  idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* 1. Leading days from previous month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayIndex + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-10 sm:h-12 rounded-2xl flex items-center justify-center text-xs text-slate-300 font-medium select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* 2. Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(currentYear, currentMonth, dayNum);
              const dayOfWeek = DAY_NAMES_FULL[dateObj.getDay()];
              const daySlots = slotsByDay[dayOfWeek.toLowerCase()] || [];
              const hasClasses = daySlots.length > 0;
              const active = isSelected(dayNum);
              const today = isToday(dayNum);

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-10 sm:h-12 rounded-2xl relative flex flex-col items-center justify-center text-xs font-semibold transition-all group cursor-pointer ${
                    active
                      ? "bg-[#0E483F] text-white shadow-md scale-105 z-10"
                      : today
                      ? "bg-emerald-50 text-[#00A389] border-2 border-[#00A389]/60 font-bold"
                      : "text-slate-700 hover:bg-slate-100/80"
                  }`}
                >
                  <span>{dayNum}</span>

                  {/* Indicator Dot for Scheduled Classes */}
                  {hasClasses && (
                    <span
                      className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full transition-colors ${
                        active
                          ? "bg-[#99E6DB]"
                          : today
                          ? "bg-[#00A389]"
                          : "bg-emerald-500"
                      }`}
                      title={`${daySlots.length} class(es) scheduled on ${dayOfWeek}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium pt-3 mt-1 border-t border-slate-100">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Classes
              Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-md border-2 border-[#00A389] bg-emerald-50" />{" "}
              Today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-md bg-[#0E483F]" /> Selected
            </span>
          </div>
        </div>

        {/* =====================================================================
            SELECTED DAY SCHEDULE INSPECTOR (lg:col-span-5)
            ===================================================================== */}
        <div className="lg:col-span-5 bg-[#F9FBFA] rounded-2xl p-4 sm:p-5 border border-[#E3EBE8] flex flex-col justify-between min-h-[300px]">
          <div>
            {/* Inspector Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EFEA]">
              <div>
                <p className="text-[11px] font-bold text-[#00A389] uppercase tracking-wider">
                  {selectedDayName}
                </p>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {MONTH_NAMES[selectedDate.getMonth()]}{" "}
                  {selectedDate.getDate()}, {selectedDate.getFullYear()}
                </h4>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-[#E3EBE8] text-slate-700 shadow-2xs">
                <span>{selectedDaySlots.length}</span>
                <span className="text-slate-400 font-normal">
                  {selectedDaySlots.length === 1 ? "Session" : "Sessions"}
                </span>
              </span>
            </div>

            {/* List of Scheduled Sessions for Selected Day */}
            <div className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {selectedDaySlots.length === 0 ? (
                <div className="text-center py-8 px-4 text-slate-400 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                    <CalendarClock size={20} />
                  </div>
                  <p className="text-xs font-medium text-slate-600">
                    No classes scheduled for {selectedDayName}s
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Use the Timetable Builder to schedule recurring classes.
                  </p>
                </div>
              ) : (
                selectedDaySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs space-y-2 hover:border-[#00A389] transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#E6F6F3] text-[#00A389] flex items-center justify-center font-bold text-xs shrink-0">
                          <BookOpen size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {slot.subject}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Weekly Recurring Class
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0E483F] text-emerald-300">
                        {slot.startTime} – {slot.endTime}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <User size={12} className="text-slate-400" />
                        <strong className="text-slate-700 font-medium">
                          {slot.teacherName || "Unassigned Teacher"}
                        </strong>
                      </span>
                      {slot.room && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{slot.room}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 mt-3 border-t border-[#E8EFEA] flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              Synchronized with Timetable API
            </span>
            <Link
              to="/timetable"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#00A389] hover:text-[#0E483F] transition"
            >
              <span>Manage Slots</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
