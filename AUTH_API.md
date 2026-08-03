# Smart Health Auth API

Base URL:

```text
http://localhost:5000/api/auth
```

## Register

```http
POST /register
Content-Type: application/json
```

```json
{
  "full_name": "Ananya Sharma",
  "email": "ananya@example.com",
  "phone": "+91 98765 43210",
  "password": "secret123",
  "hospital_id": 1
}
```

Creates a `PATIENT` account only, linked to the selected active hospital. Hospital
Administrators are created by the Super Admin; Doctors and Staff are created by
the Hospital Administrator.

## Login

```http
POST /login
Content-Type: application/json
```

```json
{
  "email": "ananya@example.com",
  "password": "secret123"
}
```

Returns a JWT token and the logged-in user.

## Current User

```http
GET /me
Authorization: Bearer <token>
```

Returns the authenticated user.

## Edit Profile

```http
PUT /profile
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "full_name": "Ananya Sharma",
  "email": "ananya@example.com",
  "phone": "+91 98765 43210"
}
```

Also available as `PUT /me` and `PATCH /profile`.

Returns a refreshed JWT token and the updated user.

## Change Password

```http
PUT /change-password
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "current_password": "secret123",
  "new_password": "newSecret123"
}
```

## Logout

```http
POST /logout
Authorization: Bearer <token>
```

JWT logout is client-side: remove the token from storage after this succeeds.
