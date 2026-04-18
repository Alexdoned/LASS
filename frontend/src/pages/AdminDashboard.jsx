import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const fetchSystemStats = async () => {
  const { data } = await api.get('/admin/stats');
  return data;
};

const fetchUnverifiedUsers = async () => {
  const { data } = await api.get('/admin/users/unverified');
  return data;
};

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  // Queries
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: fetchSystemStats,
    refetchInterval: 30000,
  });

  const { data: unverifiedUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['unverifiedUsers'],
    queryFn: fetchUnverifiedUsers,
  });

  // Mutation
  const verifyMutation = useMutation({
    mutationFn: async (userId) => {
      await api.patch(`/admin/users/${userId}/verify`);
    },
    onSuccess: () => {
      toast.success('User account verified and activated!');
      queryClient.invalidateQueries({ queryKey: ['unverifiedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: () => {
      toast.error('Failed to verify user account.');
    }
  });

  if (isLoadingStats || isLoadingUsers) {
    return <div className="text-center py-10 text-gray-500">Loading Admin Dashboard...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Users size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Students</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats?.overview.totalStudents}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600"><Users size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Lecturers</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats?.overview.totalLecturers}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg text-green-600"><Calendar size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Appointments</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats?.overview.totalAppointments}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-yellow-100 p-3 rounded-lg text-yellow-600"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pending Verifications</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats?.overview.pendingVerifications}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Verification Queue */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col h-full">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            Verification Queue
            {unverifiedUsers?.length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">{unverifiedUsers.length}</span>
            )}
          </h2>

          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {unverifiedUsers?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                <CheckCircle size={48} className="mb-2 opacity-50" />
                <p>All users have been verified!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unverifiedUsers?.map(user => (
                  <div key={user.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">{user.name}</h4>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded mt-1 inline-block">
                        {user.role} {user.department ? ` • ${user.department}` : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => verifyMutation.mutate(user.id)}
                      disabled={verifyMutation.isPending}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analytics */}
        <div className="flex flex-col gap-8">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="text-primary-600" /> Top 5 Most Requested Lecturers
            </h2>
            {stats?.topLecturers?.length === 0 ? (
              <p className="text-gray-500 text-sm">No appointments booked yet.</p>
            ) : (
              <div className="space-y-3">
                {stats?.topLecturers?.map((lecturer, idx) => (
                  <div key={lecturer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-bold w-4">{idx + 1}.</span>
                      <div>
                        <p className="font-medium text-gray-800">{lecturer.name}</p>
                        <p className="text-xs text-gray-500">{lecturer.department}</p>
                      </div>
                    </div>
                    <div className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {lecturer.requestCount} Requests
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="text-primary-600" /> Peak Booking Hours
            </h2>
            {stats?.peakHours?.length === 0 ? (
              <p className="text-gray-500 text-sm">No data available yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {stats?.peakHours?.map((hour, idx) => (
                  <div key={idx} className="flex flex-col items-center p-3 bg-gray-50 border border-gray-100 rounded-lg flex-1 min-w-[80px]">
                    <span className="text-lg font-bold text-gray-800">{hour.time}</span>
                    <span className="text-xs text-gray-500 font-medium">{hour.count} Bookings</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
