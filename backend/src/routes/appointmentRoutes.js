const express = require('express');
const { getLecturers, getSlots, getLecturerSchedule, createAppointment, getStudentAppointments, getLecturerAppointments, updateAppointmentStatus } = require('../controllers/appointmentController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.get('/lecturers', getLecturers);
router.get('/slots', getSlots);
router.get('/schedule', getLecturerSchedule);
router.post('/', checkRole(['STUDENT']), createAppointment);
router.get('/student', checkRole(['STUDENT']), getStudentAppointments);

router.get('/lecturer', checkRole(['LECTURER']), getLecturerAppointments);
router.patch('/:id/status', checkRole(['LECTURER']), updateAppointmentStatus);

module.exports = router;
