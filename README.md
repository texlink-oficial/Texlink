# Texlink - Manufacturing Partner Management Platform

A comprehensive B2B platform connecting fashion brands with manufacturing suppliers (facções), streamlining order management, communication, and quality control throughout the production lifecycle.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Core Modules](#core-modules)
- [Development](#development)
- [Deployment](#deployment)
- [Licence](#licence)

## Overview

Texlink is a multi-tenant SaaS platform designed to revolutionise the relationship between fashion brands and their manufacturing partners. The platform provides a complete workflow for order lifecycle management, from initial order creation and supplier assignment through production, quality review, and final delivery.

### Key Capabilities

- **Multi-tenant Architecture**: Separate workspaces for brands, suppliers, and administrators
- **Order Lifecycle Management**: Complete workflow from order creation to delivery and payment
- **Supplier Marketplace**: Direct assignment or bidding-based supplier selection
- **Quality Control System**: Multi-stage review process with rework management
- **Real-time Communication**: Order-specific messaging with proposal negotiation
- **Team Collaboration**: Role-based permissions and team management
- **Financial Tracking**: Payment scheduling, instalments, and status monitoring

## Features

### For Brands

- **Order Management**
  - Create orders with detailed specifications and technical sheets
  - Assign directly to preferred suppliers or open for bidding
  - Track order status across 20+ production stages
  - Product templates for quick reorder
  - Payment terms presets

- **Supplier Network**
  - Browse and filter suppliers by capabilities and location
  - Maintain favourite supplier lists
  - View supplier ratings and production capacity
  - Multi-supplier comparison

- **Quality & Delivery**
  - Quality review workflow with approval/rejection
  - Rework request management
  - Second-quality item tracking
  - Delivery deadline monitoring

### For Suppliers (Facções)

- **Production Management**
  - Kanban-style order dashboard
  - Accept or reject incoming orders
  - Update order status throughout production
  - Capacity and occupancy tracking

- **Business Tools**
  - Multi-stage onboarding with business qualification
  - Production capability profiles
  - Monthly capacity planning
  - Revenue tracking

- **Communication**
  - Direct messaging with brands
  - Counter-proposal system for price/deadline negotiation
  - Document and photo sharing

### For Administrators

- **Platform Management**
  - Company approval and verification
  - User and permission management
  - Platform analytics and reporting
  - System configuration

### Cross-Platform Features

- **Role-Based Access Control**: Granular permissions system with 6 predefined roles (Admin, Operations Manager, Financial Manager, Sales, Production Manager, Viewer)
- **Team Collaboration**: Invite team members with specific roles and custom permission overrides
- **Real-time Notifications**: Activity tracking and notifications
- **Document Management**: Upload and manage alvarás, certifications, technical sheets, and photos
- **Rating System**: Mutual rating between brands and suppliers
- **Payment Tracking**: Multiple payment status tracking (Pending, Partial, Paid, Overdue)

## Tech Stack

### Backend

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL 16 with Prisma ORM
- **Authentication**: JWT with Passport
- **Validation**: Class Validator & Class Transformer
- **Password Hashing**: bcrypt
- **File Upload**: Multer

### Frontend

- **Framework**: React 19 with TypeScript
- **Routing**: React Router v7
- **Styling**: Vanilla CSS with modern design system
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

### Infrastructure

- **Containerisation**: Docker & Docker Compose
- **Build Tool**: Vite
- **Database Migrations**: Prisma Migrate

## Prerequisites

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **PostgreSQL** 16 (via Docker or local installation)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd texlink-facção-manager
```

### 2. Start the Database

```bash
docker-compose up -d
```

This will start a PostgreSQL container with the following credentials:
- Host: `localhost:5432`
- Database: `texlink`
- User: `texlink`
- Password: `texlink123`

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
# Create a .env file based on your requirements
# Example: DATABASE_URL, JWT_SECRET, etc.

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed

# Start the development server
npm run start:dev
```

The backend API will be available at `http://localhost:3000`

### 4. Frontend Setup

```bash
# From the project root
npm install

# Start the development server
npm run dev
```

The frontend application will be available at `http://localhost:5173`

## Project Structure

```
texlink-facção-manager/
├── backend/                    # NestJS backend application
│   ├── prisma/
│   │   └── schema.prisma      # Database schema and models
│   └── src/
│       ├── modules/           # Feature modules
│       │   ├── auth/          # Authentication & authorisation
│       │   ├── companies/     # Company management
│       │   ├── suppliers/     # Supplier profiles and capabilities
│       │   ├── orders/        # Order lifecycle management
│       │   ├── payments/      # Payment tracking
│       │   ├── ratings/       # Rating system
│       │   ├── chat/          # Messaging system
│       │   ├── team/          # Team and permissions
│       │   └── ...
│       ├── common/            # Shared utilities and guards
│       ├── config/            # Configuration modules
│       └── prisma/            # Prisma service
├── src/                       # React frontend application
│   ├── components/            # Reusable UI components
│   ├── pages/                 # Page components
│   │   ├── brand/            # Brand-specific pages
│   │   ├── supplier/         # Supplier-specific pages
│   │   ├── portal/           # Partner portal
│   │   ├── admin/            # Admin dashboard
│   │   ├── auth/             # Authentication pages
│   │   └── settings/         # Settings pages
│   ├── services/             # API service layer
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript type definitions
├── docker-compose.yml         # Docker services configuration
└── package.json              # Frontend dependencies
```

## User Roles

### System Roles

1. **ADMIN**: Platform administrator with full system access
2. **BRAND**: Fashion brand company creating orders
3. **SUPPLIER**: Manufacturing partner (facção) fulfilling orders

### Company Roles (Team Members)

1. **ADMIN**: Full permissions including team management
2. **OPERATIONS_MANAGER**: Orders, suppliers, messaging, reports
3. **FINANCIAL_MANAGER**: Financial operations and reports
4. **SALES**: Create orders, view suppliers, messaging
5. **PRODUCTION_MANAGER**: (Suppliers) Orders, capacity, messaging
6. **VIEWER**: Read-only access

### Permission System

The platform implements a granular permission system with 25+ individual permissions across categories:

- **Orders**: View, Create, Edit, Delete, Accept/Reject, Update Status
- **Suppliers**: View, Add, Remove, Rate
- **Financial**: View, Manage, Export
- **Messages**: View, Send
- **Reports**: View, Export
- **Team**: View, Invite, Manage, Manage Permissions
- **Settings**: View, Edit
- **Capacity**: View, Manage (for suppliers)

## Core Modules

### Order Management

The order system supports a comprehensive lifecycle with 20+ status stages:

1. **LANCADO_PELA_MARCA**: Posted by brand
2. **ACEITO_PELA_FACCAO**: Accepted by supplier
3. **EM_PREPARACAO_SAIDA_MARCA**: Brand preparing shipment
4. **EM_TRANSITO_PARA_FACCAO**: In transit to supplier
5. **EM_PREPARACAO_ENTRADA_FACCAO**: Supplier receiving materials
6. **EM_PRODUCAO**: In production
7. **PRONTO**: Ready
8. **EM_TRANSITO_PARA_MARCA**: In transit to brand
9. **EM_REVISAO**: Quality review
10. **PARCIALMENTE_APROVADO**: Partially approved
11. **REPROVADO**: Rejected
12. **AGUARDANDO_RETRABALHO**: Awaiting rework
13. **FINALIZADO**: Finalised
14. **RECUSADO_PELA_FACCAO**: Rejected by supplier
15. **DISPONIVEL_PARA_OUTRAS**: Available for other suppliers

### Quality Review System

- Multi-stage review process (Quality Check, Final Review)
- Three possible outcomes: Approved, Partial, Rejected
- Automatic rework order generation for rejected items
- Second-quality item tracking with discount management
- Parent-child order hierarchy for rework tracking

### Assignment Types

- **DIRECT**: Order assigned directly to a specific supplier
- **BIDDING**: Multiple suppliers can view and bid
- **HYBRID**: Combination of direct and bidding

### Payment System

- Multiple payment instalments per order
- Payment status tracking (Pending, Partial, Paid, Overdue)
- Payment proof upload
- Platform fee calculation
- Net value calculation for suppliers

## Development

### Backend Development

```bash
cd backend

# Run in development mode with auto-reload
npm run start:dev

# Run in debug mode
npm run start:debug

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name
```

### Frontend Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Management

```bash
# Open Prisma Studio (Database GUI)
npx prisma studio

# Reset database (caution: deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

## Deployment

### Production Build

**Backend:**

```bash
cd backend
npm run build
npm run start:prod
```

**Frontend:**

```bash
npm run build
```

The built static files will be in the `dist` directory.

### Environment Variables

Ensure the following environment variables are configured for production:

**Backend:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `JWT_EXPIRATION`: Token expiration time
- `PORT`: API server port (default: 3000)
- `NODE_ENV`: `production`

**Frontend:**
- `VITE_API_URL`: Backend API URL

### Docker Deployment

The application includes a `docker-compose.yml` for containerised deployment. For production, consider:

- Using environment-specific compose files
- Implementing proper secrets management
- Setting up reverse proxy (nginx)
- Configuring SSL/TLS certificates
- Implementing database backups
- Setting up monitoring and logging

## Licence

This project is private and unlicenced. All rights reserved.

---

**Built with ❤️ for the textile manufacturing industry**
