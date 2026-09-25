import { start, register } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderRooms } from './pages/rooms.js';
import { renderRoomTypes } from './pages/roomTypes.js';
import { renderCustomers } from './pages/customers.js';
import { renderBookings } from './pages/bookings.js';
import { renderServices } from './pages/services.js';
import { renderInvoices } from './pages/invoices.js';
import { renderPayments } from './pages/payments.js';
import { renderReports } from './pages/reports.js';
import { renderStaff } from './pages/staff.js';
import { renderAudit } from './pages/audit.js';
import { renderShifts } from './pages/shifts.js';
import { renderReviews } from './pages/reviews.js';
import { renderSettings } from './pages/settings.js';
import { renderPromos } from './pages/promos.js';
import { renderBackup } from './pages/backup.js';
import { renderStaffChat } from './pages/chat.js';
import {
  renderPortal, renderCustomerLogin, renderRegister, renderGuestBooking, renderLookup,
  renderCustomerHome, renderCustomerBookings, renderCustomerProfile, renderCustomerChat,
  renderVerifyAccount, renderForgotPassword,
} from './pages/portal.js';

register('/portal', renderPortal);
register('/customer-login', renderCustomerLogin);
register('/register', renderRegister);
register('/guest-booking', renderGuestBooking);
register('/guest-lookup', renderLookup);
register('/verify-account', renderVerifyAccount);
register('/forgot-password', renderForgotPassword);
register('/customer', renderCustomerHome);
register('/customer/bookings', renderCustomerBookings);
register('/customer/profile', renderCustomerProfile);
register('/customer/chat', renderCustomerChat);
register('/login', renderLogin);
register('/dashboard', renderDashboard);
register('/bookings', renderBookings);
register('/rooms', renderRooms);
register('/customers', renderCustomers);
register('/shifts', renderShifts);
register('/chat', renderStaffChat);
register('/invoices', renderInvoices);
register('/payments', renderPayments);
register('/room-types', renderRoomTypes);
register('/services', renderServices);
register('/promos', renderPromos);
register('/reports', renderReports);
register('/reviews', renderReviews);
register('/audit', renderAudit);
register('/staff', renderStaff);
register('/settings', renderSettings);
register('/backup', renderBackup);

start();
