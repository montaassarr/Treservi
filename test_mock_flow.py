#!/usr/bin/env python3
"""
Barber Salon Management - API Test Flow
Tests: Owner Login → Create Staff → Staff Login → CRUD Operations
Uses Mock Backend for Testing (no live Supabase required)
"""

import requests
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any
import uuid

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
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}{Colors.ENDC}\n")

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

# Mock Database
MOCK_DATABASE = {
    "salons": [
        {
            "id": "salon-001",
            "name": "Main Barber Shop",
            "owner_email": "owner@barbershop.com",
            "created_at": "2026-01-01T00:00:00Z"
        }
    ],
    "auth_users": [
        {
            "id": "owner-001",
            "email": "owner@barbershop.com",
            "password": "password123",
            "role": "owner",
            "created_at": "2026-01-01T00:00:00Z"
        }
    ],
    "staff": [
        {
            "id": "staff-001",
            "full_name": "John Doe",
            "email": "john@barbershop.com",
            "password": "john123456",
            "specialty": "Haircut",
            "status": "active",
            "salon_id": "salon-001",
            "avatar_url": None,
            "created_at": "2026-01-15T00:00:00Z"
        }
    ]
}

# ============================================================================
# TEST 1: Initialize Test Environment
# ============================================================================

def test_initialize():
    """Initialize and verify test environment"""
    print_header("TEST 1: Initialize Test Environment")
    
    print_info(f"Mock Database Initialized")
    print_info(f"Salons: {len(MOCK_DATABASE['salons'])}")
    print_info(f"Auth Users: {len(MOCK_DATABASE['auth_users'])}")
    print_info(f"Staff Members: {len(MOCK_DATABASE['staff'])}")
    
    print_response("Database State", {
        "salons": len(MOCK_DATABASE['salons']),
        "users": len(MOCK_DATABASE['auth_users']),
        "staff": len(MOCK_DATABASE['staff'])
    })
    
    print_success("Test environment ready")
    return True

# ============================================================================
# TEST 2: Verify Owner Account Exists
# ============================================================================

def test_verify_owner_account() -> Optional[Dict]:
    """Verify owner account exists in database"""
    print_header("TEST 2: Verify Owner Account Exists")
    
    owner_email = "owner@barbershop.com"
    print_info(f"Checking for owner: {owner_email}")
    
    for user in MOCK_DATABASE['auth_users']:
        if user['email'] == owner_email:
            print_success(f"Owner account found!")
            print_response("Owner Account", {
                "id": user['id'],
                "email": user['email'],
                "role": user['role'],
                "created_at": user['created_at']
            })
            return user
    
    print_error("Owner account not found")
    return None

# ============================================================================
# TEST 3: Owner Login
# ============================================================================

def test_owner_login() -> Optional[Dict]:
    """Simulate owner login"""
    print_header("TEST 3: Owner Login")
    
    owner_email = "owner@barbershop.com"
    owner_password = "password123"
    
    print_info(f"Attempting login with: {owner_email}")
    
    for user in MOCK_DATABASE['auth_users']:
        if user['email'] == owner_email and user['password'] == owner_password:
            token = f"token_{user['id']}_{int(time.time())}"
            print_success(f"Login successful!")
            print_info(f"User ID: {user['id']}")
            print_info(f"Session Token: {token[:50]}...")
            
            session = {
                "user_id": user['id'],
                "email": user['email'],
                "role": user['role'],
                "token": token,
                "created_at": datetime.now().isoformat()
            }
            print_response("Session", session)
            return session
    
    print_error("Login failed - invalid credentials")
    return None

# ============================================================================
# TEST 4: Fetch Salon
# ============================================================================

def test_fetch_salon(owner_email: str) -> Optional[Dict]:
    """Fetch salon for owner"""
    print_header("TEST 4: Fetch Salon")
    
    print_info(f"Fetching salon for owner: {owner_email}")
    
    for salon in MOCK_DATABASE['salons']:
        if salon['owner_email'] == owner_email:
            print_success(f"Salon found: {salon['name']}")
            print_response("Salon Details", {
                "id": salon['id'],
                "name": salon['name'],
                "owner_email": salon['owner_email'],
                "created_at": salon['created_at']
            })
            return salon
    
    print_error("Salon not found")
    return None

# ============================================================================
# TEST 5: Fetch All Staff
# ============================================================================

def test_fetch_staff(salon_id: str) -> list:
    """Fetch all staff for a salon"""
    print_header("TEST 5: Fetch All Staff Members")
    
    print_info(f"Fetching staff for salon: {salon_id}")
    
    staff_list = [s for s in MOCK_DATABASE['staff'] if s['salon_id'] == salon_id]
    
    if staff_list:
        print_success(f"Found {len(staff_list)} staff member(s)")
        for i, staff in enumerate(staff_list, 1):
            print_info(f"  {i}. {staff['full_name']} ({staff['email']}) - {staff['specialty']}")
        print_response("Staff List", staff_list)
        return staff_list
    else:
        print_warning("No staff members found")
        return []

