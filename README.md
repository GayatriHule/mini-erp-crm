# Mini ERP + CRM Operations Portal

Built from the supplied Full Stack Developer Case Study.

**Stack:** Node.js + TypeScript + Express + PostgreSQL REST API, React + TypeScript frontend.

## 🚀 Live Demo

### 🌐 Frontend

**[https://mini-erp-crm-frontend-7pex.onrender.com](https://mini-erp-crm-frontend-7pex.onrender.com)**

### ⚙️ Backend API

**https://mini-erp-crm-k0jp.onrender.com**

### ❤️ Backend Health Check

**Your deployed backend URL + `/health`**

Example:

```text
https://YOUR-BACKEND-URL.onrender.com/health
```

> **Frontend:** React + TypeScript + Vite
> **Backend:** Node.js + TypeScript + Express REST API
> **Database:** PostgreSQL on Neon
> **Hosting:** Render

---

## 1. Prerequisites

* Node.js 20+
* PostgreSQL 15+
* Git

---

## 2. Database

Create database `mini_erp_crm`, then run:

```text
backend/sql/schema.sql
```

using pgAdmin, psql, or your PostgreSQL provider.

For production, this project uses **Neon PostgreSQL**.

---

## 3. Backend

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

# Edit DATABASE_URL and JWT_SECRET

npm install
npx tsx src/seed.ts
npm run dev
```

### Local API

```text
http://localhost:5000
```

### Local Health Check

```text
http://localhost:5000/health
```

### Production API

```text
YOUR-RENDER-BACKEND-URL
```

### Production Health Check

```text
YOUR-RENDER-BACKEND-URL/health
```

---

## 4. Demo Users

All demo users use the same password:

```text
Admin@123
```

| Role      | Email                                                 |
| --------- | ----------------------------------------------------- |
| Admin     | [admin@example.com](mailto:admin@example.com)         |
| Sales     | [sales@example.com](mailto:sales@example.com)         |
| Warehouse | [warehouse@example.com](mailto:warehouse@example.com) |
| Accounts  | [accounts@example.com](mailto:accounts@example.com)   |

---

## 5. Frontend

```bash
cd frontend

copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

npm install
npm run dev
```

### Local Frontend

Open the Vite URL shown in the terminal.

Normally:

```text
http://localhost:5173
```

### 🌐 Production Frontend

```text
https://mini-erp-crm-frontend-7pex.onrender.com
```

---

## 6. Main REST APIs

### Authentication

```http
POST /auth/login
```

### Customers

```http
GET /customers
POST /customers
GET /customers/:id
PUT /customers/:id
POST /customers/:id/followups
```

### Products & Inventory

```http
GET /products
POST /products
PUT /products/:id
POST /products/:id/movements
GET /products/:id/movements
```

### Challans

```http
GET /challans
POST /challans
GET /challans/:id
POST /challans/:id/confirm
```

### Invoice

```http
GET /challans/:id/invoice/pdf
```

---

## 7. Business Logic

* JWT protects business routes.
* Roles: **Admin, Sales, Warehouse, Accounts**.
* Only **Admin/Warehouse** can change inventory.
* Only **Admin/Sales** can create/confirm sales challans.
* Confirmed challans reduce stock.
* Transactions lock product rows before stock changes.
* Insufficient stock is rejected.
* Stock OUT movement records are created automatically.
* Challan items store product snapshots including name, SKU and price.
* Historical challans are therefore not affected by later product edits.

---

## 8. Environment Variables

### Backend

```env
DATABASE_URL=your_neon_postgresql_connection_string
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGIN=https://mini-erp-crm-frontend-7pex.onrender.com
```

### Frontend

```env
VITE_API_URL=YOUR-RENDER-BACKEND-URL
```

> Never commit `.env` files or production secrets to GitHub.

---

## 9. Deployment

### Frontend

The frontend is deployed on **Render Static Site**.

**Live Frontend:**

```text
https://mini-erp-crm-frontend-7pex.onrender.com
```

### Backend

The backend is deployed as a **Render Web Service**.

**Production Backend:**

```text
YOUR-RENDER-BACKEND-URL
```

### Database

Production PostgreSQL database:

**Neon PostgreSQL**

Required backend environment variables:

```text
DATABASE_URL
JWT_SECRET
CORS_ORIGIN
```

Required frontend environment variable:

```text
VITE_API_URL
```

---

## 10. Production Architecture

```text
                    ┌─────────────────────────┐
                    │        Frontend         │
                    │    React + TypeScript   │
                    │                         │
                    │ mini-erp-crm-frontend   │
                    │       .onrender.com     │
                    └────────────┬────────────┘
                                 │
                                 │ REST API
                                 ▼
                    ┌─────────────────────────┐
                    │         Backend         │
                    │ Node + Express + TS     │
                    │                         │
                    │      Render API         │
                    └────────────┬────────────┘
                                 │
                                 │ PostgreSQL
                                 ▼
                    ┌─────────────────────────┐
                    │          Neon           │
                    │       PostgreSQL        │
                    └─────────────────────────┘
```

---

## 11. Bonus Point

### 📄 Invoice PDF Download

The system supports invoice/challan PDF generation:

```http
GET /challans/:id/invoice/pdf
```

---

## 12. API Documentation

A Postman collection is available for testing the REST API.

Import:

```text
Mini-ERP-CRM.postman_collection.json
```

into Postman and configure:

```text
baseUrl = YOUR-RENDER-BACKEND-URL
```

Run **Authentication → Login** first to automatically store the JWT token.

---

## ⭐ Project Links

| Resource          | Link                                            |
| ----------------- | ----------------------------------------------- |
| 🌐 Live Frontend  | https://mini-erp-crm-frontend-7pex.onrender.com |
| ⚙️ Backend API    | YOUR-RENDER-BACKEND-URL                         |
| ❤️ Health Check   | YOUR-RENDER-BACKEND-URL/health                  |
| 📦 API Collection | Mini-ERP-CRM.postman_collection.json            |
| 🛢️ Database      | Neon PostgreSQL                                 |

---

## Tech Stack

**Frontend**

* React
* TypeScript
* Vite

**Backend**

* Node.js
* TypeScript
* Express
* JWT Authentication
* REST API

**Database**

* PostgreSQL
* Neon

**Deployment**

* Render

**Additional**

* PDF Invoice Generation
* Role-Based Access Control
* Inventory Management
* Customer Relationship Management
* Sales Challans
* Stock Movement Tracking
