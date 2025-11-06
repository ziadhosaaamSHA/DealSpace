<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\Auth\AuthRepository;
use App\Repositories\Auth\AuthRepositoryInterface;
use App\Services\Auth\AuthService;
use App\Services\Auth\AuthServiceInterface;
use App\Repositories\People\PeopleRepository;
use App\Repositories\People\PeopleRepositoryInterface;
use App\Services\People\PersonService;
use App\Services\People\PersonServiceInterface;
use App\Services\People\EmailServiceInterface  as PersonEmailAccountServiceInterface;
use App\Services\People\EmailService as PersonEmailAccountService;
use App\Services\People\PhoneServiceInterface;
use App\Repositories\People\EmailsRepositoryInterface as PersonEmailsRepositoryInterface;
use App\Repositories\People\EmailsRepository as PersonEmailsRepository;
use App\Services\People\PhoneService;
use App\Repositories\People\PhonesRepositoryInterface;
use App\Repositories\People\PhonesRepository;
use App\Repositories\People\AddressesRepository;
use App\Repositories\People\AddressesRepositoryInterface;
use App\Services\People\AddressService;
use App\Services\People\AddressServiceInterface;
use App\Repositories\People\TagsRepository;
use App\Repositories\People\TagsRepositoryInterface;
use App\Services\People\TagService;
use App\Services\People\TagServiceInterface;
use App\Services\People\StageService;
use App\Services\People\StageServiceInterface;
use App\Repositories\People\StagesRepository;
use App\Repositories\People\StagesRepositoryInterface;
use App\Services\Users\UserService;
use App\Services\Users\UserServiceInterface;
use App\Repositories\Users\UsersRepository;
use App\Repositories\Users\UsersRepositoryInterface;
use App\Repositories\Groups\GroupsRepository;
use App\Repositories\Groups\GroupsRepositoryInterface;
use App\Services\Groups\GroupService;
use App\Services\Groups\GroupServiceInterface;
use App\Repositories\Ponds\PondsRepository;
use App\Repositories\Ponds\PondsRepositoryInterface;
use App\Services\Ponds\PondService;
use App\Services\Ponds\PondServiceInterface;
use App\Repositories\CustomFields\CustomFieldsRepository;
use App\Repositories\CustomFields\CustomFieldsRepositoryInterface;
use App\Services\CustomFields\CustomFieldService;
use App\Services\CustomFields\CustomFieldServiceInterface;
use App\Repositories\Notifications\NotificationsRepository;
use App\Repositories\Notifications\NotificationsRepositoryInterface;
use App\Services\Notifications\NotificationService;
use App\Services\Notifications\NotificationServiceInterface;
use App\Repositories\Notes\NotesRepository;
use App\Repositories\Notes\NotesRepositoryInterface;
use App\Services\Notes\NoteService;
use App\Services\Notes\NoteServiceInterface;
use App\Repositories\Calls\CallsRepository;
use App\Repositories\Calls\CallsRepositoryInterface;
use App\Services\Calls\CallService;
use App\Services\Calls\CallServiceInterface;
use App\Repositories\TextMessages\TextMessagesRepository;
use App\Repositories\TextMessages\TextMessagesRepositoryInterface;
use App\Services\TextMessages\TextMessageService;
use App\Services\TextMessages\TextMessageServiceInterface;
use App\Services\Auth\TwilioPhoneNumberServiceInterface;
use App\Services\Auth\TwilioPhoneNumberService;
use App\Services\Calls\CallTwilioServiceInterface;
use App\Services\Calls\CallTwilioService;
use App\Repositories\EmailAccounts\EmailAccountsRepository;
use App\Repositories\EmailAccounts\EmailAccountsRepositoryInterface;
use App\Repositories\Emails\EmailsRepository;
use App\Repositories\Emails\EmailsRepositoryInterface;
use App\Services\EmailAccounts\EmailAccountService;
use App\Services\EmailAccounts\EmailAccountServiceInterface;
use App\Services\Emails\EmailService;
use App\Services\Emails\EmailServiceInterface;
use App\Repositories\EmailTemplates\EmailTemplatesRepository;
use App\Repositories\EmailTemplates\EmailTemplatesRepositoryInterface;
use App\Services\EmailTemplates\EmailTemplateService;
use App\Services\EmailTemplates\EmailTemplateServiceInterface;
use App\Repositories\TextMessageTemplates\TextMessageTemplatesRepository;
use App\Repositories\TextMessageTemplates\TextMessageTemplatesRepositoryInterface;
use App\Services\PhoneNumber\PhoneNumberService;
use App\Services\PhoneNumber\PhoneNumberServiceInterface;
use App\Services\TextMessages\TextMessageTwilioService;
use App\Services\TextMessages\TextMessageTwilioServiceInterface;
use App\Services\TextMessageTemplates\TextMessageTemplateService;
use App\Services\TextMessageTemplates\TextMessageTemplateServiceInterface;
use App\Repositories\People\FilesRepository;
use App\Repositories\People\FilesRepositoryInterface;
use App\Services\People\FileService;
use App\Services\People\FileServiceInterface;
use App\Repositories\Deals\DealsRepository;
use App\Repositories\Deals\DealsRepositoryInterface;
use App\Services\Deals\DealService;
use App\Services\Deals\DealServiceInterface;
use App\Repositories\Deals\DealStagesRepository;
use App\Repositories\Deals\DealStagesRepositoryInterface;
use App\Services\Deals\DealStageService;
use App\Services\Deals\DealStageServiceInterface;
use App\Repositories\Deals\DealTypesRepository;
use App\Repositories\Deals\DealTypesRepositoryInterface;
use App\Services\Deals\DealTypeService;
use App\Services\Deals\DealTypeServiceInterface;
use App\Repositories\Deals\DealAttachmentsRepository;
use App\Repositories\Deals\DealAttachmentsRepositoryInterface;
use App\Services\Deals\DealAttachmentService;
use App\Services\Deals\DealAttachmentServiceInterface;
use App\Repositories\Tasks\TasksRepository;
use App\Repositories\Tasks\TasksRepositoryInterface;
use App\Services\Tasks\TaskService;
use App\Services\Tasks\TaskServiceInterface;
use App\Repositories\Appointments\AppointmentsRepository;
use App\Repositories\Appointments\AppointmentsRepositoryInterface;
use App\Services\Appointments\AppointmentService;
use App\Services\Appointments\AppointmentServiceInterface;
use App\Repositories\Appointments\AppointmentTypesRepository;
use App\Repositories\Appointments\AppointmentTypesRepositoryInterface;
use App\Services\Appointments\AppointmentTypeService;
use App\Services\Appointments\AppointmentTypeServiceInterface;
use App\Repositories\Appointments\AppointmentOutcomesRepository;
use App\Repositories\Appointments\AppointmentOutcomesRepositoryInterface;
use App\Services\Appointments\AppointmentOutcomeService;
use App\Services\Appointments\AppointmentOutcomeServiceInterface;
use App\Services\CalendarAccounts\CalendarAccountServiceInterface;
use App\Services\CalendarAccounts\CalendarAccountService;
use App\Services\Calendar\CalendarEventServiceInterface;
use App\Services\Calendar\CalendarEventService;
use App\Repositories\Calendar\CalendarEventRepositoryInterface;
use App\Repositories\Calendar\CalendarEventRepository;
use App\Services\Teams\TeamServiceInterface;
use App\Services\Teams\TeamService;
use App\Repositories\Teams\TeamsRepositoryInterface;
use App\Repositories\Teams\TeamsRepository;
use App\Services\Events\EventServiceInterface;
use App\Services\Events\EventService;
use App\Repositories\Events\EventsRepositoryInterface;
use App\Repositories\Events\EventsRepository;
use App\Repositories\Integrations\ApiKeyRepository;
use App\Repositories\Integrations\ApiKeyRepositoryInterface;
use App\Services\Reports\PropertyReportService;
use App\Services\Reports\PropertyReportServiceInterface;
use App\Repositories\Reports\PropertyReportRepositoryInterface;
use App\Repositories\Reports\PropertyReportRepository;
use App\Services\Tracking\TrackingScriptService;
use App\Services\Tracking\TrackingScriptServiceInterface;
use App\Services\Tracking\TrackingService;
use App\Services\Tracking\TrackingServiceInterface;
use App\Services\Tenants\TenantSubscriptionServiceInterface;
use App\Services\Tenants\TenantSubscriptionService;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->bind(AuthRepositoryInterface::class, AuthRepository::class);
        $this->app->bind(AuthServiceInterface::class, AuthService::class);

        $this->app->bind(PeopleRepositoryInterface::class, PeopleRepository::class);
        $this->app->bind(PersonServiceInterface::class, PersonService::class);

        $this->app->bind(PersonEmailsRepositoryInterface::class, PersonEmailsRepository::class);
        $this->app->bind(PersonEmailAccountServiceInterface::class, PersonEmailAccountService::class);

        $this->app->bind(PhonesRepositoryInterface::class, PhonesRepository::class);
        $this->app->bind(PhoneServiceInterface::class, PhoneService::class);

        $this->app->bind(AddressesRepositoryInterface::class, AddressesRepository::class);
        $this->app->bind(AddressServiceInterface::class, AddressService::class);

        $this->app->bind(TagsRepositoryInterface::class, TagsRepository::class);
        $this->app->bind(TagServiceInterface::class, TagService::class);

        $this->app->bind(StagesRepositoryInterface::class, StagesRepository::class);
        $this->app->bind(StageServiceInterface::class, StageService::class);

        $this->app->bind(UsersRepositoryInterface::class, UsersRepository::class);
        $this->app->bind(UserServiceInterface::class, UserService::class);

        $this->app->bind(GroupsRepositoryInterface::class, GroupsRepository::class);
        $this->app->bind(GroupServiceInterface::class, GroupService::class);

        $this->app->bind(PondsRepositoryInterface::class, PondsRepository::class);
        $this->app->bind(PondServiceInterface::class, PondService::class);

        $this->app->bind(CustomFieldsRepositoryInterface::class, CustomFieldsRepository::class);
        $this->app->bind(CustomFieldServiceInterface::class, CustomFieldService::class);

        $this->app->bind(NotificationsRepositoryInterface::class, NotificationsRepository::class);
        $this->app->bind(NotificationServiceInterface::class, NotificationService::class);

        $this->app->bind(NotesRepositoryInterface::class, NotesRepository::class);
        $this->app->bind(NoteServiceInterface::class, NoteService::class);

        $this->app->bind(CallsRepositoryInterface::class, CallsRepository::class);
        $this->app->bind(CallServiceInterface::class, CallService::class);
        $this->app->bind(CallTwilioServiceInterface::class, CallTwilioService::class);

        $this->app->bind(TextMessagesRepositoryInterface::class, TextMessagesRepository::class);
        $this->app->bind(TextMessageServiceInterface::class, TextMessageService::class);

        $this->app->bind(TwilioPhoneNumberServiceInterface::class, TwilioPhoneNumberService::class);

        $this->app->bind(EmailAccountsRepositoryInterface::class, EmailAccountsRepository::class);
        $this->app->bind(EmailAccountServiceInterface::class, EmailAccountService::class);

        $this->app->bind(EmailServiceInterface::class, EmailService::class);
        $this->app->bind(EmailsRepositoryInterface::class, EmailsRepository::class);

        $this->app->bind(EmailTemplatesRepositoryInterface::class, EmailTemplatesRepository::class);
        $this->app->bind(EmailTemplateServiceInterface::class, EmailTemplateService::class);

        $this->app->bind(TextMessageServiceInterface::class, TextMessageService::class);
        $this->app->bind(TextMessagesRepositoryInterface::class, TextMessagesRepository::class);

        $this->app->bind(TextMessageTemplatesRepositoryInterface::class, TextMessageTemplatesRepository::class);
        $this->app->bind(TextMessageTemplateServiceInterface::class, TextMessageTemplateService::class);

        $this->app->bind(TextMessageTwilioServiceInterface::class, TextMessageTwilioService::class);
        $this->app->bind(PhoneNumberServiceInterface::class, PhoneNumberService::class);

        $this->app->bind(FilesRepositoryInterface::class, FilesRepository::class);
        $this->app->bind(FileServiceInterface::class, FileService::class);

        $this->app->bind(DealsRepositoryInterface::class, DealsRepository::class);
        $this->app->bind(DealServiceInterface::class, DealService::class);
        $this->app->bind(DealStagesRepositoryInterface::class, DealStagesRepository::class);
        $this->app->bind(DealStageServiceInterface::class, DealStageService::class);
        $this->app->bind(DealTypesRepositoryInterface::class, DealTypesRepository::class);
        $this->app->bind(DealTypeServiceInterface::class, DealTypeService::class);
        $this->app->bind(DealAttachmentsRepositoryInterface::class, DealAttachmentsRepository::class);
        $this->app->bind(DealAttachmentServiceInterface::class, DealAttachmentService::class);

        $this->app->bind(TasksRepositoryInterface::class, TasksRepository::class);
        $this->app->bind(TaskServiceInterface::class, TaskService::class);

        $this->app->bind(AppointmentsRepositoryInterface::class, AppointmentsRepository::class);
        $this->app->bind(AppointmentServiceInterface::class, AppointmentService::class);
        $this->app->bind(AppointmentTypesRepositoryInterface::class, AppointmentTypesRepository::class);
        $this->app->bind(AppointmentTypeServiceInterface::class, AppointmentTypeService::class);
        $this->app->bind(AppointmentOutcomesRepositoryInterface::class, AppointmentOutcomesRepository::class);
        $this->app->bind(AppointmentOutcomeServiceInterface::class, AppointmentOutcomeService::class);

        $this->app->bind(CalendarAccountServiceInterface::class, CalendarAccountService::class);
        $this->app->bind(CalendarEventRepositoryInterface::class, CalendarEventRepository::class);
        $this->app->bind(CalendarEventServiceInterface::class, CalendarEventService::class);

        $this->app->bind(TeamsRepositoryInterface::class, TeamsRepository::class);
        $this->app->bind(TeamServiceInterface::class, TeamService::class);

        $this->app->bind(EventsRepositoryInterface::class, EventsRepository::class);
        $this->app->bind(EventServiceInterface::class, EventService::class);

        $this->app->bind(PropertyReportRepositoryInterface::class, PropertyReportRepository::class);
        $this->app->bind(PropertyReportServiceInterface::class, PropertyReportService::class);

        $this->app->bind(ApiKeyRepositoryInterface::class, ApiKeyRepository::class);

        $this->app->bind(TrackingScriptServiceInterface::class, TrackingScriptService::class);
        $this->app->bind(TrackingServiceInterface::class, TrackingService::class);

        $this->app->bind(TenantSubscriptionServiceInterface::class, TenantSubscriptionService::class);
    }
}
