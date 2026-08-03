const pool = require("./db");
const bcrypt = require("bcrypt");
require("dotenv").config();

async function initDb() {
  console.log("Starting DB Initialization...");
  let connection;
  try {
    connection = await pool.getConnection();
    
    // 1. Create hospitals table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        hospital_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        hospital_name VARCHAR(255) NOT NULL,
        registration_number VARCHAR(100) NOT NULL,
        email VARCHAR(180) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (hospital_id),
        UNIQUE KEY hospitals_registration_number_unique (registration_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Verified 'hospitals' table");

    // Convert users to InnoDB
    await connection.query("ALTER TABLE users ENGINE=InnoDB");
    console.log("✅ Converted 'users' table engine to InnoDB");

    // 2. Modify users table columns
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    `, [process.env.DB_NAME]);

    const colNames = columns.map(c => c.COLUMN_NAME.toLowerCase());

    // Add or modify hospital_id
    if (!colNames.includes("hospital_id")) {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN hospital_id INT UNSIGNED DEFAULT NULL,
        ADD CONSTRAINT fk_users_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL
      `);
      console.log("✅ Added column 'hospital_id' to users table");
    }

    // Modify role column enum
    await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'STAFF', 'PATIENT') NOT NULL DEFAULT 'PATIENT'
    `);
    console.log("✅ Updated 'role' column type to new ENUM values");

    // Modify status column enum
    await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
    `);
    console.log("✅ Updated 'status' column type to new ENUM values");

    // Add created_by (must be signed INT to match id type)
    if (!colNames.includes("created_by")) {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN created_by INT DEFAULT NULL,
        ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log("✅ Added column 'created_by' to users table");
    }

    // 3. Create reports table (patient_id, doctor_id must be INT to reference users.id)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        patient_id INT NOT NULL,
        doctor_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        hospital_id INT UNSIGNED NOT NULL,
        notes TEXT,
        file_url VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (report_id),
        CONSTRAINT fk_reports_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_reports_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_reports_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Verified 'reports' table");

    // 4. Create prescriptions table (patient_id, doctor_id must be INT)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        prescription_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        hospital_id INT UNSIGNED NOT NULL,
        diagnosis TEXT NOT NULL,
        medications TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (prescription_id),
        CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_prescriptions_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_prescriptions_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Verified 'prescriptions' table");

    // 5. Create appointments table (patient_id, doctor_id must be INT)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        appointment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        hospital_id INT UNSIGNED NOT NULL,
        appointment_date DATETIME NOT NULL,
        status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (appointment_id),
        CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_appointments_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Verified 'appointments' table");

    // 6. Create health_metrics table (patient_id must be INT)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS health_metrics (
        metric_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        patient_id INT NOT NULL,
        hospital_id INT UNSIGNED NOT NULL,
        heart_rate INT DEFAULT NULL,
        blood_sugar INT DEFAULT NULL,
        blood_pressure VARCHAR(30) DEFAULT NULL,
        bmi DECIMAL(5,2) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (metric_id),
        CONSTRAINT fk_health_metrics_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_health_metrics_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Verified 'health_metrics' table");

    // 7. Seed SUPER_ADMIN
    const adminEmail = "superadmin@smarthealth.com";
    const [adminCheck] = await connection.query("SELECT * FROM users WHERE role = 'SUPER_ADMIN'");

    if (adminCheck.length === 0) {
      const hashedPassword = await bcrypt.hash("superadmin123", 10);
      await connection.query(`
        INSERT INTO users (full_name, email, phone, password, role, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ["Super Admin", adminEmail, "+910000000000", hashedPassword, "SUPER_ADMIN", "active"]);
      console.log("✅ Seeded default Super Admin user: superadmin@smarthealth.com / superadmin123");
    } else {
      console.log("✅ Super Admin already exists");
    }

    console.log("🎉 Database schema verification and updates completed successfully!");
  } catch (error) {
    console.error("❌ DB Initialization Failed:", error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

if (require.main === module) {
  initDb().then(() => process.exit(0));
}

module.exports = initDb;
