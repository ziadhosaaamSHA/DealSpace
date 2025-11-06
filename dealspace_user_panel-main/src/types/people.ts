import { Stage } from "./stages"
import { User } from "./users"
import { Pond } from "./ponds"
import { Group } from "./groups"

// People Types
export interface Person {
    id: number
    name: string
    first_name: string
    last_name: string
    prequalified: boolean
    stage: Stage
    stage_id: number
    source: string
    source_url: string
    background?: string
    contacted: number
    price: string
    collaborators: Collaborator[]
    tags: Tag[]
    emails: Email[]
    phones: Phone[]
    addresses: Address[]
    picture: string | null
    timeframe_id: number
    created_via: string | null
    created_at: string
    updated_at: string
    last_activity: string | null
    assigned_user?: User
    assigned_pond?: Pond
    assigned_lender?: User
    assigned_group?: Group
    custom_fields?: CustomField[]
    available_for_group_id?: number | null
    claim_expires_at?: string | null
    last_group_id?: number | null
  }
  
  export interface CustomField {
    id: number
    person_id: number
    custom_field_id: number
    value: string
    created_at?: string
    updated_at?: string
  }

  export interface Email {
    id?: number
    person_id?: number
    value: string
    type: string
    is_primary: boolean
    status: string
    created_at?: string
    updated_at?: string
  }
  
  export interface Phone {
    id?: number
    person_id?: number
    value: string
    type: string
    is_primary: boolean
    status: string
    created_at?: string
    updated_at?: string
  }
  
  export interface Address {
    id?: number
    person_id?: number
    street_address: string
    city: string
    state: string
    postal_code: string
    country: string
    type: string
    is_primary: boolean
    created_at?: string
    updated_at?: string
  }
  
  export interface Tag {
    id?: number
    person_id?: number
    name: string
    color: string
    description: string
    created_at?: string
    updated_at?: string
  }
  
  export interface Collaborator {
    id?: number
    person_id?: number
    name: string
    assigned: boolean
    role: string
    created_at?: string
    updated_at?: string
  }
  
  export interface CreatePersonRequest {
    name: string
    first_name: string
    last_name: string
    prequalified: boolean
    stage_id: number
    source: string
    source_url: string
    contacted: number
    price: number | string
    assigned_lender_id?: number | null
    assigned_user_id?: number | null
    assigned_pond_id?: number | null
    available_for_group_id?: number | null
    timeframe_id: number
    picture?: File | null
    emails: Omit<Email, "id" | "person_id" | "created_at" | "updated_at">[]
    phones: Omit<Phone, "id" | "person_id" | "created_at" | "updated_at">[]
    addresses: Omit<Address, "id" | "person_id" | "created_at" | "updated_at">[]
    tags: Omit<Tag, "id" | "person_id" | "created_at" | "updated_at">[]
    collaborators_ids?: number[]
    assign_to_group?: number | null
  }
  
  export interface UpdatePersonRequest {
    id: number
    name?: string
    first_name?: string
    last_name?: string
    prequalified?: boolean
    stage?: string
    stage_id?: number
    source?: string
    source_url?: string
    background?: string
    contacted?: number
    price?: number | string
    assigned_lender_id?: number | null
    assigned_user_id?: number | null
    assigned_pond_id?: number | null
    available_for_group_id?: number | null
    timeframe_id?: number
    picture?: File | null
    emails?: Omit<Email, "id" | "person_id" | "created_at" | "updated_at">[]
    phones?: Omit<Phone, "id" | "person_id" | "created_at" | "updated_at">[]
    addresses?: Omit<Address, "id" | "person_id" | "created_at" | "updated_at">[]
    tags?: Omit<Tag, "id" | "person_id" | "created_at" | "updated_at">[]
    collaborators?: Omit<Collaborator, "id" | "person_id" | "created_at" | "updated_at">[]
  }
  
  export interface PersonEvent {
  id: number
  source: string
  system: string
  type: string
  message: string
  description: string
  person: {
    name: string
    email: string
    phone?: string
    message?: string
  } | null
  property: {
    street: string
    city: string
    state: string
    code: string
    mlsNumber: string
    price: number
    forRent: boolean
    url: string
    type: string
    bedrooms: string
    bathrooms: string
    area: string
    lot: string
  } | null
  property_search: any | null
  campaign: {
    source: string
    medium: string
    campaign: string
  } | null
  page_title: string
  page_url: string
  page_referrer: string | null
  page_duration: number | null
  occurred_at: string
  is_historical: boolean
  person_full_name: string | null
  property_address: string | null
  tenant_id: string
  person_id: number | null
  created_at: string
  updated_at: string
}
