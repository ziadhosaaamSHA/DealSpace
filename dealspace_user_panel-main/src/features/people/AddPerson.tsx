"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useCreatePersonMutation, useGetStagesQuery, useDistributePersonToGroupMutation } from "./peopleApi"
import { useNavigate } from "react-router"
import { X, Plus, Check, ArrowLeft } from "lucide-react"
import { toast } from "react-toastify"
import { useGetUsersQuery } from "../users/usersApi"
import { useGetGroupsQuery } from "../groups/groupsApi"

export default function CreatePerson() {
  const navigate = useNavigate()
  const [createPerson, { isLoading }] = useCreatePersonMutation()
  const { data: stagesData, isLoading: isLoadingStages } = useGetStagesQuery()
  const [distributePersonToGroup] = useDistributePersonToGroupMutation()

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    stage: "",
    stageId: "",
    source: "",
    sourceUrl: "",
    price: "",
    timeframeId: "1",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "USA",
    addressType: "home",
    prequalified: false,
    assignedTo: "",
  })

  // Multiple items state
  const [emails, setEmails] = useState([{ value: "", type: "work", is_primary: true, status: "Not Validated" }])

  const [phones, setPhones] = useState([{ value: "", type: "mobile", is_primary: true, status: "Not Validated" }])

  const [tags, setTags] = useState<Array<{ name: string; color: string; description: string }>>([])

  const [collaborators, setCollaborators] = useState<Array<{ id: number; name: string; email: string }>>([])
  const [collaboratorSearchTerm, setCollaboratorSearchTerm] = useState("")
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false)

  // Add assigned to search functionality
  const [assignedToSearchTerm, setAssignedToSearchTerm] = useState("")
  const [showAssignedToSearch, setShowAssignedToSearch] = useState(false)
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<{ id: number; name: string; email: string } | null>(null)

  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery(
    { search: collaboratorSearchTerm, page: 1, per_page: 50 },
    { skip: !showCollaboratorSearch },
  )

  const { data: agentsData, isLoading: isLoadingAgents } = useGetUsersQuery(
    {
      role: 2, // Agent role
      search: assignedToSearchTerm,
      page: 1,
      per_page: 50,
    },
    { skip: !showAssignedToSearch },
  )

  // Groups: simple select for assignment on create
  const [groupSearchTerm, setGroupSearchTerm] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<{ id: number; name: string } | null>(null)
  const [assignedGroupId, setAssignedGroupId] = useState<number | "">("")
  const { data: groupsData, isLoading: isLoadingGroups } = useGetGroupsQuery({ page: 1, per_page: 100 })

  // Set default stage when stages are loaded
  useEffect(() => {
    if (stagesData?.data && stagesData.data.length > 0) {
      setFormData((prev) => ({
        ...prev,
        stage: stagesData.data[0].name,
        stageId: stagesData.data[0].id.toString(),
      }))
    }
  }, [stagesData])

  // Handle input changes for main form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Special handling for stage selection to update both stage name and ID
    if (name === "stageId" && stagesData?.data) {
      const selectedStage = stagesData.data.find((stage) => stage.id.toString() === value)
      if (selectedStage) {
        setFormData((prev) => ({
          ...prev,
          stageId: value,
          stage: selectedStage.name,
        }))
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  // Email handlers
  const handleEmailChange = (index: number, field: string, value: string) => {
    const updatedEmails = [...emails]
    updatedEmails[index] = { ...updatedEmails[index], [field]: value }
    setEmails(updatedEmails)
  }

  const addEmail = () => {
    setEmails([...emails, { value: "", type: "work", is_primary: false, status: "Not Validated" }])
  }

  const removeEmail = (index: number) => {
    if (emails.length === 1) return
    const newEmails = emails.filter((_, i) => i !== index)
    // If we removed the primary email, set the first one as primary
    if (emails[index].is_primary && newEmails.length > 0) {
      newEmails[0].is_primary = true
    }
    setEmails(newEmails)
  }

  const setPrimaryEmail = (index: number) => {
    const updatedEmails = emails.map((email, i) => ({
      ...email,
      is_primary: i === index,
    }))
    setEmails(updatedEmails)
  }

  // Phone handlers
  const handlePhoneChange = (index: number, field: string, value: string) => {
    const updatedPhones = [...phones]
    updatedPhones[index] = { ...updatedPhones[index], [field]: value }
    setPhones(updatedPhones)
  }

  const addPhone = () => {
    setPhones([...phones, { value: "", type: "mobile", is_primary: false, status: "Not Validated" }])
  }

  const removePhone = (index: number) => {
    if (phones.length === 1) return
    const newPhones = phones.filter((_, i) => i !== index)
    // If we removed the primary phone, set the first one as primary
    if (phones[index].is_primary && newPhones.length > 0) {
      newPhones[0].is_primary = true
    }
    setPhones(newPhones)
  }

  const setPrimaryPhone = (index: number) => {
    const updatedPhones = phones.map((phone, i) => ({
      ...phone,
      is_primary: i === index,
    }))
    setPhones(updatedPhones)
  }

  // Tag handlers
  const addTag = () => {
    setTags([...tags, { name: "", color: "#FF0000", description: "" }])
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const handleTagChange = (index: number, field: string, value: string) => {
    const updatedTags = [...tags]
    updatedTags[index] = { ...updatedTags[index], [field]: value }
    setTags(updatedTags)
  }

  // Collaborator handlers
  const handleCollaboratorSelect = (user: any) => {
    const isAlreadySelected = collaborators.some((c) => c.id === user.id)
    if (!isAlreadySelected) {
      setCollaborators([
        ...collaborators,
        {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      ])
    }
    setShowCollaboratorSearch(false)
    setCollaboratorSearchTerm("")
  }

  const removeCollaborator = (userId: number) => {
    setCollaborators(collaborators.filter((c) => c.id !== userId))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Filter out empty entries
      const filteredEmails = emails.filter((email) => email.value.trim() !== "")
      const filteredPhones = phones.filter((phone) => phone.value.trim() !== "")
      const filteredTags = tags.filter((tag) => tag.name.trim() !== "")
      const collaborators_ids = collaborators.map((c) => c.id)

      // Prepare data for API
      const personData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`,
        stage: formData.stage,
        stage_id: Number.parseInt(formData.stageId) || 1,
        source: formData.source,
        source_url: formData.sourceUrl,
        contacted: 0,
        price: Number.parseFloat(formData.price) || 0,
        timeframe_id: Number.parseInt(formData.timeframeId),
        prequalified: formData.prequalified,
        collaborators_ids: collaborators_ids,
        assigned_to: selectedAssignedTo?.id || null,
        emails: filteredEmails,
        phones: filteredPhones,
        addresses: [
          {
            street_address: formData.streetAddress,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postalCode,
            country: formData.country,
            type: formData.addressType,
            is_primary: true,
          },
        ],
        tags: filteredTags,
      }

      // Call API to create person
      const createdPerson = await createPerson(personData).unwrap()
      toast.success("Person created successfully!")
      navigate("/people")
      // Show success message and navigate back to people list
      if (selectedGroup && createdPerson?.data?.id) {
        await distributePersonToGroup({ personId: createdPerson.data.id, groupId: selectedGroup.id }).unwrap()
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "An error occurred. Please check the form for errors.")
      console.error("An error occurred:", error)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAssignedToSearch && !(event.target as Element).closest(".assigned-to-search")) {
        setShowAssignedToSearch(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showAssignedToSearch])

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <h3 className={`text-xl font-semibold text-gray-900 dark:text-white mb-4`}>Create New Person</h3>
          <button
            onClick={() => navigate("/people")}
            className="px-3 py-1 bg-black text-white rounded flex items-center gap-1 mb-4"
          >
            <ArrowLeft />
            Back
          </button>
        </div>
        <div className="w-full mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="md:col-span-2">
                <h2 className="text-lg font-medium text-gray-700 mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name*
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name*
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Stage and Source */}

              {/* Group assignment (optional) */}
              <div>
                <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-1">
                  Group (for distribution)
                </label>
                <select
                  id="group"
                  name="group"
                  value={selectedGroup ? String(selectedGroup.id) : assignedGroupId}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) {
                      setSelectedGroup(null)
                      setAssignedGroupId("")
                    } else {
                      const id = Number(v)
                      const g = groupsData?.data?.items?.find((gg: any) => gg.id === id)
                      setSelectedGroup(g ? { id: g.id, name: g.name } : null)
                      setAssignedGroupId(id)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {isLoadingGroups ? null : groupsData?.data?.items?.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="stageId" className="block text-sm font-medium text-gray-700 mb-1">
                  Stage
                </label>
                {isLoadingStages ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">Loading stages...</div>
                ) : (
                  <select
                    id="stageId"
                    name="stageId"
                    value={formData.stageId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {stagesData?.data?.map((stage) => (
                      <option key={stage.id} value={stage.id.toString()}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                )}
                {formData.stageId && stagesData?.data && (
                  <p className="mt-1 text-xs text-gray-500">
                    {stagesData.data.find((stage) => stage.id.toString() === formData.stageId)?.description}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <input
                  type="text"
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  placeholder="Website, Referral, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Source URL
                </label>
                <input
                  type="text"
                  id="sourceUrl"
                  name="sourceUrl"
                  value={formData.sourceUrl}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="timeframeId" className="block text-sm font-medium text-gray-700 mb-1">
                  Timeframe
                </label>
                <select
                  id="timeframeId"
                  name="timeframeId"
                  value={formData.timeframeId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Immediate</option>
                  <option value="2">1-3 Months</option>
                  <option value="3">3-6 Months</option>
                  <option value="4">6+ Months</option>
                </select>
              </div>

              {/* Prequalified and Assigned To */}
              <div className="md:col-span-2">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="prequalified"
                    name="prequalified"
                    checked={formData.prequalified}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="prequalified" className="ml-2 block text-sm text-gray-700">
                    Prequalified
                  </label>
                </div>
              </div>

              <div className="assigned-to-search">
                <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To (Agent)
                </label>
                {!selectedAssignedTo ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search and select agent..."
                      value={assignedToSearchTerm}
                      onChange={(e) => {
                        setAssignedToSearchTerm(e.target.value)
                        setShowAssignedToSearch(true)
                      }}
                      onFocus={() => setShowAssignedToSearch(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {showAssignedToSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {isLoadingAgents ? (
                          <div className="p-3 text-center text-gray-500">Loading...</div>
                        ) : agentsData?.data?.items?.length ? (
                          agentsData.data.items.map((agent: any) => (
                            <button
                              key={agent.id}
                              type="button"
                              onClick={() => {
                                setSelectedAssignedTo({ id: agent.id, name: agent.name, email: agent.email })
                                setShowAssignedToSearch(false)
                                setAssignedToSearchTerm("")
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
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">{selectedAssignedTo.name}</div>
                      <div className="text-sm text-gray-500">{selectedAssignedTo.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssignedTo(null)
                      }}
                      className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Contact Information - Emails */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-700">Email Addresses</h2>
                  <button
                    type="button"
                    onClick={addEmail}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Email
                  </button>
                </div>

                {emails.map((email, index) => (
                  <div key={index} className="mb-4 border rounded-md p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-md font-medium text-gray-700">Email #{index + 1}</h3>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setPrimaryEmail(index)}
                          className={`px-2 py-1 text-xs rounded-full flex items-center ${
                            email.is_primary
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          }`}
                        >
                          {email.is_primary && <Check className="h-3 w-3 mr-1" />}
                          Primary
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEmail(index)}
                          disabled={emails.length === 1}
                          className={`p-1 rounded-full text-red-500 hover:bg-red-100 ${
                            emails.length === 1 ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address{index === 0 && "*"}
                        </label>
                        <input
                          type="email"
                          value={email.value}
                          onChange={(e) => handleEmailChange(index, "value", e.target.value)}
                          required={index === 0}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Type</label>
                        <select
                          value={email.type}
                          onChange={(e) => handleEmailChange(index, "type", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="home">home</option>
                          <option value="work">work</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact Information - Phones */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-700">Phone Numbers</h2>
                  <button
                    type="button"
                    onClick={addPhone}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Phone
                  </button>
                </div>

                {phones.map((phone, index) => (
                  <div key={index} className="mb-4 border rounded-md p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-md font-medium text-gray-700">Phone #{index + 1}</h3>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setPrimaryPhone(index)}
                          className={`px-2 py-1 text-xs rounded-full flex items-center ${
                            phone.is_primary
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          }`}
                        >
                          {phone.is_primary && <Check className="h-3 w-3 mr-1" />}
                          Primary
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhone(index)}
                          disabled={phones.length === 1}
                          className={`p-1 rounded-full text-red-500 hover:bg-red-100 ${
                            phones.length === 1 ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number{index === 0 && "*"}
                        </label>
                        <input
                          type="tel"
                          value={phone.value}
                          onChange={(e) => handlePhoneChange(index, "value", e.target.value)}
                          required={index === 0}
                          placeholder="+1234567890"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Type</label>
                        <select
                          value={phone.type}
                          onChange={(e) => handlePhoneChange(index, "type", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="mobile">Mobile</option>
                          <option value="work">Work</option>
                          <option value="home">Home</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <h2 className="text-lg font-medium text-gray-700 mb-4">Address</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="streetAddress"
                      name="streetAddress"
                      value={formData.streetAddress}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="addressType" className="block text-sm font-medium text-gray-700 mb-1">
                      Address Type
                    </label>
                    <select
                      id="addressType"
                      name="addressType"
                      value={formData.addressType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                      <option value="mailing">Mailing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-700">Tags</h2>
                  <button
                    type="button"
                    onClick={addTag}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Tag
                  </button>
                </div>

                {tags.length === 0 && (
                  <p className="text-sm text-gray-500 italic mb-4">No tags added yet. Click "Add Tag" to create one.</p>
                )}

                {tags.map((tag, index) => (
                  <div key={index} className="mb-4 border rounded-md p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-md font-medium text-gray-700">Tag #{index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="p-1 rounded-full text-red-500 hover:bg-red-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
                        <input
                          type="text"
                          value={tag.name}
                          onChange={(e) => handleTagChange(index, "name", e.target.value)}
                          placeholder="VIP Client, Hot Lead, etc."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tag Color</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={tag.color}
                            onChange={(e) => handleTagChange(index, "color", e.target.value)}
                            className="h-9 w-9 p-0 border border-gray-300 rounded"
                          />
                          <input
                            type="text"
                            value={tag.color}
                            onChange={(e) => handleTagChange(index, "color", e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tag Description</label>
                        <input
                          type="text"
                          value={tag.description}
                          onChange={(e) => handleTagChange(index, "description", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Collaborators */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-700">Collaborators</h2>
                  {!showCollaboratorSearch && (
                    <button
                      type="button"
                      onClick={() => setShowCollaboratorSearch(true)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Collaborator
                    </button>
                  )}
                </div>

                {/* Search Interface */}
                {showCollaboratorSearch && (
                  <div className="mb-4 border rounded-md p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-md font-medium text-gray-700">Search Users</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCollaboratorSearch(false)
                          setCollaboratorSearchTerm("")
                        }}
                        className="p-1 rounded-full text-gray-500 hover:bg-gray-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={collaboratorSearchTerm}
                      onChange={(e) => setCollaboratorSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    />

                    {isLoadingUsers ? (
                      <div className="text-center py-4 text-gray-500">Loading users...</div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto">
                        {usersData?.data?.items?.map((user: any) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleCollaboratorSelect(user)}
                            disabled={collaborators.some((c) => c.id === user.id)}
                            className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                              collaborators.some((c) => c.id === user.id)
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            }`}
                          >
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {collaborators.some((c) => c.id === user.id) && (
                              <div className="text-xs text-green-600">Already added</div>
                            )}
                          </button>
                        ))}
                        {usersData?.data?.items?.length === 0 && (
                          <div className="text-center py-4 text-gray-500">No users found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Collaborators */}
                {collaborators.length === 0 && !showCollaboratorSearch && (
                  <p className="text-sm text-gray-500 italic mb-4">
                    No collaborators added yet. Click "Add Collaborator" to search and select users.
                  </p>
                )}

                {collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="mb-4 border rounded-md p-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-md font-medium text-gray-700">{collaborator.name}</h3>
                        <p className="text-sm text-gray-500">{collaborator.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCollaborator(collaborator.id)}
                        className="p-1 rounded-full text-red-500 hover:bg-red-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate("/people")}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? "Creating..." : "Create Person"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
