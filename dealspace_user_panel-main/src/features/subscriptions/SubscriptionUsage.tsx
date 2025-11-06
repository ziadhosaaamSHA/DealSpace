import { useGetTenantStatusQuery, useCancelSubscriptionMutation, useCancelNowSubscriptionMutation, useResumeSubscriptionMutation, useGetUsageQuery, useGetPortalSessionMutation, useGetInvoicesQuery, useGetPlansQuery } from "./subscriptionApi"
import { toast } from "react-toastify"
import { useState } from "react"
import { CreditCard, Download, Loader2, AlertCircle, CheckCircle2, XCircle, Calendar, TrendingUp, Package, FileText, ExternalLink, ChevronRight, Info } from "lucide-react"
import AdminLayout from "../../layout/AdminLayout"

export default function SubscriptionUsage() {
  const { data: status, isLoading: statusLoading } = useGetTenantStatusQuery()
  const { data: usage, isLoading: usageLoading } = useGetUsageQuery()
  const { data: plans } = useGetPlansQuery()
  const { data: invoices, isLoading: invoicesLoading } = useGetInvoicesQuery()
  const [cancelSubscription, { isLoading: isCancelling }] = useCancelSubscriptionMutation()
  const [cancelNowSubscription, { isLoading: isCancellingNow }] = useCancelNowSubscriptionMutation()
  const [resumeSubscription, { isLoading: isResuming }] = useResumeSubscriptionMutation()
  const [getPortalSession] = useGetPortalSessionMutation()
  const [portalLoading, setPortalLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const handleCancel = async () => {
    try {
      await cancelSubscription().unwrap()
      toast.success("Subscription will be cancelled at the end of the period.")
      setShowCancelDialog(false)
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to cancel subscription")
    }
  }

  const handleCancelNow = async () => {
    if (!window.confirm("Are you sure you want to cancel immediately? You will lose access right away and won't receive a refund.")) return
    try {
      await cancelNowSubscription().unwrap()
      toast.success("Subscription cancelled immediately.")
      setShowCancelDialog(false)
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to cancel subscription")
    }
  }

  const handleResume = async () => {
    try {
      await resumeSubscription().unwrap()
      toast.success("Subscription resumed successfully.")
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to resume subscription")
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res = await getPortalSession().unwrap()
      window.open(res.data.url, "_blank")
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to open billing portal")
    } finally {
      setPortalLoading(false)
    }
  }

  const handleDownloadInvoice = (invoiceUrl: string) => {
    window.open(invoiceUrl, "_blank")
  }

  if (statusLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        </div>
      </AdminLayout>
    )
  }

  const subscription = status?.data?.subscription
  const currentPlan = subscription?.plan ? plans?.data?.[subscription.plan] : null

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      active: { color: "bg-green-100 text-green-800", icon: CheckCircle2, text: "Active" },
      trialing: { color: "bg-blue-100 text-blue-800", icon: Info, text: "Trial" },
      canceled: { color: "bg-red-100 text-red-800", icon: XCircle, text: "Cancelled" },
      past_due: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle, text: "Past Due" },
      incomplete: { color: "bg-gray-100 text-gray-800", icon: AlertCircle, text: "Incomplete" },
    }
    const badge = badges[status] || badges.active
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {badge.text}
      </span>
    )
  }
  console.log(status);
  console.log(invoices);
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num / 100)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription & Usage</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your subscription, view usage, and access invoices</p>
        </div>

        {/* Subscription Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Current Plan Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
                </div>
                {subscription ? (
                  <>
                    <div className="flex items-center gap-3 mt-3">
                      <h3 className="text-3xl font-bold text-gray-900 capitalize">{subscription.plan || 'Free'}</h3>
                      {getStatusBadge(subscription.status)}
                    </div>
                    {currentPlan && (
                      <p className="text-2xl font-semibold text-blue-600 mt-2">
                        ${currentPlan.price}/month
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-3xl font-bold text-gray-900">Free Plan</h3>
                    <p className="text-sm text-gray-600 mt-2">No active subscription</p>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handlePortal}
                  disabled={portalLoading || !subscription}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {portalLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Billing Portal
                </button>
                {subscription && !subscription.canceled && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Plan
                  </button>
                )}
                {subscription?.canceled && (
                  <button
                    onClick={handleResume}
                    disabled={isResuming}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isResuming ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Resume
                  </button>
                )}
              </div>
            </div>

            {/* Billing Cycle Info */}
            {subscription && (
              <div className="mt-6 pt-6 border-t border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Renews On</p>
                    <p className="text-sm font-medium text-gray-900">
                      {subscription.current_period_end && formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                  {subscription.ends_at && (
                    <div className="col-span-2">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-amber-900">Cancellation Scheduled</p>
                            <p className="text-sm text-amber-700">Ends on {formatDate(subscription.ends_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Subscription Holder</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {status?.data?.owner?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">{status?.data?.owner?.role}</p>
                </div>
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Can Manage</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {status?.data?.can_manage ? 'Yes' : 'No'}
                  </p>
                </div>
                <CheckCircle2 className={`w-8 h-8 ${status?.data?.can_manage ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Usage & Limits</h2>
            </div>
            <span className="text-sm text-gray-500">Plan: {usage?.data?.plan || 'Free'}</span>
          </div>

          {usageLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : usage?.data?.usage && Object.keys(usage.data.usage).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(usage.data.usage).map(([feature, stats]) => {
                const percentage = stats.percentage || 0
                const isNearLimit = percentage >= 80 && !stats.unlimited
                const isOverLimit = percentage >= 100 && !stats.unlimited

                return (
                  <div key={feature} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700 capitalize">
                        {feature.replace(/_/g, ' ')}
                      </h3>
                      {stats.unlimited ? (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                          Unlimited
                        </span>
                      ) : isOverLimit ? (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                          Limit Reached
                        </span>
                      ) : isNearLimit ? (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Near Limit
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {percentage}%
                        </span>
                      )}
                    </div>

                    <div className="mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">{stats.used}</span>
                        <span className="text-sm text-gray-500">
                          / {stats.unlimited ? '∞' : stats.limit}
                        </span>
                      </div>
                    </div>

                    {!stats.unlimited && (
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    )}

                    {!stats.can_use && (
                      <p className="text-xs text-red-600 mt-2 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Limit reached - upgrade to continue
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No usage data available</p>
            </div>
          )}
        </div>

        {/* Plan Features */}
        {currentPlan && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Plan Features</h2>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentPlan.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Billing History</h2>
          </div>

          {invoicesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : invoices?.data && invoices.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.data.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDownloadInvoice(invoice.invoice_pdf)}
                          className="inline-flex items-center text-blue-600 hover:text-blue-900"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No invoices yet</p>
            </div>
          )}
        </div>

        {/* Cancel Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Subscription</h3>
              <p className="text-sm text-gray-600 mb-6">
                Choose how you'd like to cancel your subscription:
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="w-full flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Cancel at period end</p>
                    <p className="text-sm text-gray-600">Keep access until {subscription?.current_period_end && formatDate(subscription.current_period_end)}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                <button
                  onClick={handleCancelNow}
                  disabled={isCancellingNow}
                  className="w-full flex items-center justify-between p-4 border-2 border-red-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-medium text-red-900">Cancel immediately</p>
                    <p className="text-sm text-red-600">Lose access right away, no refund</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-400" />
                </button>
              </div>
              <button
                onClick={() => setShowCancelDialog(false)}
                className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Never mind
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}