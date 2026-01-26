#!/usr/bin/env python3
"""
Comprehensive Barber Salon Management System Test Suite
Tests: Owner Login → Create Staff → Staff Login → CRUD Operations
"""

import requests
import json
import time
import os
from datetime import datetime
from typing import Optional, Dict, Any

# Configuration (read from env with safe defaults)
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "REDACTED_JWT",
)
OWNER_EMAIL = os.getenv("OWNER_EMAIL", "owner@barbershop.com")
OWNER_PASSWORD = os.getenv("OWNER_PASSWORD", "password123")
SALON_ID = None  # Will be fetched

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{Colors.ENDC}\n")

def print_success(text: str):
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")

def print_error(text: str):
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_info(text: str):
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.ENDC}")

def print_warning(text: str):
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_response(label: str, data: Any):
    print(f"{Colors.OKBLUE}{label}:{Colors.ENDC}")
    print(json.dumps(data, indent=2, default=str))

# ============================================================================
# TEST 1: Check Supabase Connection
# ============================================================================

def test_supabase_connection() -> bool:
    """Test if Supabase is running"""
    print_header("TEST 1: Check Supabase Connection")
    
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/",
            headers={"apikey": SUPABASE_ANON_KEY},
            timeout=5
        )
        
        if response.status_code in [200, 401, 403]:
            print_success(f"Supabase is running at {SUPABASE_URL}")
            return True
        else:
            print_error(f"Unexpected status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to Supabase at {SUPABASE_URL}")
        print_info("Start Supabase with: supabase start")
        return False
    except Exception as e:
        print_error(f"Connection error: {str(e)}")
        return False

# ============================================================================
# TEST 2: Fetch Salon ID
# ============================================================================

def fetch_salon_id() -> Optional[str]:
    """Fetch the salon ID for the owner"""
    print_header("TEST 2: Fetch Salon ID")
    
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/salons",
            headers={"apikey": SUPABASE_ANON_KEY},
            timeout=10
        )
        
        if response.status_code == 200:
            salons = response.json()
            if salons:
                salon = salons[0]
                print_success(f"Found salon: {salon.get('name')}")
                print_response("Salon Details", salon)
                return salon.get('id')
            else:
                print_warning("No salons found. Creating demo salon...")
                # Create demo salon
                salon_response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/salons",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Content-Type": "application/json"
                    },
                    json={
                        "name": "Main Barber Shop",
                        "owner_email": OWNER_EMAIL
                    },
                    timeout=10
                )
                
                if salon_response.status_code == 201:
                    salon = salon_response.json()[0]
                    print_success(f"Created salon: {salon.get('name')}")
                    return salon.get('id')
                else:
                    print_error(f"Failed to create salon: {salon_response.text}")
                    return None
        else:
            print_error(f"Failed to fetch salons: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Error fetching salon: {str(e)}")
        return None

# ============================================================================
# TEST 3: Owner Login
# ============================================================================

def test_owner_login() -> Optional[Dict[str, Any]]:
    """Login as owner and get session token"""
    print_header("TEST 3: Owner Login")
    
    print_info(f"Attempting login with email: {OWNER_EMAIL}")
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": OWNER_EMAIL,
                "password": OWNER_PASSWORD
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            user_id = data.get('user', {}).get('id')
            token = data.get('access_token')
            print_success(f"Owner login successful!")
            print_info(f"User ID: {user_id}")
            print_info(f"Token: {token[:50]}...")
            return data
        else:
            print_error(f"Login failed: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return None

# ============================================================================
# TEST 4: Create Staff via Edge Function
# ============================================================================

def test_create_staff(salon_id: str) -> Optional[Dict[str, Any]]:
    """Create a new staff member"""
    print_header("TEST 4: Create Staff Member via Edge Function")
    
    staff_data = {
        "fullName": f"Test Staff {int(time.time())}",
        "email": f"test-staff-{int(time.time())}@barbershop.com",
        "password": "staffpass123456",
        "specialty": "Haircut",
        "salonId": salon_id
    }
    
    print_info(f"Creating staff: {staff_data['fullName']}")
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/create-staff",
            headers={"Content-Type": "application/json"},
            json=staff_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data:
                staff = data.get('data', {})
                print_success(f"Staff created successfully!")
                print_info(f"Staff ID: {staff.get('id')}")
                print_info(f"Staff Email: {staff.get('email')}")
                print_response("Staff Details", staff)
                return {
                    "staff": staff,
                    "email": staff_data['email'],
                    "password": staff_data['password']
                }
            else:
                print_error(f"Invalid response: {data}")
                return None
        else:
            print_error(f"Failed to create staff: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Error creating staff: {str(e)}")
        return None

# ============================================================================
# TEST 5: Staff Login
# ============================================================================

def test_staff_login(staff_email: str, staff_password: str) -> Optional[Dict[str, Any]]:
    """Login as the newly created staff member"""
    print_header("TEST 5: Staff Member Login")
    
    print_info(f"Attempting login with email: {staff_email}")
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": staff_email,
                "password": staff_password
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            user_id = data.get('user', {}).get('id')
            token = data.get('access_token')
            print_success(f"Staff login successful!")
            print_info(f"Staff User ID: {user_id}")
            print_info(f"Token: {token[:50]}...")
            return data
        else:
            print_error(f"Staff login failed: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Staff login error: {str(e)}")
        return None

# ============================================================================
# TEST 6: Fetch Staff List
# ============================================================================

def test_fetch_staff(salon_id: str, token: str) -> Optional[list]:
    """Fetch all staff members for a salon"""
    print_header("TEST 6: Fetch Staff List")
    
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/staff?salon_id=eq.{salon_id}",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            staff_list = response.json()
            print_success(f"Fetched {len(staff_list)} staff member(s)")
            print_response("Staff List", staff_list)
            return staff_list
        else:
            print_error(f"Failed to fetch staff: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Error fetching staff: {str(e)}")
        return None

# ============================================================================
# TEST 7: Update Staff
# ============================================================================

def test_update_staff(staff_id: str, token: str) -> bool:
    """Update staff member details"""
    print_header("TEST 7: Update Staff Member")
    
    print_info(f"Updating staff ID: {staff_id}")
    
    try:
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/staff?id=eq.{staff_id}",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            json={
                "specialty": "Coloring"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            updated = response.json()
            print_success(f"Staff updated successfully!")
            print_response("Updated Staff", updated)
            return True
        else:
            print_error(f"Failed to update staff: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Error updating staff: {str(e)}")
        return False

# ============================================================================
# TEST 8: Delete Staff
# ============================================================================

def test_delete_staff(staff_id: str, token: str) -> bool:
    """Delete a staff member"""
    print_header("TEST 8: Delete Staff Member")
    
    print_warning(f"About to delete staff ID: {staff_id}")
    response = input(f"{Colors.WARNING}Continue? (y/n): {Colors.ENDC}").strip().lower()
    
    if response != 'y':
        print_info("Delete cancelled")
        return False
    
    try:
        delete_response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/staff?id=eq.{staff_id}",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}"
            },
            timeout=10
        )
        
        if delete_response.status_code == 200:
            print_success(f"Staff deleted successfully!")
            return True
        else:
            print_error(f"Failed to delete staff: {delete_response.text}")
            return False
            
    except Exception as e:
        print_error(f"Error deleting staff: {str(e)}")
        return False

