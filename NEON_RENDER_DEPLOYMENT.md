# Neon and Render deployment

1. Create a Neon project and copy its pooled PostgreSQL connection string. Set it as `DATABASE_URL` in Render (it must include `sslmode=require`).
2. Set a long random `JWT_SECRET` in Render. Optionally set `JWT_EXPIRES_IN` and `SUPER_ADMIN_PASSWORD`.
3. Create the Render web service from this directory. The included `render.yaml` installs packages, generates Prisma Client, deploys migrations, and starts Express.
4. For the first database only, run `npm run prisma:migrate` and `npm run prisma:seed` from an environment with the same `DATABASE_URL`. In Render, migrations run on each deploy.

The Prisma migration creates all tables, enums, primary keys, foreign keys, unique constraints, defaults, and indexes. It uses PostgreSQL `SERIAL` IDs, which replace MySQL `AUTO_INCREMENT`.

Existing MySQL data is not copied automatically. Export it before retiring XAMPP, then import it into Neon in parent-first order (`hospitals`, `users`, then medical records) and reset each PostgreSQL sequence to the imported maximum ID. This protects all foreign-key relationships.