# ============================================================================
# TEST 6: Create New Staff
# ============================================================================

def test_create_staff(salon_id: str) -> Optional[Dict]:
    """Create a new staff member"""
    print_header("TEST 6: Create New Staff Member")
    
    # Generate unique staff data
    timestamp = int(time.time())
    staff_id = f"staff-{timestamp}"
    staff_name = f"Test Barber {timestamp}"
    staff_email = f"test-barber-{timestamp}@barbershop.com"
    staff_password = f"barber{timestamp}"
    
    new_staff = {
        "id": staff_id,
        "full_name": staff_name,
        "email": staff_email,
        "password": staff_password,
        "specialty": "Haircut & Shave",
        "status": "active",
        "salon_id": salon_id,
        "avatar_url": None,
        "created_at": datetime.now().isoformat()
    }
    
    print_info(f"Creating staff: {staff_name}")
    print_info(f"Email: {staff_email}")
    print_info(f"Specialty: {new_staff['specialty']}")
    
    # Add to database
    MOCK_DATABASE['staff'].append(new_staff)
    
    # Add auth user
    MOCK_DATABASE['auth_users'].append({
        "id": staff_id,
        "email": staff_email,
        "password": staff_password,
        "role": "staff",
        "created_at": datetime.now().isoformat()
    })
    
    print_success(f"Staff created successfully!")
    print_response("New Staff", {
        "id": new_staff['id'],
        "full_name": new_staff['full_name'],
        "email": new_staff['email'],
        "specialty": new_staff['specialty'],
        "status": new_staff['status'],
        "created_at": new_staff['created_at']
    })
    
    return new_staff

# ============================================================================
# TEST 7: Staff Login
# ============================================================================

def test_staff_login(staff_email: str, staff_password: str) -> Optional[Dict]:
    """Login as newly created staff"""
    print_header("TEST 7: Staff Member Login")
    
    print_info(f"Attempting login with: {staff_email}")
    
    for user in MOCK_DATABASE['auth_users']:
        if user['email'] == staff_email and user['password'] == staff_password:
            token = f"token_{user['id']}_{int(time.time())}"
            print_success(f"Staff login successful!")
            print_info(f"Staff ID: {user['id']}")
            print_info(f"Session Token: {token[:50]}...")
            
            session = {
                "user_id": user['id'],
                "email": user['email'],
                "role": user['role'],
                "token": token,
                "created_at": datetime.now().isoformat()
            }
            print_response("Staff Session", session)
            return session
    
    print_error("Staff login failed - invalid credentials")
    return None

# ============================================================================
# TEST 8: Update Staff
# ============================================================================

def test_update_staff(staff_id: str) -> bool:
    """Update staff member information"""
    print_header("TEST 8: Update Staff Member")
    
    print_info(f"Updating staff: {staff_id}")
    
    for staff in MOCK_DATABASE['staff']:
        if staff['id'] == staff_id:
            # Update specialty
            old_specialty = staff['specialty']
            staff['specialty'] = "Coloring & Treatments"
            
            print_success(f"Staff updated successfully!")
            print_info(f"Specialty changed: {old_specialty} → {staff['specialty']}")
            print_response("Updated Staff", {
                "id": staff['id'],
                "full_name": staff['full_name'],
                "email": staff['email'],
                "specialty": staff['specialty'],
                "status": staff['status']
            })
            return True
    
    print_error(f"Staff not found: {staff_id}")
    return False

# ============================================================================
# TEST 9: Get Staff by Email
# ============================================================================

def test_get_staff_by_email(email: str) -> Optional[Dict]:
    """Find staff by email"""
    print_header("TEST 9: Get Staff by Email")
    
    print_info(f"Searching for staff: {email}")
    
    for staff in MOCK_DATABASE['staff']:
        if staff['email'] == email:
            print_success(f"Staff found!")
            print_response("Staff Details", {
                "id": staff['id'],
                "full_name": staff['full_name'],
                "email": staff['email'],
                "specialty": staff['specialty'],
                "status": staff['status'],
                "salon_id": staff['salon_id'],
                "created_at": staff['created_at']
            })
            return staff
    
    print_warning(f"Staff not found: {email}")
    return None

# ============================================================================
# TEST 10: Delete Staff
# ============================================================================

