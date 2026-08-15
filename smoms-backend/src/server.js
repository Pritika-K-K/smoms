import { migrateTicketNumbers } from '../prisma/migrate-ticket-numbers.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import modules
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import departmentRoutes from './modules/departments/departments.routes.js';
import machineRoutes from './modules/machines/machines.routes.js';
import ticketRoutes from './modules/tickets/tickets.routes.js';
import workOrderRoutes from './modules/workOrders/workOrders.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import auditLogRoutes from './modules/auditLogs/auditLogs.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';

import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', app: 'SMOMS API', timestamp: new Date().toISOString() });
});

// Register Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/chat', chatRoutes);

// Error Handling Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SMOMS Backend Server running on http://localhost:${PORT}`);
  console.log(`=======================================================`);

  // Initialize node-cron background job
  });

// Run Ticket Number Format Migration on startup
migrateTicketNumbers();
