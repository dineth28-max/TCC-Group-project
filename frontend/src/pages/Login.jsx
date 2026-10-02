import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { roleHomePath } from "../roleRouting";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(email, password);
      navigate(roleHomePath(me.role), { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message || "Invalid credentials. Please verify your username and password.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail) {
    setEmail(demoEmail);
    setPassword("Passw0rd!");
    setError(null);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#041B1A] p-2 sm:p-4 md:p-6 lg:p-8 font-sans selection:bg-[#00A389] selection:text-white">
      {/* Outer Card with curved split layout matching the reference strategy */}
      <div className="w-full max-w-[1320px] min-h-[680px] bg-white rounded-3xl sm:rounded-[36px] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative border border-[#0A302D]/30">
        
        {/* =========================================================================
            LEFT PANEL: Organic Abstract Blobs + Circular Logo + Tuition Graphic
            ========================================================================= */}
        <div className="relative w-full lg:w-[52%] xl:w-[50%] bg-[#FCFEFD] flex flex-col justify-between p-6 sm:p-10 xl:p-12 overflow-hidden z-10 shrink-0">
          
          {/* Layered Organic Contoured Blobs (Mint, Sage, Seafoam) matching reference */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Outer soft sage wave blob */}
            <svg
              viewBox="0 0 600 600"
              className="absolute -left-16 top-10 w-[620px] h-[620px] text-[#E5F4F0] fill-current opacity-80"
            >
              <path d="M420,120 C500,190 560,280 540,380 C520,480 430,550 320,560 C210,570 110,520 60,430 C10,340 20,230 80,150 C140,70 260,30 350,60 C380,70 400,95 420,120 Z" />
            </svg>

            {/* Middle mint green wave blob */}
            <svg
              viewBox="0 0 500 500"
              className="absolute left-0 top-20 w-[500px] h-[500px] text-[#A6DCD1] fill-current opacity-60"
            >
              <path d="M350,100 C420,160 460,250 430,330 C400,410 330,460 240,460 C150,460 80,410 50,330 C20,250 50,170 110,110 C170,50 280,40 350,100 Z" />
            </svg>

            {/* Inner seafoam accent blob */}
            <svg
              viewBox="0 0 400 400"
              className="absolute left-8 top-32 w-[400px] h-[400px] text-[#55A99B] fill-current opacity-30"
            >
              <path d="M280,80 C340,130 370,200 350,270 C330,340 270,380 200,380 C130,380 70,340 50,270 C30,200 60,130 110,80 C160,30 220,30 280,80 Z" />
            </svg>

            {/* Floating decorative circular bubbles (exactly like in reference image) */}
            <div className="absolute top-20 left-12 w-6 h-6 rounded-full bg-[#B6E4DC] opacity-70" />
            <div className="absolute top-28 left-48 w-4 h-4 rounded-full bg-[#8ACFBF] opacity-60" />
            <div className="absolute top-1/2 left-4 w-8 h-8 rounded-full bg-[#CEEDE6] opacity-75" />
            <div className="absolute bottom-24 left-24 w-10 h-10 rounded-full bg-[#B2E2D8] opacity-65" />
            <div className="absolute bottom-16 left-60 w-5 h-5 rounded-full bg-[#7BBFAD] opacity-40" />
            <div className="absolute bottom-40 right-16 w-7 h-7 rounded-full bg-[#D4F0E9] opacity-70" />
            <div className="absolute top-1/3 right-8 w-5 h-5 rounded-full bg-[#99D4C7] opacity-50" />
          </div>

          {/* Top-Left: Institute Logo Crest (Adapted from the circular badge in reference) */}
          <div className="relative z-10 self-start">
            <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#D5EAE4] shadow-xs">
              {/* Circular Emblem */}
              <div className="w-10 h-10 rounded-full border-2 border-[#00A389] flex items-center justify-center bg-[#F2FAF7] text-[#00A389] shadow-2xs">
                <GraduationCap size={20} className="stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-[#062423] leading-none uppercase">
                  CSMAS TUITION
                </span>
                <span className="text-[10px] font-semibold text-[#00A389] tracking-wider leading-none mt-1">
                  ACADEMIC PORTAL
                </span>
              </div>
            </div>
          </div>

          {/* Center: Tuition Education Graphic Composition */}
          <div className="relative z-10 my-auto py-8 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-[340px] h-[260px] flex items-center justify-center">
              
              {/* Central Educational Illustration in SVG */}
              <svg viewBox="0 0 360 280" className="w-full h-full drop-shadow-lg">
                {/* Desk / Podium shadow base */}
                <ellipse cx="180" cy="245" rx="140" ry="14" fill="#062423" opacity="0.12" />

                {/* Stack of Textbooks */}
                {/* Book 1 (Bottom - Blue Teal) */}
                <path d="M100 230 L260 230 L250 205 L90 205 Z" fill="#0D5C53" />
                <rect x="90" y="205" width="160" height="25" rx="3" fill="#13756A" />
                <rect x="90" y="215" width="158" height="4" fill="#E8F6F3" />
                <text x="145" y="222" fontSize="9" fontWeight="bold" fill="#C2EBE3" fontFamily="sans-serif">
                  MATHEMATICS
                </text>

                {/* Book 2 (Middle - Coral Orange) */}
                <path d="M110 205 L250 205 L242 180 L102 180 Z" fill="#D9532F" />
                <rect x="102" y="180" width="140" height="25" rx="3" fill="#F06A42" />
                <rect x="102" y="190" width="138" height="4" fill="#FFF2ED" />
                <text x="150" y="197" fontSize="9" fontWeight="bold" fill="#FFE2D6" fontFamily="sans-serif">
                  PHYSICS
                </text>

                {/* Book 3 (Top - Golden Amber) */}
                <path d="M120 180 L240 180 L234 158 L114 158 Z" fill="#D49A00" />
                <rect x="114" y="158" width="120" height="22" rx="3" fill="#F5B301" />
                <rect x="114" y="167" width="118" height="3" fill="#FFF9E6" />
                <text x="153" y="174" fontSize="8" fontWeight="bold" fill="#543C00" fontFamily="sans-serif">
                  CHEMISTRY
                </text>

                {/* Graduation Cap (Mortarboard) resting proudly on top */}
                <polygon points="174,105 235,125 174,145 113,125" fill="#062423" />
                <polygon points="174,108 231,125 174,142 117,125" fill="#0E3D38" />
                {/* Cap Skull Base */}
                <path d="M145,135 Q174,152 203,135 L200,148 Q174,162 148,148 Z" fill="#062423" />
                {/* Gold Button & Tassel */}
                <circle cx="174" cy="125" r="4" fill="#F5B301" />
                <path d="M174,125 Q205,135 212,156" stroke="#F5B301" strokeWidth="2.5" fill="none" />
                <circle cx="212" cy="157" r="3" fill="#F5B301" />

                {/* Diploma Scroll tied with teal ribbon */}
                <rect x="235" y="175" width="55" height="16" rx="8" fill="#FFF9ED" stroke="#D3C7AB" strokeWidth="1.5" transform="rotate(-25 235 175)" />
                <rect x="255" y="165" width="10" height="17" fill="#00A389" rx="2" transform="rotate(-25 255 165)" />

                {/* Stylized Student walking with backpack & study folder (Left foreground) */}
                <g transform="translate(35, 125)">
                  {/* Head */}
                  <circle cx="28" cy="16" r="10" fill="#FCD3B6" />
                  {/* Hair */}
                  <path d="M20,14 Q28,5 36,13 Q38,18 36,20 Q24,18 20,14 Z" fill="#3D2314" />
                  {/* Body / Shirt (Teal Blue) */}
                  <path d="M18,26 L38,26 L42,65 L14,65 Z" fill="#0284C7" rx="3" />
                  {/* Backpack strap */}
                  <path d="M22,26 L22,60" stroke="#042F2E" strokeWidth="3" />
                  {/* Backpack */}
                  <rect x="8" y="32" width="10" height="26" rx="4" fill="#00A389" />
                  {/* Trousers (Dark Navy) */}
                  <path d="M16,65 L27,65 L24,105 L16,105 Z" fill="#0F172A" />
                  <path d="M29,65 L40,65 L48,102 L40,103 Z" fill="#0F172A" />
                  {/* Shoes */}
                  <ellipse cx="18" cy="107" rx="6" ry="3" fill="#D9532F" />
                  <ellipse cx="46" cy="105" rx="6" ry="3" fill="#D9532F" />
                  {/* Arms & Notebook in hand */}
                  <path d="M34,35 L48,50" stroke="#FCD3B6" strokeWidth="4" strokeLinecap="round" />
                  <rect x="44" y="44" width="18" height="22" rx="2" fill="#FFFFFF" stroke="#00A389" strokeWidth="2" />
                  <line x1="48" y1="50" x2="58" y2="50" stroke="#94A3B8" strokeWidth="1.5" />
                  <line x1="48" y1="55" x2="56" y2="55" stroke="#94A3B8" strokeWidth="1.5" />
                </g>

                {/* Sparkles of excellence */}
                <g transform="translate(110, 80)">
                  <path d="M0,8 Q8,8 8,0 Q8,8 16,8 Q8,8 8,16 Q8,8 0,8 Z" fill="#F5B301" />
                </g>
                <g transform="translate(240, 95)">
                  <path d="M0,6 Q6,6 6,0 Q6,6 12,6 Q6,6 6,12 Q6,6 0,6 Z" fill="#00A389" />
                </g>
              </svg>
            </div>

            {/* Motivational Tagline */}
            <div className="text-center mt-2 max-w-xs">
              <h3 className="font-extrabold text-base text-[#062423] tracking-tight">
                Empowering Every Branch
              </h3>
              <p className="text-xs text-[#558178] mt-1 leading-relaxed">
                Seamless attendance, academic schedules, fees &amp; AI-driven learning risk analytics.
              </p>
            </div>
          </div>

          {/* Bottom Trust Feature Badges */}
          <div className="relative z-10 flex items-center justify-between border-t border-[#E1EFEA] pt-4 text-[11px] text-[#557F77] font-semibold">
            <span>• Multi-Branch Connected</span>
            <span>• Live QR Attendance</span>
            <span>• Secure Fee Gateway</span>
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: Deep Spruce Green with Organic Curved Boundary + Auth Pill Form
            ========================================================================= */}
        <div className="relative flex-1 bg-[#062423] text-white flex flex-col justify-center px-8 sm:px-14 lg:px-16 xl:px-20 py-12 z-20 overflow-hidden">
          
          {/* Organic Curved Wave Transition SVG connecting Left & Right */}
          <div className="hidden lg:block absolute inset-y-0 -left-1 w-20 xl:w-28 pointer-events-none z-10">
            <svg
              viewBox="0 0 100 800"
              preserveAspectRatio="none"
              className="w-full h-full text-[#FCFEFD] fill-current"
            >
              {/* Smooth organic bezier curve bowing gracefully into the right side */}
              <path d="M0,0 L0,800 L30,800 C80,620 95,480 35,360 C-15,260 40,120 20,0 Z" />
            </svg>
          </div>

          {/* Subtle Ambient Background Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#0E4940] filter blur-3xl opacity-40 pointer-events-none" />
          <div className="absolute bottom-0 right-10 w-60 h-60 rounded-full bg-[#00A389] filter blur-3xl opacity-20 pointer-events-none" />

          {/* Login Form Container matching the reference image layout */}
          <div className="relative z-20 w-full max-w-md mx-auto lg:mx-0">
            
            {/* Header: LOGIN in bold capital letters matching reference */}
            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-white text-center sm:text-left">
                LOGIN
              </h2>
              <p className="text-xs text-[#8DB8B0] mt-1 text-center sm:text-left">
                Enter your institute account credentials to access your dashboard.
              </p>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div className="mb-6 bg-red-950/80 border border-red-500/50 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-red-200 animate-in fade-in">
                <ShieldAlert size={16} className="text-red-400 shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Username Input Pill (matching reference with circular icon badge) */}
              <div>
                <label className="block text-xs font-semibold text-[#A2CCC4] tracking-wide mb-2 uppercase">
                  Username
                </label>
                <div className="relative flex items-center bg-[#0F3C38] hover:bg-[#124540] focus-within:bg-[#144D47] border border-[#195750] focus-within:border-[#00A389] rounded-full px-3.5 py-2.5 transition shadow-inner">
                  {/* User Avatar Circle Badge */}
                  <div className="w-9 h-9 rounded-full bg-[#082824] flex items-center justify-center text-[#73ACA3] shrink-0 mr-3 shadow-2xs">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Username or email (e.g. admin@demo.csmas)"
                    className="w-full bg-transparent text-white placeholder-[#5D8E86] text-xs sm:text-sm outline-none font-medium"
                  />
                </div>
              </div>

              {/* Password Input Pill (matching reference with lock badge + eye toggle) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-[#A2CCC4] tracking-wide uppercase">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      alert("Please contact your institute system administrator to reset your password.")
                    }
                    className="text-xs text-[#8DB8B0] hover:text-[#C2E5DE] transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center bg-[#0F3C38] hover:bg-[#124540] focus-within:bg-[#144D47] border border-[#195750] focus-within:border-[#00A389] rounded-full px-3.5 py-2.5 transition shadow-inner">
                  {/* Lock Circle Badge */}
                  <div className="w-9 h-9 rounded-full bg-[#082824] flex items-center justify-center text-[#73ACA3] shrink-0 mr-3 shadow-2xs">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-white placeholder-[#5D8E86] text-xs sm:text-sm outline-none font-medium pr-2"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#73ACA3] hover:text-white p-1 transition shrink-0"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Centered Pill Action Button: LOGIN */}
              <div className="pt-2 flex justify-center sm:justify-start">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto min-w-[170px] rounded-full py-3.5 px-9 bg-[#17665E] hover:bg-[#00A389] active:scale-[0.98] disabled:opacity-50 text-white font-bold tracking-widest uppercase text-xs sm:text-sm shadow-lg hover:shadow-[#00A389]/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <span>LOGIN</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Demo Logins Pill Strip */}
            <div className="mt-8 pt-6 border-t border-[#0F3C38]">
              <p className="text-[11px] font-semibold text-[#7DAAA2] uppercase tracking-wider mb-2.5 text-center sm:text-left">
                Instant Demo Logins:
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fillDemo("admin@demo.csmas")}
                  className="px-3 py-1 rounded-full bg-[#0A302D] hover:bg-[#00A389] hover:text-white border border-[#16514A] text-[#9FC8C1] text-xs font-medium transition cursor-pointer"
                >
                  System Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("branchadmin@demo.csmas")}
                  className="px-3 py-1 rounded-full bg-[#0A302D] hover:bg-[#00A389] hover:text-white border border-[#16514A] text-[#9FC8C1] text-xs font-medium transition cursor-pointer"
                >
                  Branch Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("teacher@demo.csmas")}
                  className="px-3 py-1 rounded-full bg-[#0A302D] hover:bg-[#00A389] hover:text-white border border-[#16514A] text-[#9FC8C1] text-xs font-medium transition cursor-pointer"
                >
                  Teacher
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("parent@demo.csmas")}
                  className="px-3 py-1 rounded-full bg-[#0A302D] hover:bg-[#00A389] hover:text-white border border-[#16514A] text-[#9FC8C1] text-xs font-medium transition cursor-pointer"
                >
                  Parent
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("student@demo.csmas")}
                  className="px-3 py-1 rounded-full bg-[#0A302D] hover:bg-[#00A389] hover:text-white border border-[#16514A] text-[#9FC8C1] text-xs font-medium transition cursor-pointer"
                >
                  Student
                </button>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="mt-6 text-center sm:text-left">
              <span className="text-[10px] text-[#558178] uppercase tracking-widest font-semibold">
                CSMAS Institute Management System • Powered by VERTICAL
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
