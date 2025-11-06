import type React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import PrivateRoute from "./PrivateRoute"
import RoleBasedRoute from "./RoleBasedRoute"
import AppLayout from "../layout/AppLayout"
import AuthLayout from "../layout/AuthLayout"
import Blank from "../pages/Blank"
import NotFound from "../pages/OtherPage/NotFound"
import UserProfiles from "../pages/UserProfiles"
import Login from "../features/auth/Login"
import Register from "../features/auth/Register"
import People from "../features/people"
import AddPersonPage from "../features/people/AddPerson"
import Users from "../features/users"
import CreateUser from "../features/users/AddUser"
import EditUser from "../features/users/EditUser"
import AdminDashboard from "../pages/Admin"
import Groups from "../features/groups"
import Ponds from "../features/ponds"
import CreateGroup from "../features/groups/CreateGroup"
import EditGroup from "../features/groups/EditGroup"
import Stages from "../features/stages"
import CustomFields from "../features/customFields"
import NotificationsPage from "../features/notifications/NotificationsPage"
import PersonView from "../features/people/PersonView"
import OAuthCallback from "../features/manageEmails/OAuthCallback"
import ManageEmails from "../features/manageEmails"
import EmailTemplates from "../features/emailTemplates"
import TextMessageTemplates from "../features/textMessageTemplates"
import Deals from "../features/deals"
import DealTypes from "../features/dealTypes"
import AppointmentTypes from "../features/appointmentTypes"
import AppointmentOutcomes from "../features/appointmentOutcomes"
import CalendarOAuthCallback from "../features/calendar/CalendarOAuthCallback"
import IntegratedCalendarApp from "../features/calendar"
import ReportsOverview from "../pages/Reports"
import AgentActivityReport from "../features/reporting/agentActivity"
import Teams from "../features/teams"
import PropertyReport from "../features/reporting/propertyReport"
import LeadSourceReport from "../features/reporting/leadSource/leadSourceReport"
import CallsReport from "../features/reporting/calls/callsReport"
import TextsReport from "../features/reporting/texts/textsReport"
import IntegrationsOverview from "../pages/Integrations"
import ApiKeys from "../features/apiKeys/inedex"
import TrackingScripts from "../features/trackingScripts"
import MarketingReport from "../features/reporting/marktingReport"
import DealsReport from "../features/reporting/deals"
import LeaderboardReport from "../features/reporting/leaderboard"
import AppointmentsReportsPage from "../features/reporting/appointments"
import SubscriptionManagement from '../features/subscriptions/SubscriptionManagement'
import SubscriptionUsage from "../features/subscriptions/SubscriptionUsage"
import VerifySubscription from '../features/subscriptions/VerifySubscription'
import { LeadFlowRulesPage } from "../features/leadFlowRules/index"
import { RoleEnum } from "../utils/roles"
import ComingSoon from "../pages/OtherPage/ComingSoon"

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Layout - Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            {/* Public to all authenticated users */}
            <Route index path="/" element={<People />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/people" element={<People />} />
            <Route path="/people/add" element={<AddPersonPage />} />
            <Route path="/people/:personId" element={<PersonView />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/calendar" element={<IntegratedCalendarApp />} />
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/blank" element={<Blank />} />
            
            {/* OAuth Callbacks - All roles */}
            <Route path="/auth/google/callback" element={<OAuthCallback />} />
            <Route path="/auth/microsoft/callback" element={<OAuthCallback />} />
            <Route path="/auth/google/calendar/callback" element={<CalendarOAuthCallback />} />
            <Route path="/auth/microsoft/calendar/callback" element={<CalendarOAuthCallback />} />

            {/* Admin Routes - Owner & Admin only */}
            <Route element={<RoleBasedRoute allowedRoles={[RoleEnum.OWNER, RoleEnum.ADMIN]} />}>
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/users/add" element={<CreateUser />} />
              <Route path="/admin/users/:userId/edit" element={<EditUser />} />
              <Route path="/admin/lead-flow-rules" element={<LeadFlowRulesPage />} />
              <Route path="/admin/groups" element={<Groups />} />
              <Route path="/admin/groups/create" element={<CreateGroup />} />
              <Route path="/admin/groups/edit/:groupId" element={<EditGroup />} />
              <Route path="/admin/ponds" element={<Ponds />} />
              <Route path="/admin/teams" element={<Teams />} />
              <Route path="/admin/stages" element={<Stages />} />
              <Route path="/admin/custom-fields" element={<CustomFields />} />
              <Route path="/admin/deal-types" element={<DealTypes />} />
              <Route path="/admin/appointment-types" element={<AppointmentTypes />} />
              <Route path="/admin/appointment-outcomes" element={<AppointmentOutcomes />} />
              
              {/* Subscriptions - Owner & Admin only */}
              <Route path="/admin/subscriptions" element={<SubscriptionManagement />} />
              <Route path="/admin/subscriptions/usage" element={<SubscriptionUsage />} />
              <Route path="/subscriptions/verify" element={<VerifySubscription />} />
            </Route>

            {/* Accessible to all roles */}
            <Route path="/admin/overview" element={<AdminDashboard />} />
            <Route path="/admin/manage-emails" element={<ManageEmails />} />
            <Route path="/admin/email-templates" element={<EmailTemplates />} />
            <Route path="/admin/text-templates" element={<TextMessageTemplates />} />

            {/* Reports - All roles can view */}
            <Route path="/reports" element={<ReportsOverview />} />
            <Route path="/reports/agent-activity" element={<AgentActivityReport />} />
            <Route path="/reports/properties" element={<PropertyReport />} />
            <Route path="/reports/lead-sources" element={<LeadSourceReport />} />
            <Route path="/reports/calls" element={<CallsReport />} />
            <Route path="/reports/texts" element={<TextsReport />} />
            <Route path="/reports/marketing" element={<MarketingReport />} />
            <Route path="/reports/deals" element={<DealsReport />} />
            <Route path="/reports/leaderboard" element={<LeaderboardReport />} />
            <Route path="/reports/appointments" element={<AppointmentsReportsPage />} />

            {/* Integrations - All roles can view */}
            <Route path="/integrations" element={<IntegrationsOverview />} />
            <Route path="/integrations/api-keys" element={<ApiKeys />} />
            <Route path="/integrations/dealspace-pixel" element={<TrackingScripts />} />

            {/* Coming Soon Pages - Features under development */}
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route path="/admin/automations" element={<Navigate to="/coming-soon" />} />
            <Route path="/admin/action-plans" element={<Navigate to="/coming-soon" />} />
            <Route path="/admin/calling" element={<Navigate to="/coming-soon" />} />
            <Route path="/admin/import" element={<Navigate to="/coming-soon" />} />
            <Route path="/inbox" element={<Navigate to="/coming-soon" />} />
            <Route path="/integrations/api-documentation" element={<Navigate to="/coming-soon" />} />
          </Route>
        </Route>

        {/* Fallback Routes */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter

