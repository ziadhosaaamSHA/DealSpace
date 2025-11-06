import { createApi } from "@reduxjs/toolkit/query/react"
import { customBaseQuery } from "../../app/baseQueryHandler"

interface SubscriptionPlan {
  name: string
  price_id: string
  price: number
  features: string[]
  limits: Record<string, number>
}

interface TenantStatusResponse {
  success: boolean
  data: {
    tenant_id: string
    subscribed: boolean
    owner: {
      id: number
      name: string
      email: string
      role: string
    } | null
    subscription: {
      id: number
      stripe_id: string
      status: string
      plan: string | null
      ends_at: string | null
      on_trial: boolean
      on_grace_period: boolean
      canceled: boolean
      current_period_start?: string
      current_period_end?: string
      cancel_at_period_end?: boolean
    } | null
    can_manage: boolean
  }
}

interface UsageData {
  used: number
  limit: number | null
  unlimited: boolean
  percentage: number
  can_use: boolean
}

interface UsageResponse {
  success: boolean
  data: {
    plan: string
    usage: Record<string, UsageData>
  }
}

interface Invoice {
  id: string
  date: string
  total: string
  status: string
  invoice_pdf: string
}

interface InvoicesResponse {
  success: boolean
  data: Invoice[]
}

interface SubscribeRequest {
  plan: string
}

interface SubscribeResponse {
  success: boolean
  action?: 'checkout' | 'upgrade' | 'downgrade'
  message?: string
  data?: {
    checkout_url?: string
    plan?: string
    charged_immediately?: boolean
    effective_date?: string
  }
  checkout_url?: string
}

export const subscriptionApi = createApi({
  reducerPath: 'subscriptionApi',
  baseQuery: customBaseQuery,
  tagTypes: ['Subscription', 'Usage', 'TenantStatus', 'Invoices'],
  endpoints: (builder) => ({
    // Get available plans
    getPlans: builder.query<{ success: boolean; data: Record<string, SubscriptionPlan> }, void>({
      query: () => '/subscriptions/plans',
      providesTags: ['Subscription'],
    }),

    // Get tenant subscription status (comprehensive)
    getTenantStatus: builder.query<TenantStatusResponse, void>({
      query: () => '/subscriptions/status',
      providesTags: ['TenantStatus', 'Subscription'],
    }),

    // Get usage statistics
    getUsage: builder.query<UsageResponse, void>({
      query: () => '/subscriptions/usage',
      providesTags: ['Usage'],
    }),

    // Subscribe or change plan
    subscribe: builder.mutation<SubscribeResponse, SubscribeRequest>({
      query: (data) => ({
        url: '/subscriptions/subscribe',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subscription', 'TenantStatus', 'Usage'],
    }),

    // Verify checkout session after payment
    verifyCheckoutSession: builder.mutation<any, { session_id: string }>({
      query: (data) => ({
        url: '/subscriptions/verify',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subscription', 'Usage', 'TenantStatus'],
    }),

    // Cancel subscription at end of period
    cancelSubscription: builder.mutation<any, void>({
      query: () => ({
        url: '/subscriptions/cancel',
        method: 'POST',
      }),
      invalidatesTags: ['Subscription', 'TenantStatus'],
    }),

    // Cancel subscription immediately
    cancelNowSubscription: builder.mutation<any, void>({
      query: () => ({
        url: '/subscriptions/cancel-now',
        method: 'POST',
      }),
      invalidatesTags: ['Subscription', 'TenantStatus', 'Usage'],
    }),

    // Resume canceled subscription
    resumeSubscription: builder.mutation<any, void>({
      query: () => ({
        url: '/subscriptions/resume',
        method: 'POST',
      }),
      invalidatesTags: ['Subscription', 'TenantStatus'],
    }),

    // Get billing portal session
    getPortalSession: builder.mutation<{ success: boolean; data: { url: string } }, void>({
      query: () => ({
        url: '/subscriptions/portal',
        method: 'GET',
      }),
    }),

    // Get invoices
    getInvoices: builder.query<InvoicesResponse, void>({
      query: () => '/subscriptions/invoices',
      providesTags: ['Invoices'],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useGetTenantStatusQuery,
  useGetUsageQuery,
  useSubscribeMutation,
  useVerifyCheckoutSessionMutation,
  useCancelSubscriptionMutation,
  useCancelNowSubscriptionMutation,
  useResumeSubscriptionMutation,
  useGetPortalSessionMutation,
  useGetInvoicesQuery,
} = subscriptionApi;