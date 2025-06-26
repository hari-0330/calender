import React, { useState, useEffect } from 'react';
import './App.css';
import { auth, GoogleAuthProvider, signInWithPopup, signOut } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const YEARS = Array.from({ length: 2050 - 1980 + 1 }, (_, i) => 1980 + i);
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function getToday() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

function getUpcomingEvents(events, year, month, day) {
  const all = [];
  Object.entries(events).forEach(([key, evs]) => {
    const [y, m, d] = key.split('-').map(Number);
    evs.forEach((ev, idx) => {
      all.push({ year: y, month: m, day: d, text: ev, key: `${key}-${idx}` });
    });
  });
  all.sort((a, b) => {
    const da = new Date(a.year, a.month - 1, a.day);
    const db = new Date(b.year, b.month - 1, b.day);
    return da - db;
  });
  const now = new Date(year, month, day);
  return all.filter(ev => new Date(ev.year, ev.month - 1, ev.day) >= now).slice(0, 5);
}

export default function App() {
  const today = getToday();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [selectedDay, setSelectedDay] = useState(today.day);
  const [events, setEvents] = useState({});
  const [eventInput, setEventInput] = useState('');
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
      } else {
        setIdToken('');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };
  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchEvents = async () => {
    if (!idToken) return;
    const res = await fetch(`https://calender-9oup.onrender.com/api/events?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    const data = await res.json();
    const evMap = {};
    data.forEach(ev => {
      evMap[`${year}-${month + 1}-${ev.day}`] = ev.events;
    });
    setEvents(evMap);
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line
  }, [year, month, idToken]);

  const handleAddEvent = async () => {
    if (!selectedDay || !eventInput.trim() || !idToken) return;
    await fetch('https://calender-9oup.onrender.com/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        year,
        month,
        day: selectedDay,
        event: eventInput
      })
    });
    setEventInput('');
    fetchEvents();
  };

  const handleEditEvent = (idx) => {
    setEditIdx(idx);
    setEditValue(events[selectedKey][idx]);
  };
  const handleEditSave = async () => {
    if (!idToken || editIdx === null) return;
    const updated = [...events[selectedKey]];
    updated[editIdx] = editValue;
    await handleReplaceEvents(updated);
    setEditIdx(null);
    setEditValue('');
  };
  const handleDeleteEvent = async (idx) => {
    if (!idToken) return;
    const updated = events[selectedKey].filter((_, i) => i !== idx);
    await handleReplaceEvents(updated);
  };
  const handleReplaceEvents = async (newEvents) => {
    await fetch('https://calender-9oup.onrender.com/api/events', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        year,
        month,
        day: selectedDay,
        events: newEvents
      })
    });
    fetchEvents();
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
      setSelectedDay(null);
    } else {
      setMonth(m => m - 1);
      setSelectedDay(null);
    }
  };
  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
      setSelectedDay(null);
    } else {
      setMonth(m => m + 1);
      setSelectedDay(null);
    }
  };

  const renderDays = () => {
    const days = [];
    const firstDayOfWeek = getFirstDayOfWeek(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="bg-transparent"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${month + 1}-${d}`;
      const isToday = year === today.year && month === today.month && d === today.day;
      const isSelected = selectedDay === d;
      // Weekend coloring
      const weekDay = (firstDayOfWeek + d - 1) % 7;
      let colorClass = 'bg-white text-gray-800';
      if (weekDay === 0) colorClass = 'bg-red-50 text-red-500'; // Sunday
      if (weekDay === 6) colorClass = 'bg-blue-50 text-blue-500'; // Saturday
      if (isToday) colorClass = 'bg-blue-200 text-yellow-900 border-red-400 ring-2 ring-red-400';
      if (isSelected) colorClass = 'bg-blue-500 text-white border-blue-700 scale-105 shadow-lg';
      days.push(
        <button
          key={d}
          className={`rounded-lg border p-2 flex flex-col items-center justify-center h-16 sm:h-20 md:h-24 transition-all duration-200 font-semibold text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${colorClass} hover:bg-blue-100`}
          onClick={() => setSelectedDay(d)}
        >
          <span>{d}</span>
          {events[key] && events[key].length > 0 && (
            <span className="mt-1 text-xs text-green-600 animate-fade-in">{events[key].length} event{events[key].length > 1 ? 's' : ''}</span>
          )}
        </button>
      );
    }
    return days;
  };

  const selectedKey = selectedDay ? `${year}-${month + 1}-${selectedDay}` : null;
  const upcoming = getUpcomingEvents(events, year, month, today.day);

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-blue-200">
      {/* Mobile sidebar toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-30 bg-blue-600 text-white p-2 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
      </button>
      {/* Sidebar */}
      <aside className={`fixed md:static top-0 left-0 h-full w-72 max-w-full bg-white/90 shadow-2xl p-4 sm:p-6 flex flex-col gap-8 border-r border-blue-100 z-20 transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 animate-fade-in-left`}
        style={{ minHeight: '100vh' }}
      >
        <div className="hidden md:block h-8"></div>
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-2">Upcoming Events</h2>
          <ul className="space-y-2">
            {upcoming.length === 0 && <li className="text-gray-400">No upcoming events.</li>}
            {upcoming.map(ev => (
              <li key={ev.key} className="flex items-center gap-2 text-sm text-gray-700 animate-fade-in">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{ev.text}</span>
                <span className="ml-auto text-xs text-blue-500">{MONTHS[ev.month-1]} {ev.day}, {ev.year}</span>
              </li>
            ))}
          </ul>
          
        </div>
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-2">Selected Day Events</h2>
          <ul className="space-y-2">
            {(events[selectedKey] || []).length === 0 && <li className="text-gray-400">No events for this day.</li>}
            {(events[selectedKey] || []).map((ev, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-gray-700 animate-fade-in">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                {editIdx === idx ? (
                  <>
                    <input
                      className="border rounded px-1 py-0.5 text-xs"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); }}
                      autoFocus
                    />
                    <button className="text-blue-500 text-xs" onClick={handleEditSave}>Save</button>
                    <button className="text-gray-400 text-xs" onClick={() => setEditIdx(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span>{ev}</span>
                    {user && (
                      <>
                        <button className="text-yellow-500 text-xs" onClick={() => handleEditEvent(idx)}>Edit</button>
                        <button className="text-red-500 text-xs" onClick={() => handleDeleteEvent(idx)}>Delete</button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 sm:mt-6">
            {selectedDay ? (
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg shadow-inner animate-fade-in">
                <h2 className="text-base sm:text-lg font-bold mb-2">Events for {MONTHS[month]} {selectedDay}, {year}</h2>
                <ul className="mb-2">
                  {(events[selectedKey] || []).map((ev, idx) => (
                    <li key={idx} className="text-gray-700 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                      {ev}
                    </li>
                  ))}
                  
                </ul>
                {user ? (
                  <div className="flex gap-1 flex-col ">
                    <input
                      className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                      type="text"
                      placeholder="Add event..."
                      value={eventInput}
                      onChange={e => setEventInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddEvent(); }}
                    />
                    <button
                      className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 transition text-sm"
                      onClick={handleAddEvent}
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">Login to add events.</div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center">Select a day to view or add events.</div>
            )}
          </div>
      </aside>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-30 z-10 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
      {/* Main Calendar */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-8 animate-fade-in min-w-0">
        <div className="w-full max-w-4xl">
          {/* Month navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
            <div className="flex gap-2 items-center flex-wrap">
              <button
                className="rounded-full bg-blue-100 hover:bg-blue-300 text-blue-700 p-2 transition shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={handlePrevMonth}
                aria-label="Previous month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="font-bold text-lg sm:text-xl text-blue-700 px-2 bg-blue-50 hover:bg-blue-100 rounded transition select-none flex items-center gap-1">
                <button
                  className="hover:bg-blue-200 bg-blue-100 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  onClick={() => setShowMonthPicker(true)}
                  aria-label="Select month"
                >
                  {MONTHS[month]}
                </button>
                {' '}
                <button
                  className="hover:bg-blue-200 bg-blue-100 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  onClick={() => setShowYearPicker(true)}
                  aria-label="Select year"
                >
                  {year}
                </button>
              </span>
              <button
                className="rounded-full bg-blue-100 hover:bg-blue-300 text-blue-700 p-2 transition shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />
                  <span className="hidden sm:inline text-sm font-medium">{user.displayName}</span>
                  <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded text-xs sm:text-sm">Logout</button>
                </div>
              ) : (
                <button onClick={handleLogin} className="bg-green-500 text-white px-3 py-1 rounded text-xs sm:text-sm">Login with Google</button>
              )}
            </div>
          </div>
          {/* Month Picker Modal */}
          {showMonthPicker && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30 animate-fade-in">
              <div className="bg-blue-50 rounded-lg shadow-xl p-6 w-80 max-w-full flex flex-col gap-4 animate-fade-in">
                <h3 className="text-lg font-bold text-blue-700 mb-2 text-center">Select Month</h3>
                <div className="grid grid-cols-3 gap-3 justify-items-center">
                  {MONTHS.map((m, idx) => (
                    <button
                      key={m}
                      className={`w-full py-2 rounded ${idx === month ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                      onClick={() => {
                        setMonth(idx);
                        setSelectedDay(null);
                        setShowMonthPicker(false);
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  className="bg-gray-200 text-gray-700 px-4 py-1 rounded hover:bg-gray-300 transition mt-2"
                  onClick={() => setShowMonthPicker(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Year Picker Modal */}
          {showYearPicker && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30 animate-fade-in">
              <div className="bg-blue-50 rounded-lg shadow-xl p-6 w-72 max-w-full flex flex-col gap-4 animate-fade-in">
                <h3 className="text-lg font-bold text-blue-700 mb-2 text-center">Select Year</h3>
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto justify-items-center">
                  {YEARS.map(y => (
                    <button
                      key={y}
                      className={`w-full py-2 rounded ${y === year ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                      onClick={() => {
                        setYear(y);
                        setSelectedDay(null);
                        setShowYearPicker(false);
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
                <button
                  className="bg-gray-200 text-gray-700 px-4 py-1 rounded hover:bg-gray-300 transition mt-2"
                  onClick={() => setShowYearPicker(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-6 sm:mb-8 text-blue-700 tracking-tight animate-fade-in">Calendar App</h1>
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4 animate-fade-in-slow">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <div key={d} className={`text-center font-semibold text-xs sm:text-base ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-blue-600'}`}>{d}</div>
            ))}
            {renderDays()}
          </div>
          
        </div>
        <footer className="mt-8 text-blue-700 text-xs sm:text-base">&copy; {new Date().getFullYear()} Calendar App</footer>
      </main>
    </div>
  );
}