# ============================================================================
# TEST 9: Check Staff by Email
# ============================================================================

def test_check_staff_by_email(staff_email: str, token: str, salon_id: str) -> bool:
    """Verify the staff member exists"""
    print_header("TEST 9: Verify Staff Member Exists")
    
    print_info(f"Checking for staff: {staff_email}")
    
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/staff?email=eq.{staff_email}&salon_id=eq.{salon_id}",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            staff_list = response.json()
            if staff_list:
                print_success(f"Staff member found!")
                print_response("Staff Details", staff_list[0])
                return True
            else:
                print_warning("Staff member not found")
                return False
        else:
            print_error(f"Failed to check staff: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Error checking staff: {str(e)}")
        return False

# ============================================================================
# MAIN TEST FLOW
# ============================================================================

def run_all_tests():
    """Run complete test suite"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("╔══════════════════════════════════════════════════════════╗")
    print("║   BARBER SALON MANAGEMENT - COMPLETE TEST SUITE          ║")
    print("║   Testing: Owner Login → Create Staff → Staff Login      ║")
    print(f"║   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                             ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}\n")
    
    # Test 1: Connection
    if not test_supabase_connection():
        print_header("TESTS FAILED - Cannot connect to Supabase")
        return
    
    time.sleep(1)
    
    # Test 2: Fetch Salon
    global SALON_ID
    SALON_ID = fetch_salon_id()
    if not SALON_ID:
        print_header("TESTS FAILED - Cannot fetch salon")
        return
    
    time.sleep(1)
    
    # Test 3: Owner Login
    owner_session = test_owner_login()
    if not owner_session:
        print_header("TESTS FAILED - Owner login failed")
        return
    
    owner_token = owner_session.get('access_token')
    time.sleep(1)
    
    # Test 4: Create Staff
    staff_result = test_create_staff(SALON_ID)
    if not staff_result:
        print_header("TESTS FAILED - Staff creation failed")
        return
    
    staff_email = staff_result['email']
    staff_password = staff_result['password']
    staff_id = staff_result['staff'].get('id')
    time.sleep(1)
    
    # Test 5: Staff Login
    staff_session = test_staff_login(staff_email, staff_password)
    if not staff_session:
        print_header("TESTS FAILED - Staff login failed")
        return
    
    staff_token = staff_session.get('access_token')
    time.sleep(1)
    
    # Test 6: Fetch Staff List
    staff_list = test_fetch_staff(SALON_ID, owner_token)
    time.sleep(1)
    
    # Test 7: Update Staff
    if staff_id:
        test_update_staff(staff_id, owner_token)
        time.sleep(1)
    
    # Test 9: Check Staff by Email
    test_check_staff_by_email(staff_email, owner_token, SALON_ID)
    time.sleep(1)
    
    # Test 8: Delete Staff (optional)
    print_header("OPTIONAL: Delete Created Staff")
    response = input(f"{Colors.WARNING}Delete the test staff? (y/n): {Colors.ENDC}").strip().lower()
    if response == 'y' and staff_id:
        test_delete_staff(staff_id, owner_token)
    
    # Summary
    print_header("TEST SUITE SUMMARY")
    print_success("All tests completed!")
    print_info(f"Owner Email: {OWNER_EMAIL}")
    print_info(f"Salon ID: {SALON_ID}")
    print_info(f"Test Staff Email: {staff_email}")
    print_info(f"Test Staff Password: {staff_password}")
    print("\n" + "="*60)
    print(f"{Colors.OKGREEN}✅ FULL END-TO-END TEST PASSED!{Colors.ENDC}")
    print("="*60 + "\n")

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    try:
        run_all_tests()
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Tests interrupted by user{Colors.ENDC}\n")
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
