import { apiClient } from './apiClient';
import { Service, CreateServiceInput } from '../types';

const normalizeService = (service: any): Service => {
  if (!service) {
    return service as Service;
  }
  return {
    ...service,
    id: service.id ?? service._id,
    salon_id: service.salon_id ?? service.salonId
  } as Service;
};

/**
 * Fetch all services for a salon
 */
export async function fetchServices(salonId: string) {
  try {
    const services = await apiClient.fetchServices(salonId);
    return { data: services.map(normalizeService) as Service[] | null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Fetch a single service by ID
 */
export async function fetchServiceById(id: string) {
  try {
    const service = await apiClient.fetchServiceById(id);
    return { data: normalizeService(service) as Service | null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Create a new service
 */
export async function createService(input: CreateServiceInput) {
  try {
    const service = await apiClient.createService(input);
    return { data: normalizeService(service) as Service | null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Update an existing service
 */
export async function updateService(
  id: string,
  updates: Partial<Omit<Service, 'id' | 'salon_id' | 'created_at'>>
) {
  try {
    const service = await apiClient.updateService(id, updates);
    return { data: normalizeService(service) as Service | null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Delete a service (soft delete by marking as inactive)
 */
export async function deleteService(id: string) {
  try {
    await apiClient.deleteService(id);
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Hard delete a service (permanent)
 */
export async function hardDeleteService(id: string) {
  try {
    await apiClient.hardDeleteService(id);
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}
