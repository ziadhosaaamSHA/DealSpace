<?php

use App\Http\Controllers\Api\ActivitiesController;
use App\Http\Controllers\Api\ApiKeyController;
use App\Http\Controllers\Api\Reports\AgentActivityReportController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CallsController;
use App\Http\Controllers\Api\CallsTwilioController;
use App\Http\Controllers\Api\CustomFieldsController;
use App\Http\Controllers\Api\Deals\DealsController;
use App\Http\Controllers\Api\Deals\DealStagesController;
use App\Http\Controllers\Api\Deals\DealTypesController;
use App\Http\Controllers\Api\EmailAccountsController;
use App\Http\Controllers\Api\EmailsController;
use App\Http\Controllers\Api\EnumsController;
use App\Http\Controllers\Api\GroupsController;
use App\Http\Controllers\Api\GroupLeadController;
use App\Http\Controllers\Api\NotesController;
use App\Http\Controllers\Api\NotificationsController;
use App\Http\Controllers\Api\EmailsOAuthController;
use App\Http\Controllers\Api\EmailsWebhookController;
use App\Http\Controllers\Api\EmailTemplatesController;
use App\Http\Controllers\Api\People\AddressesController;
use App\Http\Controllers\Api\People\EmailsController as PersonEmailsController;
use App\Http\Controllers\Api\People\FilesController;
use App\Http\Controllers\Api\People\PhonesController;
use App\Http\Controllers\Api\People\PeopleController;
use App\Http\Controllers\Api\People\TagsController;
use App\Http\Controllers\Api\People\StagesController;
use App\Http\Controllers\Api\PondsController;
use App\Http\Controllers\Api\TextMessagesController;
use App\Http\Controllers\Api\TextMessageTemplatesController;
use App\Http\Controllers\Api\TextMessageTwilioWebhookController;
use App\Http\Controllers\Api\UsersController;
use App\Http\Middleware\ResolveTenantFromUser;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\Appointments\AppointmentsController;
use App\Http\Controllers\Api\Appointments\AppointmentOutcomesController;
use App\Http\Controllers\Api\Appointments\AppointmentTypesController;
use App\Http\Controllers\Api\CalendarAccountController;
use App\Http\Controllers\Api\CalendarAuthController;
use App\Http\Controllers\Api\CalendarEventsController;
use App\Http\Controllers\Api\CalendarsWebhookController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\EventsController;
use App\Http\Controllers\Api\Reports\CallReportController;
use App\Http\Controllers\Api\Reports\LeadSourceReportController;
use App\Http\Controllers\Api\Reports\PropertyReportController;
use App\Http\Controllers\Api\Reports\TextReportController;
use App\Http\Controllers\Api\TeamsController;
use App\Http\Controllers\Api\CampaignTrackingController;
use App\Http\Controllers\Api\Reports\AppointmentReportController;
use App\Http\Controllers\Api\Reports\DealReportController;
use App\Http\Controllers\Api\Reports\DealsLeaderboardController;
use App\Http\Controllers\Api\Reports\DealsReportController;
use App\Http\Controllers\Api\Reports\MarketingReportApiController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\TrackingScriptController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\Admin\SubscriptionManagementController;
use App\Http\Controllers\Api\LeadFlowRuleController;
use App\Http\Controllers\Api\ActionPlanController;

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/social-login', [AuthController::class, 'socialLogin']);
    Route::get('/not-authenticated', [AuthController::class, 'notAuthenticated']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/update', [AuthController::class, 'updateProfile']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

/*
|--------------------------------------------------------------------------
| Public Routes (No Authentication Required)
|--------------------------------------------------------------------------
*/

// Enums routes
Route::prefix('enums')->group(function () {
    Route::get('industries', [EnumsController::class, 'getIndustries']);
    Route::get('roles', [EnumsController::class, 'getRoles']);
    Route::get('usage-capacities', [EnumsController::class, 'getUsageCapacities']);
});

// Campaign tracking routes (public)
Route::prefix('campaigns/tracking')->group(function () {
    Route::get('/open/{token}', [CampaignTrackingController::class, 'trackOpen'])->name('campaign.open');
    Route::get('track/click/{token}', [CampaignTrackingController::class, 'trackClick'])->name('campaign.click');
});

// Get tracking scripts
Route::prefix('tracking')->group(function () {
    // Serve the tracking JavaScript
    Route::get('script.js', [TrackingController::class, 'script'])->name('tracking.script');

    // Track events
    Route::post('page-view', [TrackingController::class, 'trackPageView'])->name('tracking.page-view');
    Route::post('form-submission', [TrackingController::class, 'trackFormSubmission'])->name('tracking.form-submission');
    Route::post('custom-event', [TrackingController::class, 'trackCustomEvent'])->name('tracking.custom-event');
});

/*
|--------------------------------------------------------------------------
| Webhook Routes (No Authentication Required)
|--------------------------------------------------------------------------
*/

// Twilio webhooks
Route::prefix('twilio/webhooks')->group(function () {
    Route::post('/incoming', [CallsTwilioController::class, 'incomingCall'])->name('twilio.incoming');
    Route::post('/voice', [CallsTwilioController::class, 'handleVoiceCall']);
    Route::post('/status', [CallsTwilioController::class, 'statusCallback'])->name('twilio.status.callback');
    Route::get('/recording', [CallsTwilioController::class, 'recordingCallback'])->name('twilio.recording.callback');
    Route::post('/outbound/{callId}/twiml', [CallsTwilioController::class, 'outboundTwiML'])->name('twilio.outbound.twiml');
    Route::post('/queue/{callId}', [CallsTwilioController::class, 'queueCallback'])->name('twilio.queue.callback');
    Route::post('/agent/{agentId}/{callId}/screen', [CallsTwilioController::class, 'agentScreen'])->name('twilio.agent.screen');
    Route::post('/agent/{agentId}/{callId}/accept', [CallsTwilioController::class, 'agentAccept'])->name('twilio.agent.accept');
    Route::get('/wait-music', [CallsTwilioController::class, 'waitMusic'])->name('twilio.wait.music');
});

Route::post('/twilio/webhook/sms', [TextMessageTwilioWebhookController::class, 'handleIncomingSms'])->name('twilio.webhook.sms');
Route::post('/twilio/webhook/status', [TextMessageTwilioWebhookController::class, 'handleStatusUpdate'])->name('twilio.webhook.status');

// Email webhooks
Route::group(['prefix' => '/webhooks/on-receive'], function () {
    Route::post('/gmail', [EmailsWebhookController::class, 'handleGmailWebhook']);
    Route::post('/outlook', [EmailsWebhookController::class, 'handleOutlookWebhook']);
});

// Calendar webhooks
Route::post('/calendars/webhooks/google', [CalendarsWebhookController::class, 'handleGoogleWebhook'])->name('calendars.webhook.google');
Route::post('/calendars/webhooks/outlook', [CalendarsWebhookController::class, 'handleOutlookWebhook'])->name('calendars.webhook.outlook');

/*
|--------------------------------------------------------------------------
| Authenticated & Multi-Tenant Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'tenant'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | People Management Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('people')->group(function () {
        // Person Distribute
        Route::post('{personId}/distribute/{groupId}', [GroupLeadController::class, 'distributeToGroup']);
            // Person Claim
        Route::post('{personId}/claim=1', [GroupLeadController::class, 'claim']);
        // People-specific nested routes
        Route::prefix('/{personId}')->group(function () {
            // Collaborators
            Route::post('collaborators/{collaboratorId}', [PeopleController::class, 'attachCollaborator']);
            Route::delete('collaborators/{collaboratorId}', [PeopleController::class, 'detachCollaborator']);

            // Contact Information
            Route::apiResource('emails', PersonEmailsController::class);
            Route::post('emails/{emailId}/set-primary', [PersonEmailsController::class, 'setPrimary']);

            Route::apiResource('phones', PhonesController::class);
            Route::post('phones/{phoneId}/set-primary', [PhonesController::class, 'setPrimary']);

            Route::apiResource('addresses', AddressesController::class);
            Route::post('addresses/{addressId}/set-primary', [AddressesController::class, 'setPrimary']);

            // Tags and Custom Fields
            Route::apiResource('tags', TagsController::class);
            Route::post('custom-fields/set-value', [PeopleController::class, 'setCustomFields']);

            // Files
            Route::apiResource('files', FilesController::class);

        });

        // People configuration routes
        Route::apiResource('/stages', StagesController::class);
        Route::apiResource('/custom-fields', CustomFieldsController::class);

        // Bulk operations
        Route::post('import', [PeopleController::class, 'import']);
        Route::get('download-template', [PeopleController::class, 'downloadTemplate']);
        Route::delete('bulk-delete', [PeopleController::class, 'bulkDelete']);
        Route::post('bulk-export', [PeopleController::class, 'bulkExport']);
    });

    Route::apiResource('people', PeopleController::class);

    /*
    |--------------------------------------------------------------------------
    | User Management Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('users')->group(function () {
        // Bulk operations
        Route::post('import', [UsersController::class, 'import']);
        Route::get('download-template', [UsersController::class, 'downloadTemplate']);
        Route::delete('bulk-delete', [UsersController::class, 'bulkDelete']);
        Route::post('bulk-export', [UsersController::class, 'bulkExport']);

        // User notifications
        Route::prefix('/notifications')->group(function () {
            Route::get('/', [NotificationsController::class, 'getUserNotifications']);
            Route::post('read-all', [NotificationsController::class, 'markAllAsRead']);
            Route::get('unread-count', [NotificationsController::class, 'getUnreadCount']);
        });
    });

    Route::apiResource('users', UsersController::class);

    /*
    |--------------------------------------------------------------------------
    | Organization & Team Management Routes
    |--------------------------------------------------------------------------
    */
    Route::delete('ponds/bulk-delete', [PondsController::class, 'bulkDelete']);
    Route::apiResource('ponds', PondsController::class);

    Route::delete('teams/bulk-delete', [TeamsController::class, 'bulkDelete']);
    Route::apiResource('teams', TeamsController::class);

    // Groups
    Route::prefix('groups')->group(function () {
        Route::get('primary', [GroupsController::class, 'getPrimary']);
        Route::get('type/{type}', [GroupsController::class, 'getAllByType']);
        Route::get('{id}/users', [GroupsController::class, 'getGroupUsers']);
        Route::put('{groupId}/users/{userId}/sort-order/{sortOrder}', [GroupsController::class, 'updateUserSortOrder']);
    });
    Route::apiResource('groups', GroupsController::class);
    /*
    |--------------------------------------------------------------------------
    | Communication Routes
    |--------------------------------------------------------------------------
    */

    // Calls
    Route::prefix('calls/twilio')->group(function () {
        Route::post('/token', [CallsTwilioController::class, 'generateAccessToken']);
        Route::post('/initiate-call', [CallsTwilioController::class, 'initiateCall']);
        Route::post('/log-call', [CallsTwilioController::class, 'logCall']);
        Route::get('/call-history', [CallsTwilioController::class, 'getCallHistory']);
    });
    Route::apiResource('calls', CallsController::class);

    // Text Messages
    Route::apiResource('text-messages', TextMessagesController::class)->except(['update', 'destroy']);
    Route::apiResource('text-message-templates', TextMessageTemplatesController::class);

    // Emails
    Route::prefix('oauth')->group(function () {
        Route::get('google', [EmailsOAuthController::class, 'redirectToGoogle']);
        Route::get('microsoft', [EmailsOAuthController::class, 'redirectToMicrosoft']);
        Route::get('google/callback', [EmailsOAuthController::class, 'handleGoogleCallback']);
        Route::get('microsoft/callback', [EmailsOAuthController::class, 'handleMicrosoftCallback']);
        Route::get('accounts', [EmailsOAuthController::class, 'getConnectedAccounts']);
        Route::post('accounts/disconnect/{id}', [EmailsOAuthController::class, 'disconnectAccount']);
        Route::post('accounts/connect/{id}', [EmailsOAuthController::class, 'connectAccount']);
    });

    Route::apiResource('email-accounts', EmailAccountsController::class)->only(['index', 'destroy']);
    Route::apiResource('emails', EmailsController::class)->only(['index', 'show', 'store']);

    Route::delete('email-templates/bulk-delete', [EmailTemplatesController::class, 'bulkDelete']);
    Route::apiResource('email-templates', EmailTemplatesController::class);

    /*
    |--------------------------------------------------------------------------
    | Sales & Deals Routes
    |--------------------------------------------------------------------------
    */
    Route::apiResource('deals', DealsController::class);
    Route::get('deals-has-closing-date', [DealsController::class, 'getByClosingDateInterval']);

    // Deal Stages
    Route::put('deal-stages/{id}/sort-order', [DealStagesController::class, 'updateSortOrder']);
    Route::apiResource('deal-stages', DealStagesController::class);

    // Deal Types
    Route::put('deal-types/{id}/sort-order', [DealTypesController::class, 'updateSortOrder']);
    Route::apiResource('deal-types', DealTypesController::class);

    /*
    |--------------------------------------------------------------------------
    | Task Management Routes
    |--------------------------------------------------------------------------
    */
    Route::apiResource('tasks', TaskController::class);

    // Task filters and utilities
    Route::prefix('tasks')->group(function () {
        Route::get('filter/today', [TaskController::class, 'todayTasks'])->name('tasks.today');
        Route::get('filter/overdue', [TaskController::class, 'overdueTasks'])->name('tasks.overdue');
        Route::get('filter/future', [TaskController::class, 'futureTasks'])->name('tasks.future');
        Route::get('person/{personId}', [TaskController::class, 'tasksForPerson'])->name('tasks.person');
        Route::get('user/{userId}', [TaskController::class, 'tasksForUser'])->name('tasks.user');
        Route::patch('{id}/complete', [TaskController::class, 'markAsCompleted'])->name('tasks.complete');
        Route::patch('{id}/incomplete', [TaskController::class, 'markAsIncomplete'])->name('tasks.incomplete');
    });

    /*
    |--------------------------------------------------------------------------
    | Appointment & Calendar Routes
    |--------------------------------------------------------------------------
    */
    Route::apiResource('appointments', AppointmentsController::class);

    // Appointment filters
    Route::prefix('appointments')->group(function () {
        // Time-based filters
        Route::get('filter/today', [AppointmentsController::class, 'todayAppointments'])->name('appointments.today');
        Route::get('filter/tomorrow', [AppointmentsController::class, 'tomorrowAppointments'])->name('appointments.tomorrow');
        Route::get('filter/upcoming', [AppointmentsController::class, 'upcomingAppointments'])->name('appointments.upcoming');
        Route::get('filter/past', [AppointmentsController::class, 'pastAppointments'])->name('appointments.past');
        Route::get('filter/current', [AppointmentsController::class, 'currentAppointments'])->name('appointments.current');
        Route::get('filter/this-week', [AppointmentsController::class, 'thisWeekAppointments'])->name('appointments.this-week');
        Route::get('filter/next-week', [AppointmentsController::class, 'nextWeekAppointments'])->name('appointments.next-week');
        Route::get('filter/this-month', [AppointmentsController::class, 'thisMonthAppointments'])->name('appointments.this-month');
        Route::get('filter/date-range', [AppointmentsController::class, 'appointmentsByDateRange'])->name('appointments.date-range');
        Route::get('filter/all-day', [AppointmentsController::class, 'allDayAppointments'])->name('appointments.all-day');
        Route::get('filter/timed', [AppointmentsController::class, 'timedAppointments'])->name('appointments.timed');

        // Type and outcome filters
        Route::get('type/{typeId}', [AppointmentsController::class, 'appointmentsByType'])->name('appointments.by-type');
        Route::get('outcome/{outcomeId}', [AppointmentsController::class, 'appointmentsByOutcome'])->name('appointments.by-outcome');

        // User and invitee filters
        Route::get('user/{userId}', [AppointmentsController::class, 'appointmentsForUser'])->name('appointments.user');
        Route::get('invitee/{inviteeType}/{inviteeId}', [AppointmentsController::class, 'appointmentsWithInvitee'])->name('appointments.invitee');

        // Utilities
        Route::get('statistics/{userId}', [AppointmentsController::class, 'appointmentStatistics'])->name('appointments.statistics');
        Route::post('check-conflicts', [AppointmentsController::class, 'checkConflicts'])->name('appointments.check-conflicts');
    });

    // Appointment Types & Outcomes
    Route::apiResource('appointment-types', AppointmentTypesController::class);
    Route::put('appointment-types/{id}/sort-order', [AppointmentTypesController::class, 'updateSortOrder']);

    Route::apiResource('appointment-outcomes', AppointmentOutcomesController::class);
    Route::put('appointment-outcomes/{id}/sort-order', [AppointmentOutcomesController::class, 'updateSortOrder']);

    // Calendar Integration
    Route::prefix('calendars')->group(function () {
        // Auth initiation
        Route::get('/google/auth', [CalendarAuthController::class, 'googleAuth']);
        Route::get('/outlook/auth', [CalendarAuthController::class, 'outlookAuth']);

        // OAuth callbacks
        Route::get('/google/callback', [CalendarAuthController::class, 'googleCallback'])->name('calendars.google.callback');
        Route::get('/outlook/callback', [CalendarAuthController::class, 'outlookCallback'])->name('calendars.outlook.callback');

        // Alternative routes for account management
        Route::post('/accounts/{id}/connect', [CalendarAccountController::class, 'connect']);
        Route::post('/accounts/{id}/disconnect', [CalendarAccountController::class, 'disconnect']);
        Route::post('/accounts/{id}/sync', [CalendarAccountController::class, 'sync']);
        Route::delete('/api/calendars/accounts/{id}', [CalendarAccountController::class, 'destroy']);
    });

    // Calendar Account Management
    Route::prefix('calendar-accounts')->group(function () {
        Route::get('/', [CalendarAccountController::class, 'index']);
        Route::get('/{id}', [CalendarAccountController::class, 'show']);
        Route::post('/{id}/connect', [CalendarAccountController::class, 'connect']);
        Route::post('/{id}/disconnect', [CalendarAccountController::class, 'disconnect']);
        Route::delete('/{id}', [CalendarAccountController::class, 'destroy']);
        Route::post('/{id}/sync', [CalendarAccountController::class, 'sync']);
        Route::post('/{id}/refresh-webhook', [CalendarAccountController::class, 'refreshWebhook']);
        Route::patch('/{id}/settings', [CalendarAccountController::class, 'updateSettings']);
    });

    Route::apiResource('/calendar/events', CalendarEventsController::class);

    /*
    |--------------------------------------------------------------------------
    | Campaign Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('campaigns')->group(function () {
        Route::get('/', [CampaignController::class, 'index']);
        Route::post('/', [CampaignController::class, 'store']);
        Route::post('/preview-recipients', [CampaignController::class, 'previewRecipients']);
        Route::get('/{campaign}', [CampaignController::class, 'show']);
        Route::get('/{campaign}/analytics', [CampaignController::class, 'analytics']);
    });

    /*
    |--------------------------------------------------------------------------
    | Notification Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('notifications')->group(function () {
        Route::delete('bulk-delete', [NotificationsController::class, 'bulkDelete']);
        Route::post('send-to-tenant/{tenantId}', [NotificationsController::class, 'sendToTenant']);
        Route::post('send-to-role', [NotificationsController::class, 'sendToRole']);

        Route::prefix('{notificationId}')->group(function () {
            Route::post('users/{userId}', [NotificationsController::class, 'addUser']);
            Route::delete('users/{userId}', [NotificationsController::class, 'removeUser']);
            Route::post('users/{userId}/read', [NotificationsController::class, 'markAsRead']);
        });
    });
    Route::apiResource('notifications', NotificationsController::class);

    /*
    |--------------------------------------------------------------------------
    | Event & Activity Routes
    |--------------------------------------------------------------------------
    */
    Route::apiResource('events', EventsController::class);
    Route::get('/events/types/available', [EventsController::class, 'getEventTypes']);
    Route::get('/events/type/{type}', [EventsController::class, 'getByType']);
    Route::get('/events/date-range/filter', [EventsController::class, 'getByDateRange']);

    Route::get('activities', [ActivitiesController::class, 'index']);
    Route::apiResource('notes', NotesController::class);

    /*
    |--------------------------------------------------------------------------
    | Reporting Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('reports')->group(function () {
        // Agent Activity Reports
        Route::post('/agent-activity', [AgentActivityReportController::class, 'index']);
        Route::post('/agent-activity/download-excel', [AgentActivityReportController::class, 'export']);

        // Property Reports
        Route::prefix('property-reports')->group(function () {
            Route::post('/', [PropertyReportController::class, 'getPropertyReport']);
            Route::post('/by-zip-code', [PropertyReportController::class, 'getInquiriesByZipCode']);
            Route::post('/by-property', [PropertyReportController::class, 'getInquiriesByProperty']);
            Route::post('/property/{mlsNumber}', [PropertyReportController::class, 'getPropertyDetailReport']);
            Route::post('/property/{mlsNumber}/leads', [PropertyReportController::class, 'getPropertyLeads']);
            Route::post('/summary', [PropertyReportController::class, 'getPropertyReportSummary']);
            Route::post('/top-performing', [PropertyReportController::class, 'getTopPerformingProperties']);
        });

        // Lead Source Reports
        Route::post('/lead-source', [LeadSourceReportController::class, 'index']);
        Route::post('/lead-source/download-excel', [LeadSourceReportController::class, 'export']);

        // Call Reports
        Route::post('/calls', [CallReportController::class, 'index']);
        Route::post('/calls/download-excel', [CallReportController::class, 'export']);

        // Text Reports
        Route::post('/texts', [TextReportController::class, 'index']);
        Route::post('/texts/download-excel', [TextReportController::class, 'export']);

        Route::prefix('/marketing')->group(function () {
            // Get marketing report data
            Route::get('/', [MarketingReportApiController::class, 'index']);
            Route::get('/campaign-details', [MarketingReportApiController::class, 'campaignDetails']);
            Route::get('/export', [MarketingReportApiController::class, 'export']);
        });

        Route::prefix('/deals')->group(function () {
            Route::get('/', [DealReportController::class, 'index']);
            Route::get('/export', [DealReportController::class, 'export']);
            Route::get('/leaderboard', [DealsLeaderboardController::class, 'index']);
            Route::get('/leaderboard/options', [DealsLeaderboardController::class, 'getFilterOptions']);
        });

        Route::prefix('/appointments')->group(function () {
            Route::get('/', [AppointmentReportController::class, 'index']);
            Route::get('/export', [AppointmentReportController::class, 'export']);
            Route::get('/options', [AppointmentReportController::class, 'getFilterOptions']);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | API Key Management Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('api-keys')->group(function () {
        Route::get('/', [ApiKeyController::class, 'index']);
        Route::post('/', [ApiKeyController::class, 'store']);
        Route::get('/{apiKey}', [ApiKeyController::class, 'show']);
        Route::put('/{apiKey}', [ApiKeyController::class, 'update']);
        Route::delete('/{apiKey}', [ApiKeyController::class, 'destroy']);
        Route::post('/{apiKey}/revoke', [ApiKeyController::class, 'revoke']);
        Route::post('/{apiKey}/activate', [ApiKeyController::class, 'activate']);
        Route::post('/{apiKey}/regenerate', [ApiKeyController::class, 'regenerate']);
    });

    /*
    |--------------------------------------------------------------------------
    | Managing tracking scripts
    |--------------------------------------------------------------------------
    */
    Route::prefix('tracking-scripts')->group(function () {
        // CRUD operations
        Route::get('/', [TrackingScriptController::class, 'index']);
        Route::post('/', [TrackingScriptController::class, 'store']);
        Route::get('/{id}', [TrackingScriptController::class, 'show']);
        Route::put('/{id}', [TrackingScriptController::class, 'update']);
        Route::delete('/{id}', [TrackingScriptController::class, 'destroy']);

        // Additional management endpoints
        Route::post('/{id}/toggle-status', [TrackingScriptController::class, 'toggleStatus']);
        Route::post('/{id}/regenerate-key', [TrackingScriptController::class, 'regenerateKey']);
        Route::post('/{id}/duplicate', [TrackingScriptController::class, 'duplicate']);

        // Analytics and reporting
        Route::get('/{id}/statistics', [TrackingScriptController::class, 'statistics']);
        Route::get('/{id}/recent-events', [TrackingScriptController::class, 'recentEvents']);
        Route::get('/{id}/tracking-code', [TrackingScriptController::class, 'getTrackingCode']);

        // Helper endpoints
        Route::post('/suggest-field-mappings', [TrackingScriptController::class, 'suggestFieldMappings']);
    });

    /*
    |--------------------------------------------------------------------------
    | Subscription Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware(['auth:sanctum'])->prefix('subscriptions')->name('subscriptions.')->group(function () {
        Route::get('/plans', [SubscriptionController::class, 'plans'])->name('plans');
        Route::get('/status', [SubscriptionController::class, 'status'])->name('status');
        Route::post('/subscribe', [SubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::post('/verify', [SubscriptionController::class, 'verifyCheckoutSession'])->name('verify');
        Route::post('/cancel', [SubscriptionController::class, 'cancel'])->name('cancel');
        Route::post('/cancel-now', [SubscriptionController::class, 'cancelNow'])->name('cancel-now');
        Route::post('/resume', [SubscriptionController::class, 'resume'])->name('resume');
        Route::get('/portal', [SubscriptionController::class, 'portalSession'])->name('portal');
        Route::get('/invoices', [SubscriptionController::class, 'invoices'])->name('invoices');
        Route::get('/invoices/{invoiceId}/download', [SubscriptionController::class, 'downloadInvoice'])->name('invoices.download');
        Route::get('/usage', [SubscriptionController::class, 'usage'])->name('usage');
    });

    // Lead Flow Rule Routes
    Route::prefix('lead-flow-rules')->group(function () {
        Route::get('/', [LeadFlowRuleController::class, 'index']);
        Route::post('/', [LeadFlowRuleController::class, 'store']);
        Route::put('/{leadFlowRule}', [LeadFlowRuleController::class, 'update']);
        Route::delete('/{leadFlowRule}', [LeadFlowRuleController::class, 'destroy']);
        Route::post('/reorder', [LeadFlowRuleController::class, 'reorder']);
        Route::post('/copy-from-source', [LeadFlowRuleController::class, 'copyFromSource']);
        Route::post('/{leadFlowRule}/test', [LeadFlowRuleController::class, 'testRule']);
        Route::get('/statistics', [LeadFlowRuleController::class, 'statistics']);
    });

    // Action Plans
    Route::prefix('action-plans')->group(function () {
        Route::get('/', [ActionPlanController::class, 'index']);
        Route::post('/', [ActionPlanController::class, 'store']);
        Route::get('/{actionPlan}', [ActionPlanController::class, 'show']);
        Route::put('/{actionPlan}', [ActionPlanController::class, 'update']);
        Route::delete('/{actionPlan}', [ActionPlanController::class, 'destroy']);
        Route::get('/{actionPlan}/statistics', [ActionPlanController::class, 'statistics']);
        Route::post('/{actionPlan}/assign', [ActionPlanController::class, 'assignToPerson']);
    });

    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/leads/{lead}/claim', [GroupLeadController::class, 'claimLead']);
    });
});


/*
|--------------------------------------------------------------------------
| Broadcasting Routes
|--------------------------------------------------------------------------
*/
Broadcast::routes(['middleware' => ['auth:sanctum']]);

// Stripe webhook (no auth required)
Route::post('/stripe/webhook', [WebhookController::class, 'handleWebhook'])->name('cashier.webhook');
