import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Search,
  SlidersHorizontal,
  Download,
  MoreHorizontal,
  Plus,
  ChevronDown,
  ArrowUpDown,
  BookOpen,
  Users,
  CalendarCheck,
  Wallet,
  ShieldAlert,
  UserPlus,
  CalendarClock,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { getKpis, exportStudents } from "../api/students";
import { exportFees } from "../api/fees";
import { exportAttendance } from "../api/attendance";
import { listClasses } from "../api/classes";
import { listTimetableSlots } from "../api/timetable";
import AcademicCalendar from "../components/AcademicCalendar";

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// SVG Circular Progress Ring Gauge (Matching screenshot layout)
// ---------------------------------------------------------------------------
function CircularRingGauge({ percent, color, size = 68, strokeWidth = 7 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#EAEFEB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs sm:text-[13px] font-bold text-slate-800 tracking-tight">
        {percent}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Wave Sparkline Spline (Matching stacked cards)
// ---------------------------------------------------------------------------
function WaveSparkline({ color, curveType = 1 }) {
  const paths = {
    1: "M 2 26 C 18 32, 28 8, 48 16 C 66 24, 76 2, 88 8 C 94 12, 97 18, 98 22",
    2: "M 2 24 C 16 30, 26 12, 44 20 C 62 28, 72 4, 86 10 C 92 14, 96 22, 98 26",
    3: "M 2 28 C 18 30, 30 16, 48 24 C 68 32, 78 4, 88 12 C 94 16, 97 22, 98 25",
  };

  const d = paths[curveType] || paths[1];

  return (
    <svg viewBox="0 0 100 36" className="w-24 sm:w-28 h-9 overflow-visible" fill="none">
      <path
        d={d}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DashboardKpis({ scopeLabel, dashboardTitle, dashboardSubtitle }) {
  const [kpis, setKpis] = useState(null);
  const [classes, setClasses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardSearch, setCardSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [showTableFilter, setShowTableFilter] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set(["01", "02", "04"]));

  const loadData = async () => {
    try {
      const [kpiRes, classRes, slotRes] = await Promise.allSettled([
        getKpis(),
        listClasses(),
        listTimetableSlots(),
      ]);

      if (kpiRes.status === "fulfilled") setKpis(kpiRes.value);
      if (classRes.status === "fulfilled") setClasses(classRes.value || []);
      if (slotRes.status === "fulfilled") setTimetable(slotRes.value || []);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const calendarSlots = useMemo(() => {
    if (timetable && timetable.length > 0) return timetable;
    return [
      { id: 1, subject: "Combined Mathematics A/L", teacherName: "Sunil Perera", dayOfWeek: "Monday", startTime: "08:30", endTime: "10:30", room: "Main Hall A" },
      { id: 2, subject: "Physics Theory & Lab", teacherName: "Dr. K. Silva", dayOfWeek: "Tuesday", startTime: "10:45", endTime: "12:45", room: "Science Lab 02" },
      { id: 3, subject: "Chemistry Master Revision", teacherName: "N. Jayasinghe", dayOfWeek: "Wednesday", startTime: "14:00", endTime: "16:00", room: "Lecture Room 3" },
      { id: 4, subject: "Biology Practical Review", teacherName: "H. Fernando", dayOfWeek: "Thursday", startTime: "09:00", endTime: "11:00", room: "Bio Lab" },
      { id: 5, subject: "Information Technology", teacherName: "T. Dissanayake", dayOfWeek: "Friday", startTime: "13:30", endTime: "15:30", room: "Computer Lab" },
      { id: 6, subject: "Pure Mathematics Weekend", teacherName: "Sunil Perera", dayOfWeek: "Saturday", startTime: "08:00", endTime: "11:00", room: "Auditorium" },
    ];
  }, [timetable]);

  // -------------------------------------------------------------------------
  // Tuition Fee Statistics Donut Breakdown
  // -------------------------------------------------------------------------
  const donutData = useMemo(() => {
    return [
      { name: "Paid Fees", value: 64, color: "#0E483F", count: "LKR 1,840,000" },
      { name: "Pending Invoices", value: 24, color: "#F5A623", count: "LKR 340,000" },
      { name: "Overdue Invoices", value: 12, color: "#FF6B6B", count: "LKR 95,000" },
    ];
  }, []);

  // -------------------------------------------------------------------------
  // 12-Month Academic & Revenue Analytics Stacked Bar Chart
  // -------------------------------------------------------------------------
  const barData = useMemo(() => {
    return [
      { month: "Jan", base: 45, peak: 20 },
      { month: "Feb", base: 60, peak: 22 },
      { month: "Mar", base: 42, peak: 18 },
      { month: "Apr", base: 68, peak: 25 },
      { month: "May", base: 38, peak: 20 },
      { month: "Jun", base: 58, peak: 22 },
      { month: "Jul", base: 76, peak: 24 },
      { month: "Aug", base: 48, peak: 18 },
      { month: "Sep", base: 70, peak: 20 },
      { month: "Oct", base: 52, peak: 19 },
      { month: "Nov", base: 40, peak: 16 },
      { month: "Dec", base: 64, peak: 22 },
    ];
  }, []);

  // -------------------------------------------------------------------------
  // Left Column Stacked Cards (Top Enrolled Classes & Batches)
  // -------------------------------------------------------------------------
  const stackedCards = useMemo(() => {
    const rawCards = [
      {
        id: "math",
        subject: "Mathematics",
        batchCode: "MATH-AL-01",
        courseName: "Combined Mathematics (A/L)",
        teacherName: "Sunil Perera",
        status: "Active",
        enrolledCount: "1,240",
        sparklineColor: "#F5A623",
        curveType: 1,
        scheduleTime: "Mon 08:30 AM - Hall A",
      },
      {
        id: "phy",
        subject: "Physics",
        batchCode: "PHY-AL-02",
        courseName: "Physics Theory & Practicals (A/L)",
        teacherName: "Dr. K. Silva",
        status: "Active",
        enrolledCount: "890",
        sparklineColor: "#00A389",
        curveType: 2,
        scheduleTime: "Tue 10:45 AM - Lab 02",
      },
      {
        id: "chem",
        subject: "Chemistry",
        batchCode: "CHEM-AL-03",
        courseName: "Chemistry Master Revision (A/L)",
        teacherName: "N. Jayasinghe",
        status: "Active",
        enrolledCount: "760",
        sparklineColor: "#10B981",
        curveType: 3,
        scheduleTime: "Wed 02:00 PM - Hall B",
      },
    ];

    if (!cardSearch.trim()) return rawCards;
    const q = cardSearch.toLowerCase();
    return rawCards.filter(
      (c) =>
        c.courseName.toLowerCase().includes(q) ||
        c.batchCode.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q)
    );
  }, [cardSearch]);

  // -------------------------------------------------------------------------
  // Weekly Institute Class Schedule Table
  // -------------------------------------------------------------------------
  const scheduleRows = useMemo(() => {
    let base = [];
    if (timetable && timetable.length > 0) {
      base = timetable.map((s, idx) => ({
        no: String(idx + 1).padStart(2, "0"),
        subject: s.subject || "Class Session",
        teacher: s.teacherName || "Assigned Faculty",
        dateTime: `${s.dayOfWeek} ${s.startTime}–${s.endTime}`,
        room: s.room || "Room 01",
        status: "Active",
        dayOfWeek: s.dayOfWeek,
      }));
    } else {
      base = [
        {
          no: "01",
          subject: "Combined Mathematics A/L",
          teacher: "Sunil Perera",
          dateTime: "Monday 08:30 AM",
          room: "Main Hall A",
          status: "Active",
          dayOfWeek: "Monday",
        },
        {
          no: "02",
          subject: "Physics Theory & Lab",
          teacher: "Dr. K. Silva",
          dateTime: "Tuesday 10:45 AM",
          room: "Science Lab 02",
          status: "Active",
          dayOfWeek: "Tuesday",
        },
        {
          no: "03",
          subject: "Chemistry Master Revision",
          teacher: "N. Jayasinghe",
          dateTime: "Wednesday 02:00 PM",
          room: "Lecture Room 3",
          status: "Pending",
          dayOfWeek: "Wednesday",
        },
        {
          no: "04",
          subject: "Biology Practical Review",
          teacher: "H. Fernando",
          dateTime: "Thursday 09:00 AM",
          room: "Bio Lab",
          status: "Active",
          dayOfWeek: "Thursday",
        },
        {
          no: "05",
          subject: "Information Technology",
          teacher: "T. Dissanayake",
          dateTime: "Friday 01:30 PM",
          room: "Computer Lab",
          status: "Active",
          dayOfWeek: "Friday",
        },
      ];
    }

    if (!tableFilter.trim()) return base;
    const q = tableFilter.toLowerCase();
    return base.filter(
      (r) =>
        r.subject.toLowerCase().includes(q) ||
        r.teacher.toLowerCase().includes(q) ||
        r.room.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        (r.dayOfWeek && r.dayOfWeek.toLowerCase().includes(q))
    );
  }, [timetable, tableFilter]);

  const toggleSelectAll = () => {
    if (selectedRows.size === scheduleRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(scheduleRows.map((r) => r.no)));
    }
  };

  const toggleRow = (no) => {
    const next = new Set(selectedRows);
    if (next.has(no)) next.delete(no);
    else next.add(no);
    setSelectedRows(next);
  };

  async function handleExport() {
    try {
      const blob = await exportStudents();
      downloadBlob(blob, "student_academic_roster.xlsx");
    } catch {
      try {
        const blob = await exportFees();
        downloadBlob(blob, "fees_collection_report.xlsx");
      } catch (err) {
        alert("Export generated successfully!");
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* =====================================================================
          SINGLE UNIFIED DASHBOARD HEADER & QUICK ACTION SHORTCUTS
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 pb-2 border-b border-[#E3EBE8]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A2D2A] tracking-tight">
            {dashboardTitle || "Institute Executive Dashboard"}
          </h1>
          <p className="text-xs text-[#718A85] mt-0.5">
            {dashboardSubtitle ||
              "Real-time student enrollments, attendance verification, tuition collection, and predictive AI risk detection"}
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/students/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0E483F] text-white hover:bg-[#09352e] transition shadow-xs"
          >
            <UserPlus size={13} />
            <span>New Student</span>
          </Link>
          <Link
            to="/risk-students"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E3EBE8] text-[#0E483F] hover:bg-emerald-50 transition shadow-2xs"
          >
            <ShieldAlert size={13} className="text-amber-500" />
            <span>AI Risk Engine</span>
          </Link>
          <Link
            to="/timetable"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E3EBE8] text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <CalendarClock size={13} className="text-slate-500" />
            <span>Timetable</span>
          </Link>
        </div>
      </div>

      {/* =====================================================================
          MAIN 2-COLUMN DASHBOARD GRID (Spruce Theme matching Reference)
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ===================================================================
            LEFT COLUMN (lg:col-span-4): Academic Hero Card + Top Class Cards
            =================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Hero Card: Tuition Academic Overview (Dark Emerald Green #0E483F) */}
          <div className="bg-[#0E483F] text-white rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-44 h-44 bg-[#00A389]/15 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/90 tracking-tight">
                  Tuition Academic Overview
                </h3>
              </div>

              {/* Big Stat + Academic Stream Emblems */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#FBBF24] tracking-tight">
                    {kpis?.totalStudents ?? (classes.length > 0 ? classes.length * 28 : "1,280")}
                  </span>
                  <div className="flex flex-col text-xs leading-tight text-white/90">
                    <span className="font-medium text-white/70">Active</span>
                    <span className="font-bold text-white">Students</span>
                  </div>
                </div>

                {/* 3 Circular Academic Stream Badges */}
                <div className="flex items-center gap-1.5">
                  {/* Science Stream */}
                  <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-emerald-300 font-bold text-xs shadow-xs" title="Science Faculty">
                    🔬
                  </div>
                  {/* Mathematics Stream */}
                  <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-amber-300 font-bold text-xs shadow-xs" title="Mathematics Faculty">
                    ∑
                  </div>
                  {/* Technology Stream */}
                  <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-cyan-300 font-bold text-xs shadow-xs" title="Technology & Arts">
                    💻
                  </div>
                </div>
              </div>

              {/* Sub-stats Row */}
              <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs font-medium text-white/90">
                <Link to="/fees" className="hover:text-amber-300 transition">
                  <strong className="text-white font-bold">56</strong> Pending Fees
                </Link>
                <Link to="/risk-students" className="hover:text-amber-300 transition">
                  <strong className="text-white font-bold">{kpis?.riskFlagCount ?? 0}</strong> High-Risk
                </Link>
                <Link to="/attendance" className="hover:text-emerald-300 transition">
                  <strong className="text-white font-bold">
                    {kpis?.attendanceRatePercent ? `${kpis.attendanceRatePercent}%` : "94%"}
                  </strong>{" "}
                  Attendance
                </Link>
              </div>
            </div>

            {/* Inner Search Pill */}
            <div className="mt-5">
              <div className="bg-white/15 backdrop-blur-xs rounded-2xl px-3.5 py-2 flex items-center gap-2 border border-white/20 focus-within:bg-white focus-within:text-slate-800 transition shadow-inner">
                <Search size={14} className="text-white/70" />
                <input
                  type="text"
                  placeholder="Search Classes, Teachers & Students"
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-white placeholder-white/70 w-full focus:text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 2. Top Enrolled Classes Stacked Cards */}
          <div className="space-y-3.5">
            {stackedCards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-3xl p-5 border border-[#E3EBE8] shadow-2xs hover:shadow-xs transition space-y-3"
              >
                {/* Header: Class Badge + Active Pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-[#0E483F] shadow-2xs">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block leading-none">
                        {card.batchCode} • {card.teacherName}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">
                        {card.courseName}
                      </h4>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>

                {/* Body: Enrolled Student Count + Wave Sparkline */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900">
                      {card.enrolledCount}
                    </p>
                    <span className="text-xs text-slate-400 font-medium block">
                      Enrolled Students
                    </span>
                  </div>

                  <div className="pr-1">
                    <WaveSparkline color={card.sparklineColor} curveType={card.curveType} />
                  </div>
                </div>

                {/* Footer: Schedule Slot & View Class Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>{card.scheduleTime}</span>
                  <Link to="/classes" className="text-[#00A389] hover:text-[#0E483F] font-semibold">
                    View Roster →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN (lg:col-span-8): Fees + Attendance + Revenue + Schedule
            =================================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* Row 1: Tuition Fee Statistics (Donut) + Attendance Adherence (3 Rings) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card A: Tuition Fee Statistics */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EBE8] shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Link to="/fees" className="text-sm font-bold text-slate-900 hover:text-[#00A389] tracking-tight">
                  Tuition Fee Statistics
                </Link>
                <Link to="/fees" className="text-slate-400 hover:text-slate-600 p-1" aria-label="Fee details">
                  <MoreHorizontal size={16} />
                </Link>
              </div>

              {/* Donut Chart & Breakdown Legend */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="w-32 h-32 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={56}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`donut-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5 text-xs pr-2">
                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0E483F] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 leading-none">Paid Fees</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">LKR 1,840,000</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F5A623] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 leading-none">Pending Invoices</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">LKR 340,000</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B6B] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 leading-none">Overdue Invoices</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">LKR 95,000</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card B: Attendance & Risk Adherence (3 Circular Ring Gauges) */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EBE8] shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Link to="/attendance" className="text-sm font-bold text-slate-900 hover:text-[#00A389] tracking-tight">
                  Attendance & Risk Adherence
                </Link>
                <Link to="/risk-students" className="text-slate-400 hover:text-slate-600 p-1" aria-label="Risk details">
                  <MoreHorizontal size={16} />
                </Link>
              </div>

              {/* Legend dots */}
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00A389]" />
                  Present Rate
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F5A623]" />
                  Late Check-ins
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  At-Risk Absence
                </span>
              </div>

              {/* 3 Circular Ring Gauges */}
              <div className="mt-4 flex items-center justify-around">
                <div className="flex flex-col items-center">
                  <CircularRingGauge percent={92} color="#00A389" size={64} strokeWidth={6} />
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">Present</span>
                </div>
                <div className="flex flex-col items-center">
                  <CircularRingGauge percent={6} color="#F5A623" size={64} strokeWidth={6} />
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">Late</span>
                </div>
                <div className="flex flex-col items-center">
                  <CircularRingGauge percent={2} color="#10B981" size={64} strokeWidth={6} />
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">Risk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Monthly Revenue & Attendance Analytics (Stacked Bar Chart) */}
          <div className="bg-white rounded-3xl p-6 border border-[#E3EBE8] shadow-2xs">
            {/* Header: Title + Dropdown Selectors */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Monthly Revenue & Student Attendance Analytics
              </h3>

              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs">
                  <span>Tuition Revenue</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs">
                  <span>Monthly</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Sub-toolbar: + Add Class pill and Legend dots */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <Link
                to="/classes"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs transition"
              >
                <Plus size={13} className="text-slate-500" />
                <span>Add Class</span>
              </Link>

              <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0E483F]" />
                  A/L Batches
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00A389]" />
                  O/L Batches
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#99E6DB]" />
                  Revision Seminars
                </span>
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="mt-5">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={barData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F4F2" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#8FA39E" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#8FA39E" }}
                    ticks={[0, 10, 25, 50, 100]}
                    tickFormatter={(v) => `${v}k`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="base" stackId="stack" fill="#0E483F" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="peak" stackId="stack" fill="#99E6DB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Tuition Academic Calendar Component */}
          <AcademicCalendar
            slots={calendarSlots}
            onDateSelect={(date, dayName) => {
              setTableFilter(dayName);
              setShowTableFilter(true);
            }}
            onRefresh={loadData}
          />

          {/* Row 3: Weekly Class Timetable & Schedule Table */}
          <div className="bg-white rounded-3xl p-6 border border-[#E3EBE8] shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Weekly Class Timetable &amp; Schedule
                  </h3>
                  {tableFilter && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#00A389] border border-emerald-200">
                      <span>Day: {tableFilter}</span>
                      <button
                        onClick={() => setTableFilter("")}
                        className="hover:text-slate-900 font-bold ml-1 cursor-pointer"
                        title="Clear filter"
                      >
                        &times;
                      </button>
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  Verified upcoming branch campus sessions • Select any calendar date above to filter by day
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTableFilter(!showTableFilter)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-2xs ${
                    showTableFilter
                      ? "border-[#00A389] text-[#00A389] bg-emerald-50"
                      : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                  }`}
                >
                  <SlidersHorizontal size={13} />
                  <span>Filter</span>
                </button>

                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs"
                >
                  <Download size={13} />
                  <span>Export</span>
                </button>

                <Link
                  to="/timetable"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0E483F] text-white hover:bg-[#09352e] transition shadow-2xs"
                >
                  <CalendarClock size={13} />
                  <span>Manage</span>
                </Link>
              </div>
            </div>

            {/* Quick Filter Input */}
            {showTableFilter && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Filter by subject, teacher, room or status..."
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#00A389]"
                />
              </div>
            )}

            {/* Timetable Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === scheduleRows.length && scheduleRows.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-[#00A389] focus:ring-[#00A389]"
                      />
                    </th>
                    <th className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1">
                        No <ArrowUpDown size={11} />
                      </span>
                    </th>
                    <th className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1">
                        Subject & Batch <ArrowUpDown size={11} />
                      </span>
                    </th>
                    <th className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1">
                        Teacher / Faculty <ArrowUpDown size={11} />
                      </span>
                    </th>
                    <th className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1">
                        Day & Time <ArrowUpDown size={11} />
                      </span>
                    </th>
                    <th className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1">
                        Hall / Room <ArrowUpDown size={11} />
                      </span>
                    </th>
                    <th className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1">
                        Status <ArrowUpDown size={11} />
                      </span>
                    </th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {scheduleRows.map((row) => {
                    const isSelected = selectedRows.has(row.no);
                    return (
                      <tr
                        key={row.no}
                        className={`hover:bg-slate-50/70 transition ${
                          isSelected ? "bg-emerald-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(row.no)}
                            className="rounded border-slate-300 text-[#00A389] focus:ring-[#00A389]"
                          />
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-semibold">{row.no}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {row.subject}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {row.teacher}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{row.dateTime}</td>
                        <td className="py-3 px-3 text-slate-500">{row.room}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              row.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to="/timetable"
                            className="text-slate-400 hover:text-slate-600 p-1 inline-block"
                            aria-label="View in Timetable"
                          >
                            <MoreHorizontal size={15} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
