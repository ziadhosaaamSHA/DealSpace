"use client"

import { useState, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useNotifications } from "../../hooks/useNotifications"
import { formatDistanceToNow } from "date-fns"
import { DropdownItem } from "../../components/ui/dropdown/DropdownItem"
import { Dropdown } from "../../components/ui/dropdown/Dropdown"
import { ASSETS_URL } from "../../utils/helpers"
import { toast } from "react-toastify"
import { ClaimLeadModal } from "../people/components/ClaimLeadModal"
import { useGetPersonByIdQuery } from "../people/peopleApi"

export default function NotificationDropdown() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)

  // Get person data if claim modal is open
  const { data: personData } = useGetPersonByIdQuery(
    { id: selectedPersonId || 0 },
    { skip: !selectedPersonId }
  )

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    // Check if it's a claim notification
    if (notification.action?.includes('?claim=1')) {
      // Extract person ID from URL
      const personId = Number(notification.action.split('/')[2]?.split('?')[0])
      if (personId) {
        setSelectedPersonId(personId)
        setIsClaimModalOpen(true)
        setIsOpen(false) // Close dropdown
        return
      }
    }
    
    // For other notifications, use react-router navigation
    if (notification.action) {
      navigate(notification.action)
    }
  }

  // Stabilize the callback function to prevent re-subscriptions
  const handleNewNotification = useCallback((newNotification: any) => {
    // Check if toast already exists for this notification
    const toastId = `notification-${newNotification.id}`
    if (toast.isActive(toastId)) return

    toast.info(
      <div className="cursor-pointer" onClick={() => handleNotificationClick(newNotification)}>
        <div className="font-medium">{newNotification.title}</div>
        <div className="text-sm">{newNotification.message}</div>
      </div>,
      {
        toastId,
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      }
    )
  }, [])

  const { notifications, unreadCount, hasNewNotification, isLoading, markAllAsRead, clearNewNotificationFlag } =
    useNotifications({
      enabled: true,
      callback: handleNewNotification,
    })

  const toggleDropdown = useCallback(() => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      clearNewNotificationFlag()
    }
  }, [isOpen, clearNewNotificationFlag])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead()
  }, [markAllAsRead])

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return "Unknown time"
    }
  }

  const getNotificationIcon = (notification: any) => {
    if (notification.image) {
      return (
        <img
          width={40}
          height={40}
          src={ASSETS_URL + "/storage/" + notification.image || "/placeholder.svg"}
          alt="Notification"
          className="w-full overflow-hidden rounded-full"
        />
      )
    }

    // Default notification icon
    return (
      <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 2C6.686 2 4 4.686 4 8v4.586L2.293 14.293A1 1 0 0 0 3 16h14a1 1 0 0 0 .707-1.707L16 12.586V8c0-3.314-2.686-6-6-6zM8 18a2 2 0 1 0 4 0H8z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-white transition-colors border-2 border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {(hasNewNotification || unreadCount > 0) && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-orange-500 text-white rounded-full">{unreadCount}</span>
            )}
          </h5>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={toggleDropdown}
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg
                className="fill-current"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <li className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </li>
          ) : notifications.length === 0 ? (
            <li className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              No notifications yet
            </li>
          ) : (
            notifications.slice(0, 8).map((notification) => (
              <li key={notification.id}>
                <div onClick={() => handleNotificationClick(notification)}>
                  <DropdownItem
                    onItemClick={() => {}}
                    className={`flex gap-3 mb-2 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${
                      !notification.read_at ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                  >
                    <span className="relative block w-full h-10 rounded-full z-1 max-w-10">
                      {getNotificationIcon(notification)}
                      {!notification.read_at && (
                        <span className="absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white bg-blue-500 dark:border-gray-900"></span>
                      )}
                    </span>

                    <span className="block flex-1">
                      <span className="mb-1.5 block text-theme-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-800 dark:text-white/90">{notification.title}</span>
                        <span className="block mt-1">{notification.message}</span>
                      </span>

                      <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                        <span>{formatTimeAgo(notification.created_at)}</span>
                      </span>
                    </span>
                  </DropdownItem>
                </div>
              </li>
            ))
          )}
        </ul>

        <Link
          to="/notifications"
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          onClick={closeDropdown}
        >
          View All Notifications
        </Link>
      </Dropdown>

      {/* Claim Modal */}
      <ClaimLeadModal
        isOpen={isClaimModalOpen}
        onClose={() => {
          setIsClaimModalOpen(false)
          setSelectedPersonId(null)
        }}
        person={personData?.data?.person || null}
      />
    </div>
  )
}
