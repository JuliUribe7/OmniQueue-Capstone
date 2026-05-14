# OmniQueue – Queue & Appointment Management System

A web application for service-based businesses (barbershops, salons, clinics) to manage walk-in queues, appointments, and staff. Customers can join queues or book appointments online and receive email/SMS confirmations.

**Live URL:** https://team3.noblesolutionsenterprises.com

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native / Expo (web build) |
| Backend | Node.js + Express |
| Database | PostgreSQL 18 |
| Auth | Better Auth (email/password) |
| Email | Resend |
| SMS | Telnyx |
| Payments | Stripe |
| Hosting | Docker Compose + Caddy |

---

## Features

- Business owner registration and dashboard
- Live queue management (walk-ins, call, done, remove)
- Appointment booking with staff selection
- Email notifications with ICS calendar invite (Resend)
- SMS notifications (Telnyx)
- Per-business notification channel (sms / email / both)
- Stripe subscription payments (Pro plan)
- Google Calendar OAuth integration (backend ready)
- Customer portal for joining queue or booking appointments
- Admin view of all businesses and queues

---

## Project Structure

```
/
├── app/                    # Expo frontend (React Native web)
├── q-manager/
│   ├── backend/            # Node.js + Express API
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── db.js
│   │   └── index.js
│   ├── db/
│   │   └── init.sql        # Database schema
│   └── docker-compose.yml
├── Dockerfile              # Frontend build
├── Caddyfile               # Internal reverse proxy config
└── HANDOFF.txt             # Company handoff guide
```

---

## API Endpoints

**Public**
```
GET  /api/businesses/:businessId/public           Business info + services
POST /api/businesses/:businessId/queue/join       Join queue
POST /api/businesses/:businessId/appointments     Book appointment
GET  /api/businesses/:businessId/appointments/public  Available slots
GET  /api/admin/businesses                        All businesses
```

**Auth**
```
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-out
GET  /api/auth/get-session
```

**Protected (requires login)**
```
GET/POST/PUT /api/businesses/me                   Business profile
GET/POST     /api/businesses/me/services          Services
GET/POST     /api/businesses/me/queue             Queue management
GET/POST     /api/businesses/me/staff             Staff management
GET          /api/businesses/me/appointments      Appointments
GET/PUT      /api/businesses/me/subscription      Subscription plan
```

**Payments**
```
POST /api/payments/create-checkout                Stripe checkout session
POST /api/payments/webhook                        Stripe webhook
```

**Google Calendar**
```
GET  /api/google/auth                             Get OAuth URL
GET  /api/google/callback                         OAuth callback
POST /api/google/save-tokens                      Save tokens
GET  /api/google/status                           Check connection
```

---

## Running Locally

**Requirements:** Docker, Node.js, npm

```bash
# Clone the repo
git clone <repo-url>

# Fill in environment variables
cp q-manager/.env.example q-manager/.env

# Start with Docker
cd q-manager && docker compose up -d --build
```

App runs at http://localhost:4003

---

## Environment Variables

See `HANDOFF.txt` for the full list of required environment variables and third-party service setup instructions.

---

## Team

Developed as a capstone project by Team 3.
- Backend: Juliana Uribe, Ebenezzer Matthew
- Frontend: Taha Tafa, Samuel Wright, Doriva Wright 
