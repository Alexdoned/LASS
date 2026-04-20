import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { DateTime } from 'luxon';
import { Search, MapPin, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const fetchLecturers = async (search) => {
  const { data } = await api.get('/appointments/lecturers', { params: { search } });
  return data;
};

const fetchSlots = async ({ queryKey }) => {
  const [_, lecturerId, date] = queryKey;
  if (!lecturerId || !date) return [];
  const { data } = await api.get('/appointments/slots', { params: { lecturerId, date } });
  return data;
};

const fetchSchedule = async ({ queryKey }) => {
  const [_, lecturerId] = queryKey;
  if (!lecturerId) return null;
  const { data } = await api.get('/appointments/schedule', { params: { lecturerId } });
  return data;
};

const fetchMyAgendas = async () => {
  const { data } = await api.get('/appointments/student');
  return data;
};

const StudentDashboard = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [purpose, setPurpose] = useState('');

  // 1. Lecturers Directory Query
  const { data: lecturers, isLoading: isLoadingLecturers } = useQuery({
    queryKey: ['lecturers', searchTerm],
    queryFn: () => fetchLecturers(searchTerm),
  });

  // 2. Available Slots Query
  const dateString = DateTime.fromJSDate(selectedDate).toISODate();
  const { data: slots, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['slots', selectedLecturer?.id, dateString],
    queryFn: fetchSlots,
    enabled: !!selectedLecturer,
  });

  // Schedule Query for Calendar highlighting
  const { data: schedule } = useQuery({
    queryKey: ['schedule', selectedLecturer?.id],
    queryFn: fetchSchedule,
    enabled: !!selectedLecturer,
  });

  // 3. Student's Upcoming Appointments
  const { data: myAppointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['myAppointments'],
    queryFn: fetchMyAgendas,
    refetchInterval: 5000, // Poll every 5 seconds for quicker feedback
  });

  // Track previous appointments to detect status changes and show toast notifications
  const prevAppointmentsRef = useRef();

  useEffect(() => {
    if (myAppointments && prevAppointmentsRef.current) {
      myAppointments.forEach(newApp => {
        const oldApp = prevAppointmentsRef.current.find(a => a.id === newApp.id);
        if (oldApp && oldApp.status !== newApp.status) {
          if (newApp.status === 'APPROVED') {
            toast.success(`Your appointment with ${newApp.lecturer.name} was ACCEPTED!`, { duration: 5000 });
          } else if (newApp.status === 'DECLINED') {
            toast.error(`Your appointment with ${newApp.lecturer.name} was REJECTED.`, { duration: 5000 });
          }
        }
      });
    }
    prevAppointmentsRef.current = myAppointments;
  }, [myAppointments]);

  // 4. Booking Mutation
  const bookMutation = useMutation({
    mutationFn: async (appointmentData) => {
      const { data } = await api.post('/appointments', appointmentData);
      return data;
    },
    onSuccess: () => {
      toast.success('Appointment requested successfully!');
      setSelectedSlot(null);
      setPurpose('');
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['myAppointments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to book appointment');
    }
  });

  const handleBook = (e) => {
    e.preventDefault();
    if (!selectedSlot) return toast.error('Please select a slot');
    if (!purpose.trim()) return toast.error('Please enter a purpose for the visit');

    bookMutation.mutate({
      lecturerId: selectedLecturer.id,
      date: dateString,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      purpose
    });
  };

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    DECLINED: 'bg-red-100 text-red-800 border-red-200',
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month' || !schedule) return null;

    const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dateString = date.toDateString();

    const exception = schedule.exceptions?.find(e => new Date(e.date).toDateString() === dateString);

    // Skip past dates
    if (date < new Date(new Date().setHours(0,0,0,0))) {
      return 'text-gray-400 opacity-50';
    }

    if (exception) {
      if (exception.isAvailable) return '!bg-blue-100 !text-blue-800 rounded-full font-bold';
      return 'text-gray-400 opacity-50';
    }

    const hasRecurring = schedule.availabilities?.some(a => a.dayOfWeek === day);
    if (hasRecurring) return '!bg-blue-100 !text-blue-800 rounded-full font-bold';
    
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left Column: Directory & Booking */}
      <div className="flex-1 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Find a Lecturer</h2>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {isLoadingLecturers ? (
              <div className="text-center text-gray-500 py-4">Loading directory...</div>
            ) : lecturers?.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No lecturers found.</div>
            ) : (
              lecturers?.map(lecturer => (
                <div
                  key={lecturer.id}
                  className={`p-4 rounded-lg border transition-colors ${selectedLecturer?.id === lecturer.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-100 p-2 rounded-full">
                        <UserIcon className="text-primary-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{lecturer.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin size={14} /> {lecturer.department || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedLecturer(lecturer); setSelectedSlot(null); }}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedLecturer && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 fade-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Book with {selectedLecturer.name}
            </h2>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <Calendar
                  onChange={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  value={selectedDate}
                  className="rounded-lg border-gray-200 w-full shadow-sm"
                  minDate={new Date()}
                  tileClassName={tileClassName}
                />
              </div>

              <div className="flex-1 flex flex-col">
                <h3 className="font-medium mb-3">
                  Available Slots for {DateTime.fromJSDate(selectedDate).toFormat('MMM d, yyyy')}
                </h3>

                <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4 overflow-y-auto max-h-64 border border-gray-100">
                  {isLoadingSlots ? (
                    <div className="text-center text-gray-500 mt-10">Checking availability...</div>
                  ) : slots?.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">No available slots for this date.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {slots?.map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-3 text-sm rounded-md transition-colors border ${selectedSlot?.startTime === slot.startTime
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400'
                            }`}
                        >
                          {slot.startTime} - {slot.endTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedSlot && (
              <form onSubmit={handleBook} className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-100 animate-fade-in-up">
                <h4 className="font-medium text-primary-900 mb-2">
                  Confirm Booking ({selectedSlot.startTime} - {selectedSlot.endTime})
                </h4>
                <div className="mb-3">
                  <label className="block text-sm text-gray-700 mb-1">Purpose of Visit</label>
                  <textarea
                    required
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Project discussion, Grade inquiry..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={bookMutation.isPending}
                  className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {bookMutation.isPending ? 'Booking...' : 'Book Appointment'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Student Timeline */}
      <div className="lg:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">My Appointments</h2>
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="text-xs text-primary-600 hover:underline font-medium"
          >
            Today
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-primary-50 rounded-lg border border-primary-100 mb-4">
            <p className="text-sm font-medium text-primary-800">
              Selected: {DateTime.fromJSDate(selectedDate).toFormat('EEEE, MMM d')}
            </p>
          </div>

          {isLoadingAppointments ? (
            <div className="text-gray-500 text-center">Loading appointments...</div>
          ) : (
            <>
              {(() => {
                const selectedDateISO = DateTime.fromJSDate(selectedDate).toISODate();
                const filtered = myAppointments?.filter(app => 
                  DateTime.fromISO(app.date).toISODate() === selectedDateISO
                ) || [];

                if (filtered.length === 0) {
                  return (
                    <div className="text-gray-400 text-center text-sm p-4 border border-dashed border-gray-200 rounded-lg">
                      No appointments on this day.
                    </div>
                  );
                }

                return filtered.map(app => (
                  <div key={app.id} className="relative pl-6 pb-6 border-l-2 border-primary-200 last:border-0 last:pb-0">
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${app.status === 'APPROVED' ? 'bg-green-500' :
                      app.status === 'DECLINED' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>

                    <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{app.lecturer.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[app.status]}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <p className="font-medium text-gray-800">
                          {app.startTime} - {app.endTime}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded line-clamp-2">
                        "{app.purpose}"
                      </p>
                    </div>
                  </div>
                ));
              })()}

              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">All Upcoming</h3>
                <div className="space-y-4">
                  {myAppointments?.filter(app => {
                    const selectedDateISO = DateTime.fromJSDate(selectedDate).toISODate();
                    return DateTime.fromISO(app.date).toISODate() !== selectedDateISO;
                  }).slice(0, 5).map(app => (
                    <div key={app.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                      <div className={`w-2 h-2 rounded-full ${app.status === 'APPROVED' ? 'bg-green-500' :
                        app.status === 'DECLINED' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{app.lecturer.name}</p>
                        <p className="text-xs text-gray-500">
                          {DateTime.fromISO(app.date).toFormat('MMM d')} • {app.startTime}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{app.status}</span>
                    </div>
                  ))}
                  {myAppointments?.length === 0 && (
                    <div className="text-gray-500 text-center text-sm">No upcoming appointments.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
