import os
import requests
import json
import random

# Configuration
SUPABASE_URL = "http://localhost:54321"
SUPABASE_ANON_KEY = "REDACTED"
HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def create_or_get_salon():
    print("Checking for existing salon...")
    res = requests.get(f"{SUPABASE_URL}/rest/v1/salons?select=*", headers=HEADERS)
    if res.status_code == 200 and len(res.json()) > 0:
        salon = res.json()[0]
        print(f"Found existing salon: {salon['name']} ({salon['id']})")
        return salon
    
    print("Creating new salon...")
    data = {
        "name": "Luxe Barber",
        "owner_email": "owner@luxe.com",
        "slug": "luxe-barber",
        "address": "123 Main St, Cityville"
    }
    res = requests.post(f"{SUPABASE_URL}/rest/v1/salons", headers=HEADERS, json=data)
    if res.status_code == 201:
        salon = res.json()[0]
        print(f"Created salon: {salon['name']}")
        return salon
    else:
        print(f"Error creating salon: {res.text}")
        return None

def create_staff(salon_id):
    staff_names = ["John Expert", "Sarah Styles", "Mike Fade"]
    created_staff = []
    
    for name in staff_names:
        # Check if exists
        res = requests.get(f"{SUPABASE_URL}/rest/v1/staff?salon_id=eq.{salon_id}&full_name=eq.{name}", headers=HEADERS)
        
        json_resp = res.json()
        if isinstance(json_resp, dict) and 'code' in json_resp:
             print(f"Error checking staff: {json_resp}")
             # If error, maybe we can't check? But we need to fix the error.
             # Return empty to allow loop to continue or exit?
             # For now, let's print and break/continue to see the error.
             continue

        if len(json_resp) > 0:
            print(f"Staff {name} already exists.")
            created_staff.append(json_resp[0])
            continue

        print(f"Creating staff: {name}")
        # Note: In real app we use the edge function, but for direct DB insert (if policy allows):
        # We'll try direct insert since RLS might be permissive or we are Anon (simulating frontend logic which might be restricted, but let's try)
        # Actually proper way is likely via the edge function create-staff, but that requires a user context usually.
        # Let's try direct insert into 'staff' table.
        data = {
            "salon_id": salon_id,
            "full_name": name,
            "email": f"{name.lower().replace(' ', '.')}@example.com",
            "status": "Active",
            "role": "barber"
        }
        res = requests.post(f"{SUPABASE_URL}/rest/v1/staff", headers=HEADERS, json=data)
        if res.status_code == 201:
            created_staff.append(res.json()[0])
        else:
            print(f"Failed to create staff {name}: {res.text}")

    return created_staff

def create_services(salon_id):
    services = [
        {"name": "Men's Haircut", "price": 25.00, "duration": 30},
        {"name": "Beard Trim", "price": 15.00, "duration": 20},
        {"name": "Full Service", "price": 50.00, "duration": 60}
    ]
    created = []
    for srv in services:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/services?salon_id=eq.{salon_id}&name=eq.{srv['name']}", headers=HEADERS)
        if len(res.json()) > 0:
            created.append(res.json()[0])
            continue
            
        srv['salon_id'] = salon_id
        srv['is_active'] = True
        res = requests.post(f"{SUPABASE_URL}/rest/v1/services", headers=HEADERS, json=srv)
        if res.status_code == 201:
            print(f"Created service: {srv['name']}")
            created.append(res.json()[0])
            
    return created

def create_stations(salon_id, staff_members):
    # Layout configuration
    layout = [
        {"type": "chair", "x": 100, "y": 150},
        {"type": "chair", "x": 300, "y": 150},
        {"type": "chair", "x": 500, "y": 150},
        {"type": "sofa", "x": 100, "y": 400},
    ]
    
    # clear existing
    # requests.delete(f"{SUPABASE_URL}/rest/v1/stations?salon_id=eq.{salon_id}", headers=HEADERS)

    existing_res = requests.get(f"{SUPABASE_URL}/rest/v1/stations?salon_id=eq.{salon_id}", headers=HEADERS)
    if len(existing_res.json()) > 0:
        print("Stations already exist. Updating assignments...")
        stations = existing_res.json()
    else:
        stations = []
        for i, item in enumerate(layout):
            data = {
                "salon_id": salon_id,
                "name": f"{item['type'].capitalize()} {i+1}",
                "type": item['type'],
                "position_x": item['x'],
                "position_y": item['y'],
                "width": 192 if item['type'] == 'sofa' else 96,
                "is_active": True
            }
            res = requests.post(f"{SUPABASE_URL}/rest/v1/stations", headers=HEADERS, json=data)
            if res.status_code == 201:
                stations.append(res.json()[0])
                print(f"Created station: {data['name']}")

    # Assign staff to first 3 stations
    for i, station in enumerate(stations):
        if station['type'] == 'chair' and i < len(staff_members):
            staff_id = staff_members[i]['id']
            print(f"Assigning {staff_members[i]['full_name']} to {station['name']}")
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/stations?id=eq.{station['id']}", 
                headers=HEADERS, 
                json={"current_staff_id": staff_id}
            )

def main():
    print("--- Starting Data Population ---")
    salon = create_or_get_salon()
    if not salon:
        return
    
    services = create_services(salon['id'])
    staff = create_staff(salon['id'])
    create_stations(salon['id'], staff)
    
    print("--- Data Population Complete ---")

if __name__ == "__main__":
    main()
