const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Institutional email domain to check against.
// In a real app, this could be an array of accepted domains or an environment variable.
const INSTITUTIONAL_DOMAIN = '@university.edu';

const register = async (req, res) => {
  try {
    const { email, password, name, role, department } = req.body;

    // 1. Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // 2. Validate institutional email
    // For this example, we'll check if it ends with our configured domain,
    // or if the user provided an '.edu' domain.
    if (!email.endsWith(INSTITUTIONAL_DOMAIN) && !email.endsWith('.edu')) {
      return res.status(400).json({ error: 'A valid institutional email (.edu) is required' });
    }

    // 3. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // 4. Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 5. Create user
    // Only allow setting valid roles, default to STUDENT if not provided or invalid
    let assignedRole = 'STUDENT';
    if (role === 'LECTURER' || role === 'ADMIN') {
      assignedRole = role;
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: assignedRole,
        department: department || null,
      },
    });

    // 6. Return success without exposing password
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 1. Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Check if user is verified (Requirement for Phase 5)
    if (!user.isVerified && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Account pending admin verification' });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_for_development',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

module.exports = {
  register,
  login,
};
