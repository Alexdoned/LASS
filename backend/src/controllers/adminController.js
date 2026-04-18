const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getSystemStats = async (req, res) => {
  try {
    // 1. Top 5 Most Requested Lecturers
    const topLecturersQuery = await prisma.appointment.groupBy({
      by: ['lecturerId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const lecturerIds = topLecturersQuery.map(t => t.lecturerId);
    
    // Fetch lecturer details
    const lecturersInfo = await prisma.user.findMany({
      where: { id: { in: lecturerIds } },
      select: { id: true, name: true, department: true }
    });

    const topLecturers = topLecturersQuery.map(t => {
      const info = lecturersInfo.find(l => l.id === t.lecturerId);
      return {
        ...info,
        requestCount: t._count.id
      };
    });

    // 2. Peak Booking Hours
    const peakHoursQuery = await prisma.appointment.groupBy({
      by: ['startTime'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const peakHours = peakHoursQuery.map(p => ({
      time: p.startTime,
      count: p._count.id
    }));

    // General stats
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalLecturers = await prisma.user.count({ where: { role: 'LECTURER' } });
    const totalAppointments = await prisma.appointment.count();
    const pendingVerifications = await prisma.user.count({ where: { isVerified: false, role: { not: 'ADMIN' } } });

    res.json({
      topLecturers,
      peakHours,
      overview: {
        totalStudents,
        totalLecturers,
        totalAppointments,
        pendingVerifications
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
};

const getUnverifiedUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isVerified: false, role: { not: 'ADMIN' } },
      select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { isVerified: true }
    });
    res.json({ message: 'User verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

module.exports = {
  getSystemStats,
  getUnverifiedUsers,
  verifyUser
};
