import { createApi } from "@reduxjs/toolkit/query/react"
import type { Person, CreatePersonRequest, UpdatePersonRequest, PersonEvent } from "../../types/people"
import type { ApiResponse, ImportResponseData, PaginatedResponse } from "../../types/meta"
import { customBaseQuery } from "../../app/baseQueryHandler"
import { updatePersonFormData } from "../../utils/peopleFormData"

interface PeopleFilters {
  search?: string
  stage_id?: number | null
  team_id?: number | null
  user_ids?: number[]
  deal_type_id?: number | null
  assigned_pond_id?: number | null
  available_for_group_id?: number | null
}

interface GetPeopleParams {
  page: number
  per_page: number
  search?: string
  stage_id?: number | null
  team_id?: number | null
  user_ids?: number[]
  deal_type_id?: number | null
  assigned_pond_id?: number | null
  available_for_group_id?: number | null
}
interface GetEventsParams {
  person_id?: number
  page?: number
  per_page?: number
  search?: string
  type?: string
  source?: string
  date_from?: string
  date_to?: string
}
interface GetPersonByIdParams {
  id: number
  filters?: PeopleFilters
}

interface BulkActionParams {
  ids?: number[]
  exceptionIds?: number[]
  isAllSelected: boolean
  filters?: PeopleFilters
}

interface DistributeToGroupParams {
  personId?: number
  groupId?: number
}

interface CampaignData {
  name: string
  description: string
  subject: string
  body: string
  body_html: string
  email_account_id: number
  use_all_emails: boolean
  recipient_ids?: number[]
  is_all_selected: boolean
  // Filter options
  stage_id?: number | null
  team_id?: number | null
  user_ids?: number[]
  search?: string
  deal_type_id?: number | null
  assigned_pond_id?: number | null
  available_for_group_id?: number | null
}

interface EmailAccount {
  id: number
  name: string
  email: string
  provider: string
}

