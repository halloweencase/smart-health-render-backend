const { PrismaClient } = require("@prisma/client");

// One shared client prevents connection exhaustion on Neon and Render.
const prisma = new PrismaClient();

module.exports = prisma;
