const { PrismaClient } = require('@prisma/client');
const { getAvailableSlots } = require('../services/availabilityService');
const { DateTime } = require('luxon');

const { sendSMS } = require('../services/smsService');
const prisma = new PrismaClient();

const getLecturers = async (req, res) => {
  try {
    const { search, department } = req.query;
    
    const where = { role: 'LECTURER' };
    
    if (search) {
      where.name = { contains: search };
    }
    
    if (department) {
      where.department = { equals: department };
    }

    const lecturers = await prisma.user.findMany({
      where,
      select: { id: true, name: true, department: true, email: true }
    });

    res.json(lecturers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lecturers' });
  }
};

const getSlots = async (req, res) => {
  try {
    const { lecturerId, date } = req.query;
    if (!lecturerId || !date) {
      return res.status(400).json({ error: 'lecturerId and date are required' });
    }

    const slots = await getAvailableSlots(lecturerId, date);
    res.json(slots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
};

const getLecturerSchedule = async (req, res) => {
  try {
    const { lecturerId } = req.query;
    if (!lecturerId) {
      return res.status(400).json({ error: 'lecturerId is required' });
    }
    
    const availabilities = await prisma.lecturerAvailability.findMany({ where: { lecturerId } });
    const exceptions = await prisma.availabilityException.findMany({ where: { lecturerId } });
    
    res.json({ availabilities, exceptions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
};

const createAppointment = async (req, res) => {
  try {
    const { lecturerId, date, startTime, endTime, purpose } = req.body;
    const studentId = req.user.userId; // assuming auth middleware sets req.user

    if (!lecturerId || !date || !startTime || !endTime || !purpose) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const dateObj = DateTime.fromISO(date, { zone: 'utc' }).toJSDate();

    // Use Prisma Transaction to prevent double-booking (Race Condition)
    const newAppointment = await prisma.$transaction(async (tx) => {
      // 1. Check if the slot is already booked
      const existing = await tx.appointment.findFirst({
        where: {
          lecturerId,
          date: dateObj,
          startTime,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });

      if (existing) {
        throw new Error('This slot has already been booked by another student.');
      }

      // 2. Create the appointment
      const appointment = await tx.appointment.create({
        data: {
          studentId,
          lecturerId,
          date: dateObj,
          startTime,
          endTime,
          purpose,
          status: 'PENDING'
        }
      });

      // 3. Fetch lecturer phone number for SMS notification
      const lecturer = await tx.user.findUnique({
        where: { id: lecturerId },
        select: { phoneNumber: true, name: true }
      });

      if (lecturer?.phoneNumber) {
        const message = `Hello ${lecturer.name}, a new appointment has been requested by a student for ${DateTime.fromJSDate(dateObj).toFormat('LLL dd')} at ${startTime}. Please login to approve/decline.`;
        
        // Fire and forget
        sendSMS(lecturer.phoneNumber, message).catch(err => console.error('SMS notification failed:', err));
      }

      return appointment;
    });

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error(error);
    if (error.message.includes('already been booked')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

const getStudentAppointments = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const appointments = await prisma.appointment.findMany({
      where: { studentId },
      include: {
        lecturer: { select: { name: true, department: true } }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

const getLecturerAppointments = async (req, res) => {
  try {
    const lecturerId = req.user.userId;
    const appointments = await prisma.appointment.findMany({
      where: { lecturerId },
      include: {
        student: { select: { name: true, email: true } }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lecturer appointments' });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const lecturerId = req.user.userId;

    if (!['APPROVED', 'DECLINED', 'RESCHEDULED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appointment = await prisma.appointment.updateMany({
      where: { id, lecturerId },
      data: { status }
    });

    if (appointment.count === 0) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }

    res.json({ message: `Appointment ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

module.exports = {
  getLecturers,
  getSlots,
  getLecturerSchedule,
  createAppointment,
  getStudentAppointments,
  getLecturerAppointments,
  updateAppointmentStatus
};
