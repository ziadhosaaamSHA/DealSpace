"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Plus } from "lucide-react"
import { useCreateDealMutation, useGetUsersQuery, useGetPeopleQuery } from "./dealsApi"
import type { CreateDealRequest, User, Person } from "../../types/deals"
import FileUpload from "./FileUpload"
import { Modal } from "../../components/modal"
import { toast } from "react-toastify"

interface CreateDealModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  stageId: number
  typeId: number
}

interface SelectedUser {
  id: number
  name: string
  email: string
}

interface SelectedPerson {
  id: number
  name: string
  first_name: string
  last_name: string
}

const initialFormData: CreateDealRequest = {
  name: "",
  stage_id: 0,
  type_id: 0,
  description: "",
  people_ids: [],
  users_ids: [],
  price: 0,
  projected_close_date: "",
  order_weight: 1,
  commission_value: 0,
  agent_commission: 0,
  team_commission: 0,
}

export default function CreateDealModal({ isOpen, onClose, onSuccess, stageId, typeId }: CreateDealModalProps) {
  const [createDeal, { isLoading }] = useCreateDealMutation()
  const [formData, setFormData] = useState<CreateDealRequest>(initialFormData)
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])
  const [selectedPeople, setSelectedPeople] = useState<SelectedPerson[]>([])
  const [attachments, setAttachments] = useState<File[]>([])

  // Search states
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [peopleSearchTerm, setPeopleSearchTerm] = useState("")
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showPeopleSearch, setShowPeopleSearch] = useState(false)

  // API queries
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery(
    { search: userSearchTerm, page: 1, per_page: 100 },
    { skip: !showUserSearch },
  )

  const { data: peopleData, isLoading: isLoadingPeople } = useGetPeopleQuery(
    { search: peopleSearchTerm, page: 1, per_page: 100 },
    { skip: !showPeopleSearch },
  )

  const [errors, setErrors] = useState({
    name: "",
    price: "",
    users: "",
    people: "",
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialFormData,
        stage_id: stageId,
        type_id: typeId,
      })
      setSelectedUsers([])
      setSelectedPeople([])
      setAttachments([])
      setUserSearchTerm("")
      setPeopleSearchTerm("")
      setShowUserSearch(false)
      setShowPeopleSearch(false)
      setErrors({ name: "", price: "", users: "", people: "" })
    }
  }, [isOpen, stageId, typeId])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleUserSelect = (user: User, checked: boolean) => {
    if (checked) {
      const newUser = { id: user.id, name: user.name, email: user.email }
      setSelectedUsers((prev) => [...prev, newUser])
    } else {
      setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id))
    }
  }

  const handlePersonSelect = (person: Person, checked: boolean) => {
    if (checked) {
      const newPerson = {
        id: person.id,
        name: person.name,
        first_name: person.first_name,
        last_name: person.last_name,
      }
      setSelectedPeople((prev) => [...prev, newPerson])
    } else {
      setSelectedPeople((prev) => prev.filter((p) => p.id !== person.id))
    }
  }

  const handleUserRemove = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const handlePersonRemove = (personId: number) => {
    setSelectedPeople((prev) => prev.filter((p) => p.id !== personId))
  }

  const validateForm = (): boolean => {
    let isValid = true
    const newErrors = { name: "", price: "", users: "", people: "" }

    if (!formData.name.trim()) {
      newErrors.name = "Deal name is required"
      isValid = false
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = "Price must be greater than 0"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    try {
      const submitData = {
        ...formData,
        users_ids: selectedUsers.map((u) => u.id),
        people_ids: selectedPeople.map((p) => p.id),
        attachments,
      }

      const response = await createDeal(submitData).unwrap()
      if (response.status) {
        onSuccess()
        toast.success("Deal created successfully!")
        onClose()
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create deal")
      console.error("Failed to create deal:", error)
    }
  }

  // Close search dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserSearch && !(event.target as Element).closest(".user-search-container")) {
        setShowUserSearch(false)
      }
      if (showPeopleSearch && !(event.target as Element).closest(".people-search-container")) {
        setShowPeopleSearch(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showUserSearch, showPeopleSearch])

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Deal</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Deal Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Name*
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price*
                </label>
                <input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange("price", Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.price ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
              </div>

              {/* Projected Close Date */}
              <div>
                <label htmlFor="projected_close_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Projected Close Date
                </label>
                <input
                  id="projected_close_date"
                  type="date"
                  value={formData.projected_close_date}
                  onChange={(e) => handleChange("projected_close_date", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Commission Fields */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="commission_value" className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Value
                  </label>
                  <input
                    id="commission_value"
                    type="number"
                    value={formData.commission_value}
                    onChange={(e) => handleChange("commission_value", Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="agent_commission" className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Commission
                  </label>
                  <input
                    id="agent_commission"
                    type="number"
                    value={formData.agent_commission}
                    onChange={(e) => handleChange("agent_commission", Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="team_commission" className="block text-sm font-medium text-gray-700 mb-1">
                    Team Commission
                  </label>
                  <input
                    id="team_commission"
                    type="number"
                    value={formData.team_commission}
                    onChange={(e) => handleChange("team_commission", Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Users Selection */}
              <div className="user-search-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">Users</label>
                {!showUserSearch ? (
                  <button
                    type="button"
                    onClick={() => setShowUserSearch(true)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Users
                  </button>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isLoadingUsers ? (
                      <div className="text-center py-4 text-gray-500">Loading users...</div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                        {usersData?.data?.items?.map((user: User) => (
                          <div key={user.id} className="flex items-center space-x-2 py-2">
                            <input
                              type="checkbox"
                              checked={selectedUsers.some((u) => u.id === user.id)}
                              onChange={(e) => handleUserSelect(user, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        ))}
                        {usersData?.data?.items?.length === 0 && (
                          <div className="text-center py-4 text-gray-500">No users found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selected Users ({selectedUsers.length})
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUserRemove(user.id)}
                          className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* People Selection */}
              <div className="people-search-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">People</label>
                {!showPeopleSearch ? (
                  <button
                    type="button"
                    onClick={() => setShowPeopleSearch(true)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add People
                  </button>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Search people..."
                      value={peopleSearchTerm}
                      onChange={(e) => setPeopleSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isLoadingPeople ? (
                      <div className="text-center py-4 text-gray-500">Loading people...</div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                        {peopleData?.data?.items?.map((person: Person) => (
                          <div key={person.id} className="flex items-center space-x-2 py-2">
                            <input
                              type="checkbox"
                              checked={selectedPeople.some((p) => p.id === person.id)}
                              onChange={(e) => handlePersonSelect(person, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{person.name}</div>
                              <div className="text-sm text-gray-500">{person.emails?.[0]?.value || "No email"}</div>
                            </div>
                          </div>
                        ))}
                        {peopleData?.data?.items?.length === 0 && (
                          <div className="text-center py-4 text-gray-500">No people found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected People */}
              {selectedPeople.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selected People ({selectedPeople.length})
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedPeople.map((person) => (
                      <div key={person.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                        <div>
                          <div className="font-medium text-gray-900">{person.name}</div>
                          <div className="text-sm text-gray-500">
                            {person.first_name} {person.last_name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePersonRemove(person.id)}
                          className="p-1 rounded-md hover:bg-blue-200 transition-colors"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                <FileUpload files={attachments} onFilesChange={setAttachments} maxFiles={10} maxFileSize={10} />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLoading ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Creating..." : "Create Deal"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
