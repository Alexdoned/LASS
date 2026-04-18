const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');

const prisma = new PrismaClient();

const SLOT_DURATION_MINUTES = 30;
const BUFFER_MINUTES = 5;

/**
 * Generate available slots for a given lecturer and date.
 * @param {string} lecturerId 
 * @param {string} dateString - Format YYYY-MM-DD
 * @returns {Array<{startTime: string, endTime: string}>}
 */
const getAvailableSlots = async (lecturerId, dateString) => {
  // 1. Parse date in UTC for consistency
  const dateObj = DateTime.fromISO(dateString, { zone: 'utc' });
  if (!dateObj.isValid) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }

  // luxon weekday: 1 (Mon) - 7 (Sun)
  // Our DB dayOfWeek: 0 (Sun) - 6 (Sat)
  const dayOfWeek = dateObj.weekday === 7 ? 0 : dateObj.weekday;

  let scheduleStartTimeStr = null;
  let scheduleEndTimeStr = null;

  // 2. Check for exceptions on this specific date
  // Prisma doesn't natively handle pure dates well without time, so we look for exact match or range
  // Assuming date in DB is stored at midnight UTC
  const exception = await prisma.availabilityException.findFirst({
    where: {
      lecturerId,
      date: dateObj.toJSDate(),
    },
  });

  if (exception) {
    if (!exception.isAvailable) {
      // Lecturer took the day off
      return [];
    } else {
      // Lecturer has custom availability for this date
      scheduleStartTimeStr = exception.startTime;
      scheduleEndTimeStr = exception.endTime;
    }
  } else {
    // 3. Fallback to normal recurring weekly availability
    const availability = await prisma.lecturerAvailability.findFirst({
      where: {
        lecturerId,
        dayOfWeek,
      },
    });

    if (!availability) {
      // No schedule set for this day
      return [];
    }

    scheduleStartTimeStr = availability.startTime;
    scheduleEndTimeStr = availability.endTime;
  }

  if (!scheduleStartTimeStr || !scheduleEndTimeStr) {
    return [];
  }

  // 4. Fetch existing appointments to filter out booked slots
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      lecturerId,
      date: dateObj.toJSDate(),
      status: {
        in: ['PENDING', 'APPROVED'], // Both block the slot
      },
    },
  });

  const bookedStartTimes = new Set(existingAppointments.map(app => app.startTime));

  // 5. Generate slots
  const availableSlots = [];
  
  let currentSlotStart = DateTime.fromFormat(scheduleStartTimeStr, 'HH:mm', { zone: 'utc' });
  const scheduleEnd = DateTime.fromFormat(scheduleEndTimeStr, 'HH:mm', { zone: 'utc' });

  while (currentSlotStart.plus({ minutes: SLOT_DURATION_MINUTES }) <= scheduleEnd) {
    const slotStartTimeStr = currentSlotStart.toFormat('HH:mm');
    const slotEndTimeStr = currentSlotStart.plus({ minutes: SLOT_DURATION_MINUTES }).toFormat('HH:mm');

    // Check if slot overlaps with an existing appointment
    // For simplicity, we assume appointments align perfectly with our slot generation logic
    if (!bookedStartTimes.has(slotStartTimeStr)) {
      availableSlots.push({
        startTime: slotStartTimeStr,
        endTime: slotEndTimeStr,
      });
    }

    // Move to next slot considering the rest buffer
    currentSlotStart = currentSlotStart.plus({ minutes: SLOT_DURATION_MINUTES + BUFFER_MINUTES });
  }

  return availableSlots;
};

module.exports = {
  getAvailableSlots,
};
