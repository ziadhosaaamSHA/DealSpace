import { useState, useEffect } from 'react'
import { useGetTenantStatusQuery, useGetPlansQuery, useSubscribeMutation, useGetPortalSessionMutation, useCancelSubscriptionMutation, useResumeSubscriptionMutation } from './subscriptionApi'
import { toast } from 'react-toastify'
import { CheckCircle, XCircle, AlertCircle, CreditCard, Users, Crown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import AdminLayout from '../../layout/AdminLayout'

export default function SubscriptionManagement() {
  const { role } = useAuth()
  const { data: tenantStatus, isLoading: isLoadingStatus, refetch } = useGetTenantStatusQuery()
  const { data: plans, isLoading: isLoadingPlans } = useGetPlansQuery()
  const [subscribe, { isLoading: isSubscribing }] = useSubscribeMutation()
  const [getPortalSession] = useGetPortalSessionMutation()
  const [cancelSubscription] = useCancelSubscriptionMutation()
  const [resumeSubscription] = useResumeSubscriptionMutation()

  const canManage = tenantStatus?.data?.can_manage ?? false
  const hasSubscription = tenantStatus?.data?.subscribed ?? false
  const subscription = tenantStatus?.data?.subscription
  const subscriptionHolder = tenantStatus?.data?.owner

  const handleSubscribe = async (planKey: string) => {
    console.log('Subscribing to plan:', planKey)
    
    try {
      const result = await subscribe({ plan: planKey }).unwrap()

      console.log('Subscribe result:', result)

      if (!result.success) {
        toast.error('Subscription request failed')
        return
      }

      // Check for checkout URL in data object
      if (result.action === 'checkout' && result.data?.checkout_url) {
        console.log('Redirecting to Stripe Checkout:', result.data.checkout_url)
        // Use window.location.assign for better compatibility
        window.location.assign(result.data.checkout_url)
        return
      }

      // Handle plan changes
      if (result.action === 'upgrade' || result.action === 'downgrade') {
        toast.success(result.message || 'Subscription updated successfully')
        refetch()
        return
      }

      // Fallback
      toast.success(result.message || 'Processing subscription...')
      refetch()
    } catch (error: any) {
      console.error('Subscribe error:', error)
      const errorMessage = error?.data?.message || error?.message || 'Failed to process subscription'
      toast.error(errorMessage)
    }
  }

  const handleOpenUsage = async () => {
    const managementUrl = `/admin/subscriptions/usage/`
    window.location.href = managementUrl
    window.open(managementUrl, '_blank')
  }
  if (isLoadingStatus || isLoadingPlans) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Subscription Plans</h1>

        {/* Permission Alert */}
        {!canManage && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800">
                Only owners and admins can manage subscriptions. Contact your workspace owner to make changes.
              </p>
            </div>
          </div>
        )}

        {/* Current Subscription Status */}
        {hasSubscription && subscription && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Current Subscription</h2>
              {subscription.status === 'active' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Active
                </span>
              )}
              {subscription.status === 'canceled' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <XCircle className="w-4 h-4 mr-1" />
                  Canceled
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="text-lg font-medium text-gray-900 capitalize">{subscription.plan || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Subscription Holder</p>
                <div className="flex items-center mt-1">
                  <Users className="w-4 h-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{subscriptionHolder?.name}</p>
                    <p className="text-xs text-gray-500">{subscriptionHolder?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {subscriptionHolder?.role}
                    </span>
                  </div>
                </div>
              </div>

              {subscription.on_trial && (
                <div>
                  <p className="text-sm text-gray-600">Trial Status</p>
                  <p className="text-sm text-blue-600 font-medium">On Trial</p>
                </div>
              )}

              {subscription.ends_at && (
                <div>
                  <p className="text-sm text-gray-600">
                    {subscription.canceled ? 'Ends At' : 'Renews At'}
                  </p>
                  <p className="text-sm text-gray-900">
                    {new Date(subscription.ends_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {canManage && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleOpenUsage}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Plan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {hasSubscription ? 'Change Plan' : 'Choose a Plan'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans && Object.entries(plans.data)
              .filter(([key]) => key !== 'free') // Filter out free plan from subscription options
              .map(([key, plan]: [string, any]) => (
              <div
                key={key}
                className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                  subscription?.plan === key ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 capitalize">{plan.name || key}</h3>
                  {subscription?.plan === key && (
                    <Crown className="w-6 h-6 text-blue-600" />
                  )}
                </div>

                <p className="text-3xl font-bold text-gray-900 mb-6">
                  ${plan.price}
                  <span className="text-base font-normal text-gray-600">/month</span>
                </p>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {canManage && subscription?.plan !== key && (
                  <button
                    onClick={() => handleSubscribe(key)}
                    disabled={isSubscribing}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubscribing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      hasSubscription ? 'Switch Plan' : 'Subscribe'
                    )}
                  </button>
                )}

                {!canManage && (
                  <div className="text-center text-sm text-gray-500 py-2">
                    Contact admin to change plan
                  </div>
                )}

                {subscription?.plan === key && (
                  <div className="text-center text-sm font-medium text-blue-600 py-2">
                    Current Plan
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}