export const peopleApi = createApi({
  reducerPath: "peopleApi",
  baseQuery: customBaseQuery,
  tagTypes: [
    "Person",
    "PersonEmail",
    "PersonPhone",
    "PersonAddress",
    "PersonTag",
    "PersonCollaborator",
    "PersonFile",
    "EmailAccount",
    "Campaign",
    "PersonEvent"
  ],
  endpoints: (builder) => ({
    getPeople: builder.query<PaginatedResponse<Person>, GetPeopleParams>({
      query: ({ page, per_page, search, stage_id, team_id, user_ids, deal_type_id, assigned_pond_id, available_for_group_id }) => {
        const params: any = { page, per_page }
        if (search) params.search = search
        if (stage_id) params.stage_id = stage_id
        if (team_id) params.team_id = team_id
        if (deal_type_id) params.deal_type_id = deal_type_id
        if (assigned_pond_id) params.assigned_pond_id = assigned_pond_id
        if (available_for_group_id) params.available_for_group_id = available_for_group_id
        if (user_ids && user_ids.length > 0) {
          // Handle array parameters - adjust based on your API expectations
          user_ids.forEach((id, index) => {
            params[`user_ids[${index}]`] = id
          })
        }
        return {
          url: `/people`,
          params,
        }
      },
    }),

    getPersonById: builder.query<ApiResponse<{ person: Person; navigation: any }>, GetPersonByIdParams>({
      query: ({ id, filters }) => {
        const params: any = {}

        // Add filters to the query if they exist
        if (filters) {
          if (filters.search) params.search = filters.search
          if (filters.stage_id) params.stage_id = filters.stage_id
          if (filters.team_id) params.team_id = filters.team_id
          if (filters.assigned_pond_id) params.assigned_pond_id = filters.assigned_pond_id
          if (filters.available_for_group_id) params.available_for_group_id = filters.available_for_group_id
          if (filters.deal_type_id) params.deal_type_id = filters.deal_type_id
          if (filters.user_ids && filters.user_ids.length > 0) {
            filters.user_ids.forEach((userId, index) => {
              params[`user_ids[${index}]`] = userId
            })
          }
        }

        return {
          url: `/people/${id}`,
          params,
        }
      },
      providesTags: (_result, _error, { id }) => [
        { type: "Person", id },
        { type: "PersonEmail", id },
        { type: "PersonPhone", id },
        { type: "PersonAddress", id },
        { type: "PersonTag", id },
        { type: "PersonCollaborator", id },
      ],
    }),

    createPerson: builder.mutation<ApiResponse<Person>, CreatePersonRequest>({
      query: (person) => ({
        url: "/people",
        method: "POST",
        body: person,
      }),
      invalidatesTags: ["Person"],
    }),

    updatePerson: builder.mutation<ApiResponse<Person>, UpdatePersonRequest>({
      query: (person) => ({
        url: `/people/${person.id}`,
        method: "POST",
        body: updatePersonFormData(person),
        prepareHeaders: (headers: Headers) => {
          headers.delete("content-type")
          return headers
        },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Person", id }, "Person"],
    }),
    distributePersonToGroup: builder.mutation<ApiResponse<Person>, DistributeToGroupParams>({
      query: ({ personId, groupId }) => ({
        url: `/people/${personId}/distribute/${groupId}`,
        method: "POST",
        body: { personId, groupId },
      }),
      
    }),

    deletePerson: builder.mutation<ApiResponse<Person>, number>({
      query: (id) => ({
        url: `/people/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Person"],
    }),

    bulkDeletePeople: builder.mutation<ApiResponse<Person>, BulkActionParams>({
      query: ({ ids, exceptionIds, isAllSelected, filters }) => ({
        url: `/people/bulk-delete`,
        method: "DELETE",
        body: {
          ids,
          exception_ids: exceptionIds,
          is_all_selected: isAllSelected,
          // Include filters in bulk delete
          ...(filters && {
            search: filters.search,
            stage_id: filters.stage_id,
            team_id: filters.team_id,
            user_ids: filters.user_ids,
            deal_type_id: filters.deal_type_id,
          }),
        },
      }),
      invalidatesTags: ["Person"],
    }),

    downloadTemplate: builder.query<Blob, void>({
      query: () => ({
        url: `/people/download-template`,
        method: "GET",
        responseHandler: (response: Response) => response.blob(),
      }),
    }),

    importUsers: builder.mutation<ApiResponse<ImportResponseData>, FormData>({
      query: (formData) => ({
        url: `/people/import`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Person"],
    }),

    bulkExportPeople: builder.mutation<Blob, BulkActionParams>({
      query: ({ ids, exceptionIds, isAllSelected, filters }) => ({
        url: `/people/bulk-export`,
        method: "POST",
        body: {
          ids,
          exception_ids: exceptionIds,
          is_all_selected: isAllSelected,
          // Include filters in bulk export
          ...(filters && {
            search: filters.search,
            stage_id: filters.stage_id,
            team_id: filters.team_id,
            user_ids: filters.user_ids,
            deal_type_id: filters.deal_type_id,
          }),
        },
        responseHandler: (response: Response) => response.blob(),
      }),
    }),

    // Campaign endpoints
    getEmailAccounts: builder.query<ApiResponse<EmailAccount[]>, void>({
      query: () => `/email-accounts`,
      providesTags: ["EmailAccount"],
    }),

    createCampaign: builder.mutation<ApiResponse<any>, CampaignData>({
      query: (campaignData) => ({
        url: `/campaigns`,
        method: "POST",
        body: campaignData,
      }),
      invalidatesTags: ["Campaign"],
    }),

    sendEmailCampaign: builder.mutation<ApiResponse<any>, CampaignData>({
      query: (campaignData) => ({
        url: `/campaigns`,
        method: "POST",
        body: campaignData,
      }),
      invalidatesTags: ["Campaign"],
    }),

    // Email endpoints
    addPersonEmail: builder.mutation<any, { personId: number; data: any }>({
      query: ({ personId, data }) => ({
        url: `/people/${personId}/emails`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonEmail", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    updatePersonEmail: builder.mutation<any, { personId: number; emailId: number; data: any }>({
      query: ({ personId, emailId, data }) => ({
        url: `/people/${personId}/emails/${emailId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonEmail", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    deletePersonEmail: builder.mutation<any, { personId: number; emailId: number }>({
      query: ({ personId, emailId }) => ({
        url: `/people/${personId}/emails/${emailId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonEmail", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    // Phone endpoints
    addPersonPhone: builder.mutation<any, { personId: number; data: any }>({
      query: ({ personId, data }) => ({
        url: `/people/${personId}/phones`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonPhone", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    updatePersonPhone: builder.mutation<any, { personId: number; phoneId: number; data: any }>({
      query: ({ personId, phoneId, data }) => ({
        url: `/people/${personId}/phones/${phoneId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonPhone", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    deletePersonPhone: builder.mutation<any, { personId: number; phoneId: number }>({
      query: ({ personId, phoneId }) => ({
        url: `/people/${personId}/phones/${phoneId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonPhone", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    // Address endpoints
    addPersonAddress: builder.mutation<any, { personId: number; data: any }>({
      query: ({ personId, data }) => ({
        url: `/people/${personId}/addresses`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonAddress", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    updatePersonAddress: builder.mutation<any, { personId: number; addressId: number; data: any }>({
      query: ({ personId, addressId, data }) => ({
        url: `/people/${personId}/addresses/${addressId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonAddress", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    deletePersonAddress: builder.mutation<any, { personId: number; addressId: number }>({
      query: ({ personId, addressId }) => ({
        url: `/people/${personId}/addresses/${addressId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonAddress", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    // Tag endpoints
    addPersonTag: builder.mutation<any, { personId: number; data: any }>({
      query: ({ personId, data }) => ({
        url: `/people/${personId}/tags`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonTag", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    updatePersonTag: builder.mutation<any, { personId: number; tagId: number; data: any }>({
      query: ({ personId, tagId, data }) => ({
        url: `/people/${personId}/tags/${tagId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonTag", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    deletePersonTag: builder.mutation<any, { personId: number; tagId: number }>({
      query: ({ personId, tagId }) => ({
        url: `/people/${personId}/tags/${tagId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonTag", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    // Collaborator endpoints
    addPersonCollaborator: builder.mutation<any, { personId: number; userId: number }>({
      query: ({ personId, userId }) => ({
        url: `/people/${personId}/collaborators/${userId}`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonCollaborator", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    updatePersonCollaborator: builder.mutation<any, { personId: number; collaboratorId: number; data: any }>({
      query: ({ personId, collaboratorId, data }) => ({
        url: `/people/${personId}/collaborators/${collaboratorId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonCollaborator", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    deletePersonCollaborator: builder.mutation<any, { personId: number; collaboratorId: number }>({
      query: ({ personId, collaboratorId }) => ({
        url: `/people/${personId}/collaborators/${collaboratorId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonCollaborator", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    getStages: builder.query<ApiResponse<Array<{ id: number; name: string; description: string }>>, void>({
      query: () => `/people/stages`,
    }),

    getPersonFiles: builder.query<
      ApiResponse<
        Array<{
          id: number
          name: string
          description: string | null
          size: number
          type: string
          path: string
        }>
      >,
      number
    >({
      query: (personId) => `/people/${personId}/files`,
      providesTags: (_result, _error, personId) => [{ type: "PersonFile", id: personId }],
    }),

    addPersonFile: builder.mutation<any, { personId: number; formData: FormData }>({
      query: ({ personId, formData }) => ({
        url: `/people/${personId}/files`,
        method: "POST",
        body: formData,
        prepareHeaders: (headers: Headers) => {
          headers.delete("content-type")
          return headers
        },
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonFile", id: personId },
        { type: "Person", id: personId },
      ],
    }),

    deletePersonFile: builder.mutation<any, { personId: number; fileId: number }>({
      query: ({ personId, fileId }) => ({
        url: `/people/${personId}/files/${fileId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "PersonFile", id: personId },
        { type: "Person", id: personId },
      ],
    }),
    getPersonEvents: builder.query<PaginatedResponse<PersonEvent>, GetEventsParams>({
      query: ({ person_id, page = 1, per_page = 15, search, type, source, date_from, date_to }) => {
        const params: any = { page, per_page }
        if (person_id) params.person_id = person_id
        if (search) params.search = search
        if (type) params.type = type
        if (source) params.source = source
        if (date_from) params.date_from = date_from
        if (date_to) params.date_to = date_to

        return {
          url: `/events`,
          params,
        }
      },
      providesTags: (_result, _error, { person_id }) => [{ type: "PersonEvent", id: person_id || "LIST" }],
    }),

    claimPerson: builder.mutation<any, { personId: number }>({
      query: ({ personId }) => ({
        url: `/people/${personId}/claim=1`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { personId }) => [
        { type: "Person", id: personId },
      ],
    }),
  }),
})

export const {
  useGetPeopleQuery,
  useGetPersonByIdQuery,
  useCreatePersonMutation,
  useUpdatePersonMutation,
  useDeletePersonMutation,
  useBulkDeletePeopleMutation,
  useLazyDownloadTemplateQuery,
  useImportUsersMutation,
  useBulkExportPeopleMutation,
  useDistributePersonToGroupMutation,
  // Campaign exports
  useSendEmailCampaignMutation,
  // Person details management exports
  useAddPersonEmailMutation,
  useUpdatePersonEmailMutation,
  useDeletePersonEmailMutation,
  useAddPersonPhoneMutation,
  useUpdatePersonPhoneMutation,
  useDeletePersonPhoneMutation,
  useAddPersonAddressMutation,
  useUpdatePersonAddressMutation,
  useDeletePersonAddressMutation,
  useAddPersonTagMutation,
  useUpdatePersonTagMutation,
  useDeletePersonTagMutation,
  useAddPersonCollaboratorMutation,
  useUpdatePersonCollaboratorMutation,
  useDeletePersonCollaboratorMutation,
  useGetStagesQuery,
  useGetPersonFilesQuery,
  useAddPersonFileMutation,
  useDeletePersonFileMutation,
  useGetPersonEventsQuery,
  useClaimPersonMutation,
} = peopleApi
