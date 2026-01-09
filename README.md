# ProjectDB

A mobile-first web application for managing engineering company projects. The system enables tracking projects, structures (constructions), documentation with versioning, employee workload planning and monitoring, client/contractor company management, and payment schedules.

## Technology Stack

### Frontend
- React 18.x with TypeScript 5.x
- Vite 5.x (build tool)
- React Router 6.x
- Redux Toolkit 2.x / Zustand 4.x / TanStack Query 5.x (state management)
- React Hook Form 7.x with Zod 3.x (forms & validation)
- Tailwind CSS 3.4.x (styling)
- Framer Motion 11.x (animations)
- D3.js 7.x (data visualization)
- jsPDF 3.x (PDF generation)
- Socket.io Client 4.x (real-time features)

### Backend
- Node.js 20+
- NestJS 11.x
- PostgreSQL 15+
- Prisma ORM 6.x
- JWT Authentication (access: 15min, refresh: 7 days)
- bcrypt 6.x (password hashing)

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn
- Git

## Quick Start

1. Clone the repository
2. Run the setup script:
   ```bash
   ./init.sh
   ```

3. Start the backend:
   ```bash
   cd backend
   npm run start:dev
   ```

4. Start the frontend (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

5. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## User Roles

| Role     | Description                                    |
|----------|------------------------------------------------|
| Admin    | Full system access, user management            |
| Manager  | Project management, workload planning          |
| Employee | View assigned projects, log work hours         |
| Trial    | View-only access for evaluation                |

## Core Features

- **Project Management**: Create, track, and manage engineering projects
- **Construction Management**: Track structures within projects
- **Document Management**: Upload, version, and organize project documents
- **Workload Planning**: Assign employees to projects, track planned vs actual hours
- **Payment Schedules**: Track project payments and due dates
- **Analytics**: Visualize project workload with D3.js charts
- **Responsive Design**: Mobile-first, works on all devices

## Project Structure

```
projectdb/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   ├── common/         # Shared utilities, guards
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/
│   └── package.json
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # UI components
│   │   ├── services/      # API services
│   │   ├── store/         # State management
│   │   └── App.tsx
│   └── package.json
│
├── init.sh                # Setup script
└── README.md
```

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/login` - Login
- `POST /auth/register` - Register user (Admin only)
- `POST /auth/refresh` - Refresh token
- `PATCH /auth/change-password` - Change password

### Projects (`/project`)
- `GET /project` - List projects
- `POST /project/create` - Create project
- `PATCH /project/:id` - Update project
- `DELETE /project/:id` - Delete project (Admin only)

### Companies (`/company`)
- CRUD operations for customer/contractor companies

### Documents (`/document`)
- Upload, download, replace, delete documents with versioning

### Workload (`/workload`, `/workload-plan`, `/workload-actual`)
- Plan and track employee workload

### Payments (`/payment-schedule`)
- Manage project payment schedules

### Analytics (`/analytics`)
- Project workload analytics and comparisons

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/projectdb
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
```

## Development

```bash
# Run backend in dev mode
cd backend && npm run start:dev

# Run frontend in dev mode
cd frontend && npm run dev

# Run Prisma migrations
cd backend && npx prisma migrate dev

# Generate Prisma client
cd backend && npx prisma generate
```

## License

Proprietary - All rights reserved
