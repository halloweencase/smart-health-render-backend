const pool = require("./config/db");
async function main() {
  try {
    const [rows] = await pool.execute("DESCRIBE users");
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
main();
