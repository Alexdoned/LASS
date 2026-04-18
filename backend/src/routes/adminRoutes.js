const express = require('express');
const { getSystemStats, getUnverifiedUsers, verifyUser } = require('../controllers/adminController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// All admin routes are protected and require the ADMIN role
router.use(verifyToken);
router.use(checkRole(['ADMIN']));

router.get('/stats', getSystemStats);
router.get('/users/unverified', getUnverifiedUsers);
router.patch('/users/:id/verify', verifyUser);

module.exports = router;