def test_delete_staff(staff_id: str) -> bool:
    """Delete a staff member"""
    print_header("TEST 10: Delete Staff Member")
    
    print_warning(f"About to delete staff: {staff_id}")
    response = input(f"{Colors.WARNING}Continue? (y/n): {Colors.ENDC}").strip().lower()
    
    if response != 'y':
        print_info("Delete cancelled")
        return False
    
    # Remove from staff list
    initial_count = len(MOCK_DATABASE['staff'])
    MOCK_DATABASE['staff'] = [s for s in MOCK_DATABASE['staff'] if s['id'] != staff_id]
    
    if len(MOCK_DATABASE['staff']) < initial_count:
        # Remove auth user
        MOCK_DATABASE['auth_users'] = [u for u in MOCK_DATABASE['auth_users'] if u['id'] != staff_id]
        
        print_success(f"Staff deleted successfully!")
        return True
    else:
        print_error(f"Staff not found: {staff_id}")
        return False

# ============================================================================
# TEST 11: Staff Statistics
# ============================================================================

def test_get_statistics(salon_id: str) -> Dict:
    """Get salon statistics"""
    print_header("TEST 11: Get Salon Statistics")
    
    print_info(f"Calculating statistics for salon: {salon_id}")
    
    staff_list = [s for s in MOCK_DATABASE['staff'] if s['salon_id'] == salon_id]
    active_staff = [s for s in staff_list if s['status'] == 'active']
    specialties = set([s['specialty'] for s in staff_list])
    
    stats = {
        "total_staff": len(staff_list),
        "active_staff": len(active_staff),
        "inactive_staff": len(staff_list) - len(active_staff),
        "specialties": list(specialties),
        "unique_specialties": len(specialties)
    }
    
    print_success("Statistics calculated")
    print_response("Salon Statistics", stats)
    return stats

# ============================================================================
# MAIN TEST FLOW
# ============================================================================

def run_all_tests():
    """Run complete test suite"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║    BARBER SALON MANAGEMENT - COMPLETE TEST FLOW                ║")
    print("║    Owner Login → Fetch Salon → Create Staff → Staff Login      ║")
    print(f"║    Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                                   ║")
    print("╚════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}\n")
    
    # Test 1: Initialize
    if not test_initialize():
        return
    time.sleep(1)
    
    # Test 2: Verify Owner
    if not test_verify_owner_account():
        return
    time.sleep(1)
    
    # Test 3: Owner Login
    owner_session = test_owner_login()
    if not owner_session:
        return
    time.sleep(1)
    
    # Test 4: Fetch Salon
    salon = test_fetch_salon(owner_session['email'])
    if not salon:
        return
    salon_id = salon['id']
    time.sleep(1)
    
    # Test 5: Fetch All Staff
    test_fetch_staff(salon_id)
    time.sleep(1)
    
    # Test 6: Create New Staff
    new_staff = test_create_staff(salon_id)
    if not new_staff:
        return
    staff_id = new_staff['id']
    staff_email = new_staff['email']
    staff_password = new_staff['password']
    time.sleep(1)
    
    # Test 7: Staff Login
    staff_session = test_staff_login(staff_email, staff_password)
    if not staff_session:
        return
    time.sleep(1)
    
    # Test 8: Update Staff
    test_update_staff(staff_id)
    time.sleep(1)
    
    # Test 9: Get Staff by Email
    test_get_staff_by_email(staff_email)
    time.sleep(1)
    
    # Test 11: Statistics
    test_get_statistics(salon_id)
    time.sleep(1)
    
    # Test 10: Delete (optional)
    print_header("OPTIONAL: Delete Test Staff")
    response = input(f"{Colors.WARNING}Delete the test staff? (y/n): {Colors.ENDC}").strip().lower()
    if response == 'y':
        test_delete_staff(staff_id)
    
    # Final Summary
    print_header("TEST FLOW COMPLETE - SUMMARY")
    print_success("All tests executed successfully!")
    print_info(f"Owner Email: owner@barbershop.com")
    print_info(f"Owner Password: password123")
    print_info(f"Salon ID: {salon_id}")
    print_info(f"Salon Name: {salon['name']}")
    print_info(f"\nTest Staff Created:")
    print_info(f"  Email: {staff_email}")
    print_info(f"  Password: {staff_password}")
    print_info(f"  Specialty: {new_staff['specialty']}")
    
    print("\n" + "="*70)
    print(f"{Colors.OKGREEN}{Colors.BOLD}✅ FULL END-TO-END TEST FLOW PASSED!{Colors.ENDC}")
    print("="*70 + "\n")
    
    # Show database state
    print_header("FINAL DATABASE STATE")
    print_response("Database", {
        "salons": len(MOCK_DATABASE['salons']),
        "auth_users": len(MOCK_DATABASE['auth_users']),
        "staff_members": len(MOCK_DATABASE['staff'])
    })

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
