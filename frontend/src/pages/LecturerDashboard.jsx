import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Check, X, Calendar, Clock, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const fetchLecturerAppointments = async () => {
  const { data } = await api.get('/appointments/lecturer');
  return data;
};

const LecturerDashboard = () => {
  const queryClient = useQueryClient();

  const { data: appointments, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['lecturerAppointments'],
    queryFn: fetchLecturerAppointments,
    refetchInterval: 5000, // Poll every 5 seconds for better responsiveness
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.patch(`/appointments/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Appointment ${variables.status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['lecturerAppointments'] });
    },
    onError: () => {
      toast.error('Failed to update status');
    }
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-500 animate-pulse">Loading dashboard...</div>
    </div>
  );

  const pendingAppointments = appointments?.filter(a => a.status === 'PENDING') || [];
  const handledAppointments = appointments?.filter(a => a.status !== 'PENDING') || [];

  const handleUpdate = (id, status) => {
    updateStatusMutation.mutate({ id, status });
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Lecturer Dashboard</h1>
          <p className="text-sm text-gray-500">Manage your appointment requests</p>
        </div>
        <button 
          onClick={() => refetch()}
          disabled={isFetching}
          className={`p-2 rounded-lg border transition-all ${isFetching ? 'bg-gray-50 text-gray-400' : 'bg-white text-primary-600 border-primary-200 hover:bg-primary-50'}`}
        >
          <div className={`flex items-center gap-2 ${isFetching ? 'animate-spin' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            <span className="text-xs font-medium">{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </div>
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Pending Requests</h2>
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-yellow-200">
            {pendingAppointments.length}
          </span>
        </div>
        {pendingAppointments.length === 0 ? (
          <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">No pending requests.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingAppointments.map(app => (
              <div key={app.id} className="border border-yellow-200 bg-yellow-50 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <UserIcon size={18} className="text-yellow-600" />
                    <h3 className="font-medium text-gray-900">{app.student.name}</h3>
                  </div>
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium border border-yellow-200">
                    PENDING
                  </span>
                </div>

                <div className="space-y-1 mb-4 text-sm text-gray-700">
                  <p className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {DateTime.fromISO(app.date).toFormat('EEEE, MMM d, yyyy')}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    {app.startTime} - {app.endTime}
                  </p>
                  <div className="mt-2 p-3 bg-white/60 rounded border border-yellow-100">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-1">Purpose</span>
                    <p className="text-gray-800 italic">"{app.purpose}"</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleUpdate(app.id, 'APPROVED')}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors font-medium text-sm"
                  >
                    <Check size={16} /> Accept
                  </button>
                  <button
                    onClick={() => handleUpdate(app.id, 'DECLINED')}
                    className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors font-medium text-sm"
                  >
                    <X size={16} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">History</h2>
        {handledAppointments.length === 0 ? (
          <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">No history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">Date & Time</th>
                  <th className="pb-3 font-medium">Purpose</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {handledAppointments.map(app => (
                  <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{app.student.name}</td>
                    <td className="py-3 text-gray-600">
                      {DateTime.fromISO(app.date).toFormat('MMM d, yyyy')} <br />
                      <span className="text-xs text-gray-400">{app.startTime} - {app.endTime}</span>
                    </td>
                    <td className="py-3 text-gray-600 italic max-w-xs truncate">{app.purpose}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border ${app.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' :
                          app.status === 'DECLINED' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LecturerDashboard;
