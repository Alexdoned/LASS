const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);
  
  // Create or update Test Student
  await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: { password },
    create: {
      name: 'Test Student',
      email: 'student@test.com',
      password,
      role: 'STUDENT',
      isVerified: true
    }
  });

  // Create or update Test Lecturer
  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@test.com' },
    update: { password },
    create: {
      name: 'Test Lecturer',
      email: 'lecturer@test.com',
      password,
      role: 'LECTURER',
      department: 'Computer Science',
      isVerified: true
    }
  });

  // Add availability for the lecturer
  // Monday (1)
  const existingAvailability = await prisma.lecturerAvailability.findFirst({
    where: { 
      lecturerId: lecturer.id,
      dayOfWeek: 1
    }
  });

  if (existingAvailability) {
    await prisma.lecturerAvailability.update({
      where: { id: existingAvailability.id },
      data: {
        startTime: '09:00',
        endTime: '12:00'
      }
    });
  } else {
    await prisma.lecturerAvailability.create({
      data: {
        lecturerId: lecturer.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '12:00'
      }
    });
  }

  console.log('Test users created:');
  console.log('Student: student@test.com / password123');
  console.log('Lecturer: lecturer@test.com / password123');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
