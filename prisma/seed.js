const bcrypt = require("bcrypt");
const prisma = require("../src/config/db");

async function main() {
  const password = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || "superadmin123", 10);
  await prisma.user.upsert({
    where: { email: "superadmin@smarthealth.com" },
    update: {},
    create: {
      full_name: "Super Admin",
      email: "superadmin@smarthealth.com",
      phone: "+910000000000",
      password,
      role: "SUPER_ADMIN",
    },
  });
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
