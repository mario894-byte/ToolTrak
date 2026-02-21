import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User, Package, Activity } from 'lucide-react';

type EventLog = {
  id: string;
  tool_id: string;
  event_type: string;
  from_location_id: string | null;
  to_location_id: string | null;
  from_person_id: string | null;
  to_person_id: string | null;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string;
  tool?: { name: string } | null;
  from_location?: { name: string } | null;
  to_location?: { name: string } | null;
  from_person?: { name: string } | null;
  to_person?: { name: string } | null;
};

type DayEvents = {
  date: Date;
  events: EventLog[];
  count: number;
};

export default function EventLog({ onBack }: { onBack: () => void }) {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarDays, setCalendarDays] = useState<DayEvents[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    generateCalendar();
  }, [currentDate, events]);

  async function loadEvents() {
    try {
      const { data, error } = await supabase
        .from('tool_event_log')
        .select(`
          *,
          tool:tools(name),
          from_location:locations!from_location_id(name),
          to_location:locations!to_location_id(name),
          from_person:people!from_person_id(name),
          to_person:people!to_person_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: DayEvents[] = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      const dateStr = current.toISOString().split('T')[0];
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.created_at).toISOString().split('T')[0];
        return eventDate === dateStr;
      });

      days.push({
        date: new Date(current),
        events: dayEvents,
        count: dayEvents.length
      });

      current.setDate(current.getDate() + 1);
    }

    setCalendarDays(days);
  }

  function previousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
  }

  function closeSelectedDate() {
    setSelectedDate(null);
  }

  const selectedDayEvents = selectedDate
    ? calendarDays.find(day =>
        day.date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0]
      )?.events || []
    : [];

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const eventTypeIcons: Record<string, any> = {
    assigned: User,
    returned: MapPin,
    moved: MapPin,
    status_changed: Activity,
    created: Package,
    updated: Activity,
  };

  const eventTypeColors: Record<string, string> = {
    assigned: 'text-blue-600 bg-blue-50',
    returned: 'text-green-600 bg-green-50',
    moved: 'text-amber-600 bg-amber-50',
    status_changed: 'text-purple-600 bg-purple-50',
    created: 'text-gray-600 bg-gray-50',
    updated: 'text-gray-600 bg-gray-50',
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Event Log</h2>
            <p className="text-gray-600">Track tool movements and changes</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}

          {calendarDays.map((dayData, index) => {
            const isCurrentMonth = dayData.date.getMonth() === currentDate.getMonth();
            const isToday = dayData.date.toDateString() === new Date().toDateString();
            const hasEvents = dayData.count > 0;

            return (
              <button
                key={index}
                onClick={() => hasEvents && selectDate(dayData.date)}
                className={`
                  relative aspect-square p-2 rounded-lg transition-all
                  ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                  ${isToday ? 'bg-blue-100 font-bold' : ''}
                  ${hasEvents && isCurrentMonth ? 'hover:bg-amber-50 cursor-pointer border-2 border-amber-400' : 'border border-gray-200'}
                  ${!hasEvents || !isCurrentMonth ? 'cursor-default' : ''}
                `}
              >
                <div className="text-sm">{dayData.date.getDate()}</div>
                {hasEvents && isCurrentMonth && (
                  <div className="absolute bottom-1 right-1 min-w-[20px] h-5 px-1 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {dayData.count}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Events on {selectedDate.toLocaleDateString()}
              </h3>
              <button
                onClick={closeSelectedDate}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedDayEvents.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No events on this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map(event => {
                    const Icon = eventTypeIcons[event.event_type] || Activity;
                    return (
                      <div
                        key={event.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${eventTypeColors[event.event_type] || 'text-gray-600 bg-gray-50'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900">
                                {event.tool?.name || 'Unknown Tool'}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(event.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 capitalize mb-2">
                              {event.event_type.replace('_', ' ')}
                            </p>
                            {event.from_location && event.to_location && (
                              <p className="text-sm text-gray-700">
                                From: <span className="font-medium">{event.from_location.name}</span>
                                {' → '}
                                To: <span className="font-medium">{event.to_location.name}</span>
                              </p>
                            )}
                            {event.to_person && (
                              <p className="text-sm text-gray-700">
                                Assigned to: <span className="font-medium">{event.to_person.name}</span>
                              </p>
                            )}
                            {event.old_status && event.new_status && (
                              <p className="text-sm text-gray-700">
                                Status: <span className="font-medium">{event.old_status}</span>
                                {' → '}
                                <span className="font-medium">{event.new_status}</span>
                              </p>
                            )}
                            {event.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
