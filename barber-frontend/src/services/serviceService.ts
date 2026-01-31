import { supabase } from './supabaseClient';
import { Service, CreateServiceInput } from '../types';

/**
 * Fetch all services for a salon
 */
export async function fetchServices(salonId: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    return { data: data as Service[] | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Fetch a single service by ID
 */
export async function fetchServiceById(id: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as Service | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Create a new service
 */
export async function createService(input: CreateServiceInput) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('services')
      .insert({
        salon_id: input.salonId,
        name: input.name,
        price: input.price,
        duration: input.duration,
        description: input.description,
        is_active: true,
      })
      .select()
      .single();

    return { data: data as Service | null, error };
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
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data: data as Service | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Delete a service (soft delete by marking as inactive)
 */
export async function deleteService(id: string) {
  if (!supabase) {
    return { error: new Error('Supabase client not initialized') };
  }

  try {
    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id);

    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Hard delete a service (permanent)
 */
export async function hardDeleteService(id: string) {
  if (!supabase) {
    return { error: new Error('Supabase client not initialized') };
  }

  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    return { error };
  } catch (err: any) {
    return { error: err };
  }
}
