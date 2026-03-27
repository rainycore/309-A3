/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example:
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 3) {
    console.error('Usage: node prisma/createsu.js <utorid> <email> <password>');
    process.exit(1);
  }

  const [utorid, email, password] = args;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Invalid email format');
    process.exit(1);
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,20}$/;
  if (!passwordRegex.test(password)) {
    console.error('Password must be 8-20 characters with at least one uppercase, one lowercase, one number, and one special character');
    process.exit(1);
  }

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    console.error('An account with this email already exists');
    process.exit(1);
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { utorid } });
  if (existingAdmin) {
    console.error('An admin with this utorid already exists');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const account = await prisma.account.create({
    data: {
      email,
      password: hashedPassword,
      role: 'admin',
      activated: true,
      admin: {
        create: { utorid }
      }
    }
  });

  console.log(`Administrator account created successfully`);
  console.log(`ID: ${account.id}, Email: ${account.email}, UTORid: ${utorid}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
