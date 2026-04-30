"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, ArrowRight, Star, ChevronRight, ChevronLeft, BadgeCheck, Play, Smartphone, Check, CreditCard, Building2, PartyPopper, Clock, User } from 'lucide-react';

export default function ThayyaPlatform() {
  const [role, setRole] = useState('member');
  const [pages, setPages] = useState({ member: 'discover', instructor: 'today', admin: 'overview' });
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [workshops, setWorkshops] = useState([]);
  const [isLoadingWorkshops, setIsLoadingWorkshops] = useState(true);
  const [workshopsError, setWorkshopsError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error.message);
        setUser(null);
        return;
      }
      setUser(data?.user ?? null);
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchWorkshops = async () => {
      setIsLoadingWorkshops(true);
      setWorkshopsError('');

      const { data, error } = await supabase
        .from('workshops')
        .select('*');

      if (error) {
        setWorkshops([]);
        setWorkshopsError(error.message || 'Unable to fetch workshops.');
        console.error('Error fetching workshops table:', error);
        setIsLoadingWorkshops(false);
        return;
      }

      setWorkshops(Array.isArray(data) ? data : []);
      setIsLoadingWorkshops(false);
      console.log('Workshops loaded from Supabase workshops table:', data);
    };
    fetchWorkshops();
  }, []);
  const switchRole = (newRole) => {
    setRole(newRole);
    if (newRole === 'member') setCheckoutStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showPage = (targetRole, targetPage) => {
    if (role !== targetRole) switchRole(targetRole);
    setPages({ ...pages, [targetRole]: targetPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const completeBooking = () => setCheckoutStep(2);
  const formatWorkshopDate = (dateValue) => {
    if (!dateValue) return 'Date not available';
    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime()) ? String(dateValue) : parsedDate.toLocaleString();
  };
  const formatWorkshopPrice = (priceValue) => {
    if (priceValue === null || priceValue === undefined || priceValue === '') return 'Price unavailable';
    return typeof priceValue === 'number' ? `₹${priceValue}` : String(priceValue);
  };
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      return;
    }
    window.location.reload();
  };

  // Reusable Nav Pill component
  const NavPill = ({ label, targetPage }) => {
    const isActive = pages[role] === targetPage;
    return (
      <button 
        onClick={() => showPage(role, targetPage)} 
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isActive ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-soft)] hover:text-black'}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen">
      {/* TOP HEADER BAR */}
      <header className="border-b sticky top-0 z-40 backdrop-blur-md" style={{ background: 'rgba(250, 248, 244, 0.92)', borderColor: 'var(--line)' }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* The Logo will pull from your public folder */}
            <img src="/Logo.jpg" alt="Thayya Official Logo" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'white', border: '1px solid var(--line)' }}>
              <button onClick={() => switchRole('member')} className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all ${role === 'member' ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-soft)]'}`}>Member</button>
              <button onClick={() => switchRole('instructor')} className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all ${role === 'instructor' ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-soft)]'}`}>Instructor</button>
              <button onClick={() => switchRole('admin')} className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all ${role === 'admin' ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-soft)]'}`}>Admin</button>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'white', border: '1px solid var(--line)' }}
                  aria-label="User Profile"
                  title="User Profile"
                >
                  <User className="w-4 h-4" style={{ color: 'var(--ink-soft)' }} />
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold"
                  style={{ background: 'white', border: '1px solid var(--line)', color: 'var(--ink)' }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                className="px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold"
                style={{ background: 'white', border: '1px solid var(--line)', color: 'var(--ink)' }}
              >
                Log In
              </button>
            )}
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pb-2 flex items-center justify-between">
          <div className="text-[10px] md:text-[11px] tracking-[0.25em] uppercase font-medium" style={{ color: 'var(--ink-muted)' }}>Move · Rise · Shine</div>
          <div className="text-[10px] md:text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>Prototype · Switch portals to explore</div>
        </div>
      </header>

      {/* ============= MEMBER PORTAL ============= */}
      {role === 'member' && (
        <section className="portal">
          <nav className="border-b sticky top-[73px] z-30" style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}>
            <div className="max-w-[1400px] mx-auto px-4 md:px-6 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 py-2 min-w-max">
                <NavPill label="Discover" targetPage="discover" />
                <NavPill label="Instructor Page" targetPage="instructor" />
                <NavPill label="Book Workshop" targetPage="book" />
                <NavPill label="My Bookings" targetPage="bookings" />
                <NavPill label="Membership" targetPage="membership" />
              </div>
            </div>
          </nav>

          {/* DISCOVER */}
          {pages.member === 'discover' && (
            <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
              <div className="mb-10 md:mb-14">
                <div className="text-[11px] tracking-[0.25em] uppercase mb-3 font-semibold" style={{ color: 'var(--ink-muted)' }}>Bangalore · This week</div>
                <h1 className="font-display text-4xl md:text-7xl font-bold leading-[1.05] mb-4">
                  Find your <span className="gradient-text">rhythm</span>.<br/>
                  Move with your <span className="font-brush" style={{ color: 'var(--t-magenta)' }}>tribe</span>.
                </h1>
                <p className="text-base md:text-lg max-w-xl" style={{ color: 'var(--ink-soft)' }}>Indian dance fitness, taught by India's best instructors. Book a workshop, sweat to a Bollywood beat, then do it again tomorrow.</p>
              </div>

              <div className="mb-12 flex items-center gap-2 p-2 rounded-full" style={{ background: 'white', border: '1px solid var(--line)', boxShadow: '0 4px 16px rgba(10,10,10,0.04)' }}>
                <Search className="w-5 h-5 ml-3" style={{ color: 'var(--ink-muted)' }} />
                <input placeholder="Search instructors, styles, or workshops" className="flex-1 px-2 py-2 bg-transparent text-sm md:text-base outline-none" />
                <button className="gradient-bg-warm text-white px-4 md:px-5 py-2 rounded-full text-sm font-semibold">Search</button>
              </div>

              <div className="mb-12">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <div className="text-[10px] tracking-[0.25em] uppercase mb-1 font-semibold" style={{ color: 'var(--ink-muted)' }}>Featured · April</div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold">Instructors near you</h2>
                  </div>
                  <button className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--t-magenta)' }}>View all <ArrowRight className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {[
                    { av: 'av-1', tag: 'Bollywood', ini: 'AK', rating: '4.9', loc: 'Bangalore', name: 'Anaya Krishnan', style: 'Bharatanatyam Fusion' },
                    { av: 'av-2', tag: 'Cardio', ini: 'RM', rating: '4.8', loc: 'Mumbai', name: 'Rohan Mehta', style: 'Bombay Bounce' },
                    { av: 'av-3', tag: 'Classical', ini: 'PN', rating: '5.0', loc: 'Chennai', name: 'Priya Nair', style: 'Mohiniyattam Flow' },
                    { av: 'av-4', tag: 'HIIT', ini: 'KI', rating: '4.7', loc: 'Pune', name: 'Karthik Iyer', style: 'Kuchipudi HIIT' }
                  ].map((inst, i) => (
                    <button key={i} onClick={() => showPage('member','instructor')} className="text-left lift">
                      <div className={`aspect-[3/4] rounded-2xl mb-3 relative overflow-hidden ${inst.av} grain`}>
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/25 backdrop-blur text-white">{inst.tag}</span>
                        <div className="absolute inset-0 flex items-center justify-center"><span className="font-display text-6xl font-bold text-white/95">{inst.ini}</span></div>
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
                          <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-white" />{inst.rating}</span>
                          <span>{inst.loc}</span>
                        </div>
                      </div>
                      <div className="font-display text-base md:text-lg font-bold">{inst.name}</div>
                      <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>{inst.style}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <div className="text-[10px] tracking-[0.25em] uppercase mb-1 font-semibold" style={{ color: 'var(--ink-muted)' }}>Open spots</div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold">Workshops this week</h2>
                  </div>
                </div>
                {workshopsError && (
                  <p className="text-sm mb-3" style={{ color: 'var(--t-red)' }}>
                    Could not load live workshops: {workshopsError}
                  </p>
                )}
                <div className="space-y-3">
                  {isLoadingWorkshops ? (
                    <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                      Loading...
                    </p>
                  ) : workshops.length > 0 ? workshops.map((ws, i) => (
                    <button key={ws.id || i} onClick={() => showPage('member','book')} className="w-full text-left lift p-4 rounded-2xl flex items-center gap-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
                      <div className={`w-12 h-12 rounded-full av-${(i % 4) + 1} flex items-center justify-center text-white font-display font-bold text-sm shrink-0`}>
                        {(ws.title || 'W').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-base md:text-lg font-bold truncate">{ws.title || 'Untitled workshop'}</div>
                        <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                          {ws.instructor || ws.instructor_name || 'Instructor TBA'} · {formatWorkshopDate(ws.date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-base md:text-lg font-bold gradient-text">{formatWorkshopPrice(ws.price)}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 hidden md:block" style={{ color: 'var(--ink-muted)' }} />
                    </button>
                  )) : (
                    <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                      No workshops available right now.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* INSTRUCTOR PROFILE */}
          {pages.member === 'instructor' && (
            <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
              <button onClick={() => showPage('member','discover')} className="flex items-center gap-1 text-sm mb-6" style={{ color: 'var(--ink-soft)' }}><ChevronLeft className="w-4 h-4" /> Back</button>
              <div className="grid md:grid-cols-3 gap-8 md:gap-10 items-start mb-12">
                <div className="aspect-square rounded-3xl av-1 grain relative max-w-[320px] mx-auto md:mx-0">
                  <div className="w-full h-full flex items-center justify-center font-display text-7xl md:text-8xl font-bold text-white/95">AK</div>
                  <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" style={{ color: 'var(--t-magenta)' }} /> Certified
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-[11px] tracking-[0.25em] uppercase mb-3 font-semibold" style={{ color: 'var(--ink-muted)' }}>Bangalore · Bharatanatyam Fusion</div>
                  <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 leading-[1.05]">Anaya <span className="gradient-text">Krishnan</span></h1>
                  <p className="text-base mb-6 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>Twelve years of classical training meets the joy of a Friday-night dance floor. I teach in English, Tamil, and Hindi — bring your energy, leave with your tribe.</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm mb-6">
                    <span className="flex items-center gap-1 font-semibold"><Star className="w-4 h-4 fill-current" style={{ color: 'var(--t-orange)' }} /> 4.9 · 142 reviews</span>
                    <span style={{ color: 'var(--ink-muted)' }}>·</span>
                    <span className="font-semibold">1,400+ students taught</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="gradient-bg-warm text-white px-5 py-2.5 rounded-full text-sm font-bold">Follow</button>
                    <button className="px-5 py-2.5 rounded-full text-sm font-bold border" style={{ borderColor: 'var(--line)', background: 'white' }}>Refer a friend</button>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[10px] tracking-[0.25em] uppercase mb-1 font-semibold" style={{ color: 'var(--ink-muted)' }}>Schedule</div>
                <h2 className="font-display text-2xl md:text-3xl font-bold">Upcoming workshops</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { title: 'Bollywood Cardio', time: 'Mon 27 Apr · 6:30 PM', price: '₹450', spots: '7 spots', color: 'var(--t-red)', style: { background: 'white', border: '1px solid var(--line)' } },
                  { title: 'Aaja Nachle Intensive', time: 'Wed 29 Apr · 7:00 PM', price: '₹600', spots: '3 spots · almost full', color: 'var(--t-red)', style: { background: 'white' }, classes: 'gradient-border' },
                  { title: 'Saturday Morning Flow', time: 'Sat 02 May · 8:00 AM', price: '₹350', spots: '22 spots', color: 'var(--t-teal)', style: { background: 'white', border: '1px solid var(--line)' } }
                ].map((ws, i) => (
                  <button key={i} onClick={() => showPage('member','book')} className={`lift text-left p-5 rounded-2xl ${ws.classes || ''}`} style={ws.style}>
                    <div className="font-display text-lg font-bold mb-1">{ws.title}</div>
                    <div className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>{ws.time}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xl font-bold gradient-text">{ws.price}</span>
                      <span className="text-xs font-semibold" style={{ color: ws.color }}>{ws.spots}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BOOK WORKSHOP */}
          {pages.member === 'book' && (
            <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
              <button onClick={() => showPage('member','instructor')} className="flex items-center gap-1 text-sm mb-6" style={{ color: 'var(--ink-soft)' }}><ChevronLeft className="w-4 h-4" /> Back to instructor</button>
              <div className="grid md:grid-cols-5 gap-6 md:gap-8">
                <div className="md:col-span-3">
                  <div className="text-[11px] tracking-[0.25em] uppercase mb-2 font-semibold" style={{ color: 'var(--ink-muted)' }}>Workshop</div>
                  <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 leading-[1.05]">Aaja Nachle <span className="gradient-text">Intensive</span></h1>
                  <div className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>With Anaya Krishnan · Wed 29 April · 7:00 PM · Indiranagar Studio</div>
                  <div className="aspect-video rounded-2xl mb-6 av-1 grain relative flex items-center justify-center cursor-pointer">
                    <div className="w-16 h-16 rounded-full bg-white/25 backdrop-blur flex items-center justify-center"><Play className="w-7 h-7 fill-white text-white" /></div>
                    <span className="absolute bottom-3 right-3 text-white text-xs font-medium">2:14 preview</span>
                  </div>
                  <p className="text-sm md:text-base mb-5 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>A 90-minute deep dive into the April choreography drop. We'll break down each section, drill the formations, then end with a full run-through. Open to all levels with prior dance experience.</p>
                  <div className="flex flex-wrap gap-2">
                    {['90 minutes', 'All levels', 'Bring water', 'AC studio'].map((tag, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider" style={{ background: 'var(--bg-warm)', color: 'var(--ink-soft)' }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="rounded-2xl p-6 md:sticky md:top-32" style={{ background: 'white', border: '1px solid var(--line)', boxShadow: '0 8px 32px rgba(10,10,10,0.06)' }}>
                    {checkoutStep === 1 ? (
                      <div>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-display text-3xl md:text-4xl font-bold">₹600</span>
                          <span className="text-xs font-bold" style={{ color: 'var(--t-red)' }}>3 spots left</span>
                        </div>
                        <div className="text-xs mb-6" style={{ color: 'var(--ink-muted)' }}>per person · all taxes included</div>
                        <div className="text-[10px] tracking-[0.2em] uppercase mb-3 font-semibold" style={{ color: 'var(--ink-muted)' }}>Pay with</div>
                        <div className="space-y-2 mb-5">
                          <button className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold gradient-border" style={{ background: 'var(--bg-warm)' }}>
                            <span className="flex items-center gap-2"><span className="w-7 h-7 rounded gradient-bg-cool flex items-center justify-center"><Smartphone className="w-3.5 h-3.5 text-white" /></span> UPI · GPay, PhonePe</span>
                            <Check className="w-4 h-4" style={{ color: 'var(--t-magenta)' }} />
                          </button>
                          <button className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--line)' }}>
                            <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" style={{ color: 'var(--ink-muted)' }} /> Credit / Debit Card</span>
                          </button>
                          <button className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--line)' }}>
                            <span className="flex items-center gap-2"><Building2 className="w-4 h-4" style={{ color: 'var(--ink-muted)' }} /> Net Banking</span>
                          </button>
                        </div>
                        <button onClick={completeBooking} className="w-full py-3.5 rounded-full text-sm font-bold text-white gradient-bg-warm">Pay ₹600 via UPI →</button>
                        <div className="text-[10px] mt-3 text-center" style={{ color: 'var(--ink-muted)' }}>Secured by Razorpay · 256-bit encryption</div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center pulse-gold" style={{ background: 'var(--t-teal)' }}>
                          <PartyPopper className="w-7 h-7 text-white" />
                        </div>
                        <div className="font-display text-2xl font-bold mb-1">You're in!</div>
                        <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>Confirmation sent via WhatsApp</div>
                        <div className="text-xs font-bold mb-5 gradient-text inline-block">+25 loyalty points earned</div>
                        <button onClick={() => showPage('member','bookings')} className="w-full py-3 rounded-full text-sm font-bold text-white" style={{ background: 'var(--ink)' }}>View my bookings</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MY BOOKINGS */}
          {pages.member === 'bookings' && (
            <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
              <div className="mb-8">
                <div className="text-[10px] tracking-[0.25em] uppercase mb-2 font-semibold" style={{ color: 'var(--ink-muted)' }}>Yours</div>
                <h1 className="font-display text-3xl md:text-5xl font-bold">My Bookings</h1>
              </div>
              <div className="text-[10px] tracking-[0.2em] uppercase mb-3 font-bold" style={{ color: 'var(--ink-muted)' }}>Upcoming</div>
              <div className="space-y-3 mb-8">
                <div className="p-5 rounded-2xl flex items-center gap-4 lift" style={{ background: 'white', border: '1px solid var(--line)' }}>
                  <div className="text-center w-14 shrink-0"><div className="font-display text-3xl font-bold leading-none gradient-text">29</div><div className="text-[10px] tracking-wider mt-1 font-semibold" style={{ color: 'var(--ink-muted)' }}>APR</div></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base md:text-lg font-bold truncate">Aaja Nachle Intensive</div>
                    <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>Anaya Krishnan · Wed · 7:00 PM</div>
                  </div>
                  <div className="font-display text-base font-bold">₹600</div>
                </div>
                <div className="p-5 rounded-2xl flex items-center gap-4 lift" style={{ background: 'white', border: '1px solid var(--line)' }}>
                  <div className="text-center w-14 shrink-0"><div className="font-display text-3xl font-bold leading-none gradient-text">02</div><div className="text-[10px] tracking-wider mt-1 font-semibold" style={{ color: 'var(--ink-muted)' }}>MAY</div></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base md:text-lg font-bold truncate">Saturday Morning Flow</div>
                    <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>Anaya Krishnan · Sat · 8:00 AM</div>
                  </div>
                  <div className="font-display text-base font-bold">₹350</div>
                </div>
              </div>
            </div>
          )}

          {/* MEMBERSHIP */}
          {pages.member === 'membership' && (
            <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
              <div className="mb-8">
                <div className="text-[10px] tracking-[0.25em] uppercase mb-2 font-semibold" style={{ color: 'var(--ink-muted)' }}>Your Tribe</div>
                <h1 className="font-display text-3xl md:text-5xl font-bold">Membership</h1>
              </div>
              <div className="rounded-3xl p-8 md:p-10 mb-6 grain relative overflow-hidden" style={{ background: 'var(--ink)' }}>
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 gradient-bg blur-3xl"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <div className="text-[10px] tracking-[0.25em] uppercase mb-1 font-bold" style={{ color: 'var(--t-orange)' }}>Thayya Member · Marigold Tier</div>
                      <div className="font-brush text-2xl md:text-3xl text-white/90 mt-1">The tribe is rising</div>
                    </div>
                    <Award className="w-7 h-7 md:w-9 md:h-9" style={{ color: 'var(--t-gold)' }} />
                  </div>
                  <div className="font-display text-5xl md:text-7xl font-bold text-white mb-2">1,240</div>
                  <div className="text-sm md:text-base mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>loyalty points · ₹620 redeemable credit</div>
                  <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.12)' }}><div className="h-full rounded-full gradient-bg" style={{ width: '62%' }}></div></div>
                  <div className="text-xs font-medium" style={{ color: 'var(--t-gold)' }}><strong>760 points</strong> to <strong>Tabla Tier</strong></div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl lift" style={{ background: 'white', border: '1px solid var(--line)' }}>
                  <Heart className="w-6 h-6 mb-3" style={{ color: 'var(--t-red)' }} />
                  <div className="font-display text-xl font-bold mb-1">Refer a friend</div>
                  <div className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>Both of you earn 200 points when they book their first workshop.</div>
                  <button className="text-sm font-bold flex items-center gap-1" style={{ color: 'var(--t-magenta)' }}>Get my code <ArrowRight className="w-4 h-4" /></button>
                </div>
                <div className="p-6 rounded-2xl lift gradient-border" style={{ background: 'white' }}>
                  <Sparkles className="w-6 h-6 mb-3" style={{ color: 'var(--t-orange)' }} />
                  <div className="font-display text-xl font-bold mb-1">Studio Membership</div>
                  <div className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>₹1,999/month · 8 workshops + earn 2x points + priority booking.</div>
                  <button className="text-sm font-bold text-white px-4 py-2 rounded-full gradient-bg-warm">Upgrade →</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============= INSTRUCTOR PORTAL ============= */}
      {role === 'instructor' && (
        <section className="portal">
          <nav className="border-b sticky top-[73px] z-30" style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}>
            <div className="max-w-[1400px] mx-auto px-4 md:px-6 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 py-2 min-w-max">
                <NavPill label="Today" targetPage="today" />
                <NavPill label="Content Library" targetPage="library" />
                <NavPill label="My Workshops" targetPage="workshops" />
                <NavPill label="My Students" targetPage="students" />
                <NavPill label="Earnings" targetPage="earnings" />
                <NavPill label="Public Page" targetPage="public" />
              </div>
            </div>
          </nav>

          {/* TODAY */}
          {pages.instructor === 'today' && (
            <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
              <div className="mb-8">
                <div className="text-[10px] tracking-[0.25em] uppercase mb-2 font-semibold" style={{ color: 'var(--ink-muted)' }}>Monday, 27 April · Bangalore</div>
                <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05]">Good morning, <span className="gradient-text">Anaya</span>.<br/><span className="font-brush text-3xl md:text-5xl" style={{ color: 'var(--t-magenta)' }}>let's move</span>.</h1>
              </div>

              <div className="rounded-3xl mb-6 grain relative overflow-hidden" style={{ background: 'var(--ink)' }}>
                <div className="absolute inset-0 opacity-60" style={{ background: 'linear-gradient(115deg, transparent 0%, rgba(155,42,142,0.4) 50%, rgba(31,169,160,0.5) 100%)' }}></div>
                <div className="grid md:grid-cols-2 relative">
                  <div className="p-8 md:p-12">
                    <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-4" style={{ background: 'rgba(245,130,32,0.18)', color: 'var(--t-orange)' }}>New · April Drop</div>
                    <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4 leading-[1.05]">Aaja Nachle <span className="font-brush gradient-text" style={{ fontSize: '0.9em' }}>2.0</span></h2>
                    <p className="text-sm md:text-base mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>Eight new choreographies. Twelve curated tracks. Released first Friday of every month — yours to teach for life.</p>
                    <button onClick={() => showPage('instructor','library')} className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold gradient-bg-warm text-white"><Play className="w-4 h-4 fill-current" /> Open Library</button>
                  </div>
                  <div className="hidden md:flex items-center justify-center p-12 relative">
                    <div className="absolute inset-8 rounded-2xl gradient-bg-vivid opacity-90"></div>
                    <div className="font-display font-bold text-[180px] leading-none text-white/90 relative">04</div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2 p-6 rounded-2xl" style={{ background: 'white', border: '1px solid var(--line)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-[10px] tracking-[0.2em] uppercase font-bold" style={{ color: 'var(--ink-muted)' }}>Next Workshop</div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(232,51,77,0.12)', color: 'var(--t-red)' }}>In 4 hours</span>
                  </div>
                  <div className="font-display text-xl md:text-2xl font-bold mt-2 mb-1">Bollywood Cardio · Beginner</div>
                  <div className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>6:30 PM at Whitefield Studio · 18 of 25 booked</div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--line-soft)' }}><div className="h-full rounded-full gradient-bg-warm" style={{ width: '72%' }}></div></div>
                </div>
                <div className="p-6 rounded-2xl" style={{ background: 'white', border: '1px solid var(--line)' }}>
                  <div className="text-[10px] tracking-[0.2em] uppercase mb-3 font-bold" style={{ color: 'var(--ink-muted)' }}>This Month</div>
                  <div className="font-display text-3xl md:text-4xl font-bold gradient-text">₹68,400</div>
                  <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: 'var(--t-teal)' }}><ArrowUpRight className="w-3 h-3" /> +22% vs March</div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other tabs to keep the file size manageable */}
          {pages.instructor !== 'today' && (
             <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
               <div className="font-display text-2xl font-bold text-center text-gray-400 mt-20">Click 'Today' to see the main Instructor dashboard, or switch to Member/Admin.</div>
             </div>
          )}

        </section>
      )}

      {/* ============= ADMIN PORTAL ============= */}
      {role === 'admin' && (
        <section className="portal">
          <nav className="border-b sticky top-[73px] z-30" style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}>
            <div className="max-w-[1400px] mx-auto px-4 md:px-6 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 py-2 min-w-max">
                <NavPill label="Overview" targetPage="overview" />
                <NavPill label="Content Drops" targetPage="content" />
                <NavPill label="Instructors" targetPage="instructors" />
                <NavPill label="Commission" targetPage="commission" />
                <NavPill label="Members" targetPage="members" />
              </div>
            </div>
          </nav>

          {/* OVERVIEW */}
          {pages.admin === 'overview' && (
            <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
              <div className="rounded-3xl mb-8 grain relative overflow-hidden" style={{ background: 'var(--ink)', minHeight: '200px' }}>
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-40 spark" style={{ background: 'radial-gradient(circle, var(--t-gold) 0%, transparent 70%)', filter: 'blur(40px)' }}></div>
                <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-30 spark" style={{ background: 'radial-gradient(circle, var(--t-orange) 0%, transparent 70%)', filter: 'blur(40px)', animationDelay: '1s' }}></div>
                <div className="relative p-8 md:p-12 grid md:grid-cols-5 gap-6 items-center">
                  <div className="md:col-span-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.25em] uppercase mb-4" style={{ background: 'rgba(212, 160, 39, 0.18)', color: 'var(--t-gold)' }}>
                      <PartyPopper className="w-3.5 h-3.5" /> First Milestone Unlocked
                    </div>
                    <h2 className="font-display font-bold text-white leading-[0.95] mb-3" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>
                      <span style={{ color: 'var(--t-gold)' }}>50</span> Instructors
                    </h2>
                    <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">Registered.</h3>
                    <p className="font-brush text-3xl md:text-4xl mb-4" style={{ color: 'var(--t-gold)' }}>The tribe is rising.</p>
                  </div>
                  <div className="md:col-span-2 hidden md:flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, var(--t-gold) 0%, transparent 60%)', filter: 'blur(30px)' }}></div>
                    <div className="relative"><div className="font-display font-black text-[200px] leading-none" style={{ color: 'var(--t-gold)', textShadow: '0 4px 24px rgba(212, 160, 39, 0.4)' }}>50</div></div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[10px] tracking-[0.25em] uppercase mb-2 font-semibold" style={{ color: 'var(--ink-muted)' }}>Platform Overview · April 2026</div>
                <h1 className="font-display text-3xl md:text-5xl font-bold leading-[1.05]">The network is <span className="gradient-text">thriving</span>.</h1>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                <div className="p-5 rounded-2xl" style={{ background: 'white', border: '1px solid var(--line)' }}>
                  <div className="flex items-start justify-between mb-5">
                    <UsersRound className="w-4 h-4" style={{ color: 'var(--ink-muted)' }} />
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(31,169,160,0.12)', color: 'var(--t-teal)' }}>+12%</span>
                  </div>
                  <div className="font-display text-2xl md:text-3xl font-bold mb-1">284</div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>Active Instructors</div>
                </div>
                <div className="p-5 rounded-2xl" style={{ background: 'white', border: '1px solid var(--line)' }}>
                  <div className="flex items-start justify-between mb-5">
                    <TrendingUp className="w-4 h-4" style={{ color: 'var(--ink-muted)' }} />
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(31,169,160,0.12)', color: 'var(--t-teal)' }}>+18%</span>
                  </div>
                  <div className="font-display text-2xl md:text-3xl font-bold mb-1">₹14.2L</div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>Monthly Recurring Rev</div>
                </div>
                <div className="p-5 rounded-2xl" style={{ background: 'white', border: '1px solid var(--line)' }}>
                  <div className="flex items-start justify-between mb-5">
                    <IndianRupee className="w-4 h-4" style={{ color: 'var(--ink-muted)' }} />
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(31,169,160,0.12)', color: 'var(--t-teal)' }}>+24%</span>
                  </div>
                  <div className="font-display text-2xl md:text-3xl font-bold mb-1">₹47.8L</div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>GMV This Month</div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other Admin tabs */}
           {pages.admin !== 'overview' && (
             <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
               <div className="font-display text-2xl font-bold text-center text-gray-400 mt-20">Click 'Overview' to see the main Admin dashboard.</div>
             </div>
          )}

        </section>
      )}

      {/* Footer */}
      <footer className="border-t mt-12 py-8" style={{ borderColor: 'var(--line)', background: 'var(--bg-warm)' }}>
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-brush text-3xl gradient-text">Move. Rise. Shine.</span>
          </div>
          <div className="text-[11px] tracking-wider uppercase text-center md:text-right" style={{ color: 'var(--ink-muted)' }}>
            © 2026 Thayya · Made in India · Next.js Live Prototype
          </div>
        </div>
      </footer>
    </div>
  );
}