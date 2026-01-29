#!/usr/bin/env python3
"""
Reservi Multi-Tenant System Verification Suite
----------------------------------------------
Tests: 
1. Hamdi Login (Owner) -> Verify Access to Hamdi Salon Data
2. Admin Login (Super Admin) -> Verify Global Access
"""

import requests
import json
import time
import os
import sys
from typing import Optional, Dict, Any

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "REDACTED_JWT",
)

# Test Users
HAMDI_EMAIL = "hamdi@salon"
ADMIN_EMAIL = "admin@reservi.com"
PASSWORD = "password123"

# Colors
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{Colors.ENDC}\n")

def print_success(text: str):
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")

def print_error(text: str):
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_info(text: str):
    print(f"{Colors.OKBLUE}ℹ️  {text}{Colors.ENDC}")

def login(email: str, label: str) -> Optional[str]:
    print_info(f"Logging in as {label} ({email})...")
    try:
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": PASSWORD},
            timeout=5
        )
        if response.status_code == 200:
            token = response.json().get('access_token')
            print_success(f"Login successful for {label}")
            return token
        else:
            print_error(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print_error(f"Connection error: {e}")
        return None

def verify_owner_access(token: str):
    print_header("Verifying Owner (Hamdi) Access")
    
    # 1. Get My Salon
    try:
        headers = {"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"}
        
        # Determine User ID from checking 'staff' table logic users usually query their own staff record
        # But let's check Salons table where owner_email is me
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/salons?select=*",
            headers=headers
        )
        
        if response.status_code == 200:
            salons = response.json()
            if len(salons) == 1 and salons[0]['slug'] == 'hamdisalon':
                print_success(f"Hamdi sees correct salon: {salons[0]['name']} ({salons[0]['slug']})")
                
                # 2. Check Staff Access
                salon_id = salons[0]['id']
                staff_resp = requests.get(
                    f"{SUPABASE_URL}/rest/v1/staff?salon_id=eq.{salon_id}&select=*",
                    headers=headers
                )
                if staff_resp.status_code == 200:
                    staff = staff_resp.json()
                    print_success(f"Hamdi can see {len(staff)} staff members")
                    names = [s['full_name'] for s in staff]
                    print_info(f"Staff: {', '.join(names)}")
                else:
                    print_error("Hamdi cannot fetch staff")
            else:
                print_error(f"Hamdi sees unexpected salons: {salons}")
        else:
            print_error(f"Failed to fetch salons: {response.text}")
            
    except Exception as e:
        print_error(f"Error: {e}")

def verify_admin_access(token: str):
    print_header("Verifying Super Admin Access")
    
    headers = {"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"}
    
    # 1. Check is_super_admin flag in staff (optional, but good verification)
    # 2. Try to fetch ALL salons (RLS should allow)
    
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/salons?select=*",
            headers=headers
        )
        
        if response.status_code == 200:
            salons = response.json()
            print_success(f"Admin can see {len(salons)} salons (Global Access)")
            for s in salons:
                print_info(f"- {s['name']} (Owner: {s['owner_email']})")
        else:
            print_error(f"Admin failed to fetch salons: {response.text}")

        # Check if Admin can see all staff
        staff_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/staff?select=count",
            headers={**headers, "Range": "0-0", "Prefer": "count=exact"}
        )
        if staff_resp.status_code in [200, 206]:
            # Content-Range: 0-0/4
            total = staff_resp.headers.get('Content-Range', '/0').split('/')[1]
            print_success(f"Admin sees total {total} staff members across system")
            
    except Exception as e:
        print_error(f"Error: {e}")

def run_tests():
    print_header("STARTING SYSTEM VERIFICATION")
    
    # 1. Hamdi Flow
    hamdi_token = login(HAMDI_EMAIL, "Hamdi (Owner)")
    if hamdi_token:
        verify_owner_access(hamdi_token)
    
    # 2. Admin Flow
    admin_token = login(ADMIN_EMAIL, "Admin (Super)")
    if admin_token:
        verify_admin_access(admin_token)

if __name__ == "__main__":
    run_tests()
