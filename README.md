# Mini ERP + CRM Operations Portal

Built from the supplied Full Stack Developer Case Study. Stack: Node.js + TypeScript + Express + PostgreSQL REST API, React + TypeScript frontend.

## 1. Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Git

## 2. Database
Create database `mini_erp_crm`, then run `backend/sql/schema.sql` in pgAdmin/psql.

## 3. Backend
```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
# edit DATABASE_URL and JWT_SECRET
npm install
npx tsx src/seed.ts
npm run dev
```
API: http://localhost:5000
Health: http://localhost:5000/health

Demo users (same password):
- admin@example.com / Admin@123
- sales@example.com / Admin@123
- warehouse@example.com / Admin@123
- accounts@example.com / Admin@123

## 4. Frontend
```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```
Open the Vite URL shown in terminal (normally http://localhost:5173).

## 5. Main REST APIs
POST /auth/login
GET/POST /customers
GET /customers/:id
PUT /customers/:id
POST /customers/:id/followups
GET/POST /products
PUT /products/:id
POST /products/:id/movements
GET /products/:id/movements
GET/POST /challans
GET /challans/:id
POST /challans/:id/confirm

## 6. Business logic
- JWT protects business routes.
- Roles: Admin, Sales, Warehouse, Accounts.
- Only Admin/Warehouse can change inventory.
- Only Admin/Sales can create/confirm sales challans.
- Confirmed challans reduce stock.
- Transactions lock product rows before stock changes, reject insufficient stock, and create OUT movement records.
- Challan items store product snapshots (name, SKU, price) so later product edits do not rewrite historical challans.

## 7. Deployment
Frontend can be deployed to Vercel/Netlify/Render Static Site. Backend can be deployed to Render/Railway/Fly.io. PostgreSQL can be Supabase/Neon/Render Postgres. Set DATABASE_URL, JWT_SECRET and CORS_ORIGIN in the backend; set VITE_API_URL in the frontend.

## 8. Bonus Point
Invoice PDF download
