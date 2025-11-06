"use client"

import { Modal } from "../../../components/modal"
import { X, User, Mail, Phone } from "lucide-react"
import type { Person } from "../../../types/people"
import { useClaimPersonMutation } from "../peopleApi"
import { toast } from "react-toastify"

interface ClaimLeadModalProps {
  isOpen: boolean
  onClose: () => void
  person: Person | null
  onSuccess?: () => void
}

export const ClaimLeadModal = ({ isOpen, onClose, person, onSuccess }: ClaimLeadModalProps) => {
  const [claimPerson, { isLoading }] = useClaimPersonMutation()

  if (!isOpen || !person) return null

  const handleClaim = async () => {
    try {
      await claimPerson({ personId: person.id }).unwrap()
      toast.success("Lead claimed successfully")
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Failed to claim lead:", error)
      toast.error("Failed to claim lead" + ((error as any)?.data?.message ? `: ${(error as any).data.message}` : ""))
    }
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Claim Lead</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Lead Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">{person.name}</span>
              </div>
              {person.emails && person.emails.length > 0 && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">
                    {(person.emails[0] as any)?.email ?? (person.emails[0] as any)?.value ?? String(person.emails[0])}
                  </span>
                </div>
              )}
              {person.phones && person.phones.length > 0 && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">
                    {(person.phones[0] as any)?.phoneNumber ?? (person.phones[0] as any)?.value ?? String(person.phones[0])}
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500">
            By claiming this lead, you will become the assigned agent. The lead will no longer be available for others to claim.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleClaim}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Claiming..." : "Claim Lead"}
          </button>
        </div>
      </div>
    </Modal>
  )
}
