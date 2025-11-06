import { CreatePersonRequest, UpdatePersonRequest } from "../types/people";

export const createPersonFormData = (data: CreatePersonRequest): FormData => {
  const formData = new FormData();

  formData.append("name", data.name);
  formData.append("first_name", data.first_name);
  formData.append("last_name", data.last_name);
  formData.append("prequalified", String(data.prequalified));
  formData.append("stage_id", String(data.stage_id));
  formData.append("source", data.source);
  formData.append("source_url", data.source_url);
  formData.append("contacted", String(data.contacted));
  formData.append("price", String(data.price));
  formData.append("timeframe_id", String(data.timeframe_id));

  if (data.assigned_user_id != null) {
    formData.append("assigned_user_id", String(data.assigned_user_id));
  }

  if (data.assigned_lender_id != null) {
    formData.append("assigned_lender_id", String(data.assigned_lender_id));
  }

  // If creating and a group was selected for assignment/distribution, include it
  if ((data as any).assign_to_group != null) {
    formData.append("available_for_group_id", String((data as any).available_for_group_id));
  }

  if (data.picture) {
    formData.append("picture", data.picture);
  }

  // Append nested arrays
  data.emails.forEach((email, i) => {
    formData.append(`emails[${i}][value]`, email.value);
    formData.append(`emails[${i}][type]`, email.type);
    formData.append(`emails[${i}][is_primary]`, String(email.is_primary));
    formData.append(`emails[${i}][status]`, email.status);
  });

  data.phones.forEach((phone, i) => {
    formData.append(`phones[${i}][value]`, phone.value);
    formData.append(`phones[${i}][type]`, phone.type);
    formData.append(`phones[${i}][is_primary]`, String(phone.is_primary));
    formData.append(`phones[${i}][status]`, phone.status);
  });

  data.addresses.forEach((addr, i) => {
    formData.append(`addresses[${i}][street_address]`, addr.street_address);
    formData.append(`addresses[${i}][city]`, addr.city);
    formData.append(`addresses[${i}][state]`, addr.state);
    formData.append(`addresses[${i}][postal_code]`, addr.postal_code);
    formData.append(`addresses[${i}][country]`, addr.country);
    formData.append(`addresses[${i}][type]`, addr.type);
    formData.append(`addresses[${i}][is_primary]`, String(addr.is_primary));
  });

  data.tags.forEach((tag, i) => {
    formData.append(`tags[${i}][name]`, tag.name);
    formData.append(`tags[${i}][color]`, tag.color);
    formData.append(`tags[${i}][description]`, tag.description);
  });

  data.collaborators_ids?.forEach((col, i) => {
    formData.append(`collaborators_ids[${i}]`, String(col));
  });

  return formData;
};


export const updatePersonFormData = (data: UpdatePersonRequest): FormData => {
  const formData = new FormData();

  formData.append("id", String(data.id));
  formData.append("_method", "PUT");

  const appendIfDefined = <T>(key: string, value: T | undefined | null) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  };

  appendIfDefined("name", data.name);
  appendIfDefined("first_name", data.first_name);
  appendIfDefined("last_name", data.last_name);
  appendIfDefined("prequalified", data.prequalified);
  appendIfDefined("stage", data.stage);
  appendIfDefined("stage_id", data.stage_id);
  appendIfDefined("source", data.source);
  appendIfDefined("source_url", data.source_url);
  appendIfDefined("contacted", data.contacted);
  appendIfDefined("price", data.price);
  appendIfDefined("assigned_user_id", Number(data.assigned_user_id) === 0 ? '' : data.assigned_user_id);
  appendIfDefined("assigned_pond_id", Number(data.assigned_pond_id) === 0 ? '' : data.assigned_pond_id);
  appendIfDefined("assigned_lender_id", Number(data.assigned_lender_id) === 0 ? '' : data.assigned_lender_id);
  appendIfDefined("available_for_group_id", Number(data.available_for_group_id) === 0 ? '' : data.available_for_group_id);
  appendIfDefined("timeframe_id", data.timeframe_id);
  appendIfDefined("background", data.background);

  if (data.picture) {
    formData.append("picture", data.picture);
  }

  // Helper for arrays of objects
  const appendArray = <T extends object>(
    key: string,
    items: T[] | undefined,
    mapper: (item: T, i: number) => [string, string][]
  ) => {
    if (items) {
      items.forEach((item, i) => {
        const fields = mapper(item, i);
        fields.forEach(([k, v]) => formData.append(`${key}[${i}][${k}]`, v));
      });
    }
  };

  appendArray("emails", data.emails, (email) => [
    ["value", email.value],
    ["type", email.type],
    ["is_primary", String(email.is_primary)],
    ["status", email.status],
  ]);

  appendArray("phones", data.phones, (phone) => [
    ["value", phone.value],
    ["type", phone.type],
    ["is_primary", String(phone.is_primary)],
    ["status", phone.status],
  ]);

  appendArray("addresses", data.addresses, (addr) => [
    ["street_address", addr.street_address],
    ["city", addr.city],
    ["state", addr.state],
    ["postal_code", addr.postal_code],
    ["country", addr.country],
    ["type", addr.type],
    ["is_primary", String(addr.is_primary)],
  ]);

  appendArray("tags", data.tags, (tag) => [
    ["name", tag.name],
    ["color", tag.color],
    ["description", tag.description],
  ]);

  return formData;
};
