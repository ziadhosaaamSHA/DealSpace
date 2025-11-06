"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { X, Edit } from "lucide-react"
import { Modal } from "../../../components/modal"
import { ASSETS_URL, getInitials } from "../../../utils/helpers"
import { useGetStagesQuery } from "../../stages/stagesApi"
import { useGetUsersQuery } from "../../users/usersApi"
import { useGetGroupsQuery } from "../../groups/groupsApi"
import { useGetPondsQuery } from "../../ponds/pondsApi"
import type { UpdatePersonRequest, Person } from "../../../types/people"
import { Pond } from "../../../types/ponds"

// Define types for our data
interface EmailData {
  id: number
  value: string
  type: string
  is_primary: boolean
}

interface PhoneData {
  id: number
  value: string
  type: string
  is_primary: boolean
}

interface AddressData {
  id: number
  street_address: string
  city: string
  state: string
  postal_code: string
  country: string
  type: string
  is_primary: boolean
}

interface TagData {
  id: number
  name: string
  color: string
  description: string
}

// Email dialog component
export const EmailDialog = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<EmailData, "id">) => void
  initialData: EmailData | null
}) => {
  const [email, setEmail] = useState(initialData?.value || "")
  const [type, setType] = useState(initialData?.type || "work")
  const [isPrimary, setIsPrimary] = useState(initialData?.is_primary || false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setEmail(initialData?.value || "")
      setType(initialData?.type || "work")
      setIsPrimary(initialData?.is_primary || false)
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ value: email, type, is_primary: isPrimary })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{initialData ? "Edit Email" : "Add Email"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isPrimary" className="text-sm text-gray-700">
              Set as primary email
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {initialData ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Phone dialog component
export const PhoneDialog = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<PhoneData, "id">) => void
  initialData: PhoneData | null
}) => {
  const [phone, setPhone] = useState(initialData?.value || "")
  const [type, setType] = useState(initialData?.type || "mobile")
  const [isPrimary, setIsPrimary] = useState(initialData?.is_primary || false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setPhone(initialData?.value || "")
      setType(initialData?.type || "mobile")
      setIsPrimary(initialData?.is_primary || false)
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ value: phone, type, is_primary: isPrimary })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{initialData ? "Edit Phone" : "Add Phone"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="mobile">Mobile</option>
              <option value="work">Work</option>
              <option value="home">Home</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isPrimary" className="text-sm text-gray-700">
              Set as primary phone
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {initialData ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Address dialog component
export const AddressDialog = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<AddressData, "id">) => void
  initialData: AddressData | null
}) => {
  const [streetAddress, setStreetAddress] = useState(initialData?.street_address || "")
  const [city, setCity] = useState(initialData?.city || "")
  const [state, setState] = useState(initialData?.state || "")
  const [postalCode, setPostalCode] = useState(initialData?.postal_code || "")
  const [country, setCountry] = useState(initialData?.country || "USA")
  const [type, setType] = useState(initialData?.type || "home")
  const [isPrimary, setIsPrimary] = useState(initialData?.is_primary || false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setStreetAddress(initialData?.street_address || "")
      setCity(initialData?.city || "")
      setState(initialData?.state || "")
      setPostalCode(initialData?.postal_code || "")
      setCountry(initialData?.country || "USA")
      setType(initialData?.type || "home")
      setIsPrimary(initialData?.is_primary || false)
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      street_address: streetAddress,
      city,
      state,
      postal_code: postalCode,
      country,
      type,
      is_primary: isPrimary,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{initialData ? "Edit Address" : "Add Address"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">
              Street Address
            </label>
            <input
              id="streetAddress"
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                Postal Code
              </label>
              <input
                id="postalCode"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Postal Code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="home">Home</option>
              <option value="work">Work</option>
              <option value="mailing">Mailing</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isPrimary" className="text-sm text-gray-700">
              Set as primary address
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {initialData ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Tag dialog component
export const TagDialog = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<TagData, "id">) => void
  initialData: TagData | null
}) => {
  const [name, setName] = useState(initialData?.name || "")
  const [color, setColor] = useState(initialData?.color || "#FF0000")
  const [description, setDescription] = useState(initialData?.description || "")
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "")
      setColor(initialData?.color || "#FF0000")
      setDescription(initialData?.description || "")
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, color, description })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{initialData ? "Edit Tag" : "Add Tag"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Tag Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tag name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="color" className="block text-sm font-medium text-gray-700">
              Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-8 p-1"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#FF0000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tag description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {initialData ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Person Details dialog component
export const PersonDetailsDialog = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Partial<UpdatePersonRequest>) => void
  initialData: Person | null
}) => {
  const [name, setName] = useState(initialData?.name || "")
  const [stageId, setStageId] = useState(initialData?.stage_id || "")
  const [source, setSource] = useState(initialData?.source || "")
  const [assignedUserId, setAssignedUserId] = useState(initialData?.assigned_user?.id || "")
  const [assignedLenderId, setAssignedLenderId] = useState(initialData?.assigned_lender?.id || "")
  const [assignedPondId, setAssignedPondId] = useState(initialData?.assigned_pond?.id || "")
  const [assignedGroupId, setAssignedGroupId] = useState(initialData?.available_for_group_id || "")
  const [price, setPrice] = useState(initialData?.price?.toString() || "0")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const [agentSearchTerm, setAgentSearchTerm] = useState("")
  const [showAgentSearch, setShowAgentSearch] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<{ id: number; name: string; email: string } | null>(null)
  const [selectedPond, setSelectedPond] = useState<{ user_id: number; name: string } | null>(null)

  const [lenderSearchTerm, setLenderSearchTerm] = useState("")
  const [showLenderSearch, setShowLenderSearch] = useState(false)
  const [selectedLender, setSelectedLender] = useState<{ id: number; name: string; email: string } | null>(null)

  const [groupSearchTerm, setGroupSearchTerm] = useState("")
  const [showGroupSearch, setShowGroupSearch] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<{ id: number; name: string } | null>(null)

  const { data: stagesData, isLoading: isLoadingStages } = useGetStagesQuery()
  const { data: pondsData, isLoading: isLoadingPonds } = useGetPondsQuery(
    {
      page: 1,
      per_page: 50,
    }
    )
  const { data: agentsData, isLoading: isLoadingAgents } = useGetUsersQuery(
    {
      role: 2,
      search: agentSearchTerm,
      page: 1,
      per_page: 50,
    },
    { skip: !showAgentSearch },
  )
  const { data: lendersData, isLoading: isLoadingLenders } = useGetUsersQuery(
    {
      role: 3,
      search: lenderSearchTerm,
      page: 1,
      per_page: 50,
    },
    { skip: !showLenderSearch },
  )
  const { data: groupsData, isLoading: isLoadingGroups } = useGetGroupsQuery({
    page: 1,
    per_page: 50,
    search: groupSearchTerm,
  })

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || "")
      setStageId(initialData.stage_id || "")
      setSource(initialData.source || "")
      setAssignedUserId(initialData.assigned_user?.id || "")
      setAssignedLenderId(initialData.assigned_lender?.id || "")
      setAssignedPondId(initialData.assigned_pond?.id || "")
      setAssignedGroupId(initialData.available_for_group_id || "")
      setSelectedPond(initialData.assigned_pond || null)
      setPrice(initialData.price?.toString() || "0")
      setPhotoPreview(null)
      setPhoto(null)

      if (initialData.assigned_user) {
        setSelectedAgent(initialData.assigned_user)
        setSelectedPond(null)
      } else {
        setSelectedAgent(null)
      }

      if (initialData.assigned_lender) {
        setSelectedLender(initialData.assigned_lender)
      } else {
        setSelectedLender(null)
      }

      if (initialData.assigned_pond) {
        setSelectedPond(initialData.assigned_pond)
      } else {
        setSelectedPond(null)
      }

      if (initialData.assigned_user) {
        setSelectedGroup(initialData.assigned_group ?? null)
      } else {
        setSelectedGroup(null)
      }

      setAgentSearchTerm("")
      setShowAgentSearch(false)
      setLenderSearchTerm("")
      setShowLenderSearch(false)
      setGroupSearchTerm("")
      setShowGroupSearch(false)
    }
  }, [isOpen, initialData])
    const handlePondSelect = (pond: Pond) => {
    setSelectedPond(pond)
    setAssignedPondId(pond.id)
    setAssignedUserId(pond.user_id) // Assign to pond owner
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAgentSearch && !(event.target as Element).closest(".agent-search-container")) {
        setShowAgentSearch(false)
      }
      if (showLenderSearch && !(event.target as Element).closest(".lender-search-container")) {
        setShowLenderSearch(false)
      }
      if (showGroupSearch && !(event.target as Element).closest(".group-search-container")) {
        setShowGroupSearch(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showAgentSearch, showLenderSearch, showGroupSearch])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhoto(file)

      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoPreview(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSubmit({
      name,
      stage_id: Number(stageId),
      assigned_user_id: Number(assignedUserId),
      assigned_pond_id: Number(assignedPondId),
      assigned_lender_id: Number(assignedLenderId),
      available_for_group_id: Number(assignedGroupId),
      price: price,
      picture: photo,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="bg-white shadow-lg w-full max-w-lg p-6">
      <div ref={dialogRef} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Edit Person Details</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="photo"
              className="flex flex-col items-center justify-center gap-2 text-sm font-medium text-gray-700"
            >
              <div className="flex items-center space-x-4 relative">
                <span className="absolute top-0 right-0 p-2 bg-gray-200 rounded-full shadow-sm cursor-pointer hover:bg-gray-100">
                  <Edit size={20} />
                </span>
                {photoPreview ? (
                  <div className="h-[100px] w-[100px] rounded-full overflow-hidden bg-gray-300">
                    <img
                      src={photoPreview || "/placeholder.svg"}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : initialData?.picture ? (
                  <div className="h-[100px] w-[100px] rounded-full overflow-hidden bg-gray-300">
                    <img
                      src={ASSETS_URL + initialData.picture || "/placeholder.svg"}
                      alt={initialData.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-[100px] w-[100px] bg-gray-300 text-gray-600 text-xl rounded-full flex items-center justify-center">
                    <span>{getInitials(name)}</span>
                  </div>
                )}
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent d-none"
                  style={{ display: "none" }}
                />
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="stage" className="block text-sm font-medium text-gray-700">
              Stage
            </label>
            {isLoadingStages ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500">
                Loading stages...
              </div>
            ) : (
              <select
                id="stage"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Stage</option>
                {stagesData?.data?.map((stage: any) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="source" className="block text-sm font-medium text-gray-700">
              Source
            </label>
            <input
              id="source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Source"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">
              Agent
            </label>
            <div className="agent-search-container">
              {!selectedAgent ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search and select agent..."
                    value={agentSearchTerm}
                    onChange={(e) => {
                      setAgentSearchTerm(e.target.value)
                      setShowAgentSearch(true)
                    }}
                    onFocus={() => setShowAgentSearch(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {showAgentSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <h4 className="w-full h-10 border-b border-[#f1f4f8] bg-[#f7f9fa] font-bold text-[11px] text-[#6d8291] px-2.5 leading-none uppercase tracking-wider text-left flex items-center">
                        AGENTS
                      </h4>
                      {isLoadingAgents ? (
                        <div className="p-3 text-center text-gray-500">Loading...</div>
                      ) : agentsData?.data?.items?.length ? (
                        agentsData.data.items.map((agent: any) => (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => {
                              setSelectedAgent({ id: agent.id, name: agent.name, email: agent.email })
                              setAssignedUserId(agent.id)
                              setAssignedPondId("")
                              setSelectedPond(null)
                              setShowAgentSearch(false)
                              setAgentSearchTerm("")
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            <div className="font-medium text-gray-900">{agent.name}</div>
                            <div className="text-sm text-gray-500">{agent.email}</div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500">No agents found</div>
                      )}

                      <h4 className="w-full h-10 border-b border-[#f1f4f8] bg-[#f7f9fa] font-bold text-[11px] text-[#6d8291] px-2.5 leading-none uppercase tracking-wider text-left flex items-center">
                        PONDS
                      </h4>
                      {isLoadingPonds ? (
                        <div className="p-3 text-center text-gray-500">Loading...</div>
                      ) : (
                        (() => {
                          const filteredPonds =
                            (pondsData?.data?.items as Pond[] | undefined)?.filter((pond) =>
                              pond.name.toLowerCase().includes(agentSearchTerm.toLowerCase()),
                            ) ?? []
                          return filteredPonds.length ? (
                            filteredPonds.map((pond) => (
                              <button
                                key={pond.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAgent({
                                    id: pond.user_id,
                                    name: pond.user?.name || `User #${pond.user_id}`,
                                    email: pond.user?.email || "",
                                  })
                                  setAssignedUserId(pond.user_id)
                                  setAssignedPondId(pond.id)
                                  setSelectedPond(pond)
                                  setShowAgentSearch(false)
                                  setAgentSearchTerm("")
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                              >
                                <div className="font-medium text-gray-900">{pond.name}</div>
                                {pond.user?.name ? (
                                  <div className="text-sm text-gray-500">Owner: {pond.user.name}</div>
                                ) : null}
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-gray-500">No ponds found</div>
                          )
                        })()
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedPond ? selectedPond.name : selectedAgent.name}
                      {selectedPond && <span className="text-xs text-gray-500 ml-2">(Pond)</span>}
                    </div>
                    {selectedAgent.email && <div className="text-sm text-gray-500">{selectedAgent.email}</div>}
                    {selectedPond && selectedPond.name && (
                      <div className="text-sm text-gray-500">Owner: {selectedPond.name}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAgent(null)
                      setSelectedPond(null)
                      setAssignedUserId("")
                      setAssignedPondId("")
                    }}
                    className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="assignedLender" className="block text-sm font-medium text-gray-700">
              Lender
            </label>
            <div className="lender-search-container">
              {!selectedLender ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search and select lender..."
                    value={lenderSearchTerm}
                    onChange={(e) => {
                      setLenderSearchTerm(e.target.value)
                      setShowLenderSearch(true)
                    }}
                    onFocus={() => setShowLenderSearch(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {showLenderSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {isLoadingLenders ? (
                        <div className="p-3 text-center text-gray-500">Loading...</div>
                      ) : lendersData?.data?.items?.length ? (
                        lendersData.data.items.map((lender: any) => (
                          <button
                            key={lender.id}
                            type="button"
                            onClick={() => {
                              setSelectedLender({ id: lender.id, name: lender.name, email: lender.email })
                              setAssignedLenderId(lender.id)
                              setShowLenderSearch(false)
                              setLenderSearchTerm("")
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            <div className="font-medium text-gray-900">{lender.name}</div>
                            <div className="text-sm text-gray-500">{lender.email}</div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500">No lenders found</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{selectedLender.name}</div>
                    {selectedLender.email && <div className="text-sm text-gray-500">{selectedLender.email}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLender(null)
                      setAssignedLenderId("")
                    }}
                    className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="assignedGroup" className="block text-sm font-medium text-gray-700">
              Group
            </label>
            <div className="group-search-container">
              {!selectedGroup ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search and select group..."
                    value={groupSearchTerm}
                    onChange={(e) => {
                      setGroupSearchTerm(e.target.value)
                      setShowGroupSearch(true)
                    }}
                    onFocus={() => setShowGroupSearch(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {showGroupSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {isLoadingGroups ? (
                        <div className="p-3 text-center text-gray-500">Loading...</div>
                      ) : groupsData?.data?.items?.length ? (
                        groupsData.data.items.map((group: any) => (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              setSelectedGroup({ id: group.id, name: group.name })
                              setAssignedGroupId(group.id)
                              setShowGroupSearch(false)
                              setGroupSearchTerm("")
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            <div className="font-medium text-gray-900">{group.name}</div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500">No groups found</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{selectedGroup.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroup(null)
                      setAssignedGroupId("")
                    }}
                    className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">$</span>
              <input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
