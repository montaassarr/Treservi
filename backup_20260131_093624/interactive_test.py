#!/usr/bin/env python3
"""
Interactive Barber Salon Management Test Console
Allows manual testing of various operations with real-time feedback
"""

import json
import time
from datetime import datetime
from typing import Optional, Dict, Any

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

# Session State
CURRENT_USER = None
CURRENT_SESSION = None

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

# ============================================================================
# MENU SYSTEM
# ============================================================================

def show_main_menu():
    """Display main menu"""
    print(f"\n{Colors.BOLD}{Colors.OKCYAN}")
    print("╔════════════════════════════════════════╗")
    print("║    BARBER SALON MANAGEMENT CONSOLE     ║")
    print("╚════════════════════════════════════════╝")
    print(f"{Colors.ENDC}")
    
    if CURRENT_SESSION:
        print(f"{Colors.OKGREEN}✅ Logged in as: {CURRENT_SESSION['email']} ({CURRENT_SESSION['role']}){Colors.ENDC}\n")
        
        if CURRENT_SESSION['role'] == 'owner':
            print("OWNER MENU:")
            print("  1. View Salon Details")
            print("  2. View All Staff")
            print("  3. Create New Staff")
            print("  4. Update Staff")
            print("  5. Delete Staff")
            print("  6. View Statistics")
            print("  7. View Database State")
        else:
            print("STAFF MENU:")
            print("  1. View My Profile")
            print("  2. View My Salon")
            print("  3. View All Staff")
            print("  4. View Database State")
        
        print("  0. Logout")
    else:
        print("NOT LOGGED IN")
        print("  1. Login as Owner")
        print("  2. Login as Staff")
        print("  3. View Database State")
        print("  0. Exit")
    
    print()
    return input(f"{Colors.OKCYAN}Enter choice: {Colors.ENDC}").strip()

# ============================================================================
# AUTHENTICATION
# ============================================================================

def login_owner():
    """Login as owner"""
    print_header("Owner Login")
    
    email = input(f"{Colors.OKCYAN}Email [{Colors.OKGREEN}owner@barbershop.com{Colors.OKCYAN}]: {Colors.ENDC}").strip() or "owner@barbershop.com"
    password = input(f"{Colors.OKCYAN}Password [{Colors.OKGREEN}password123{Colors.OKCYAN}]: {Colors.ENDC}").strip() or "password123"
    
    for user in MOCK_DATABASE['auth_users']:
        if user['email'] == email and user['password'] == password and user['role'] == 'owner':
            global CURRENT_USER, CURRENT_SESSION
            CURRENT_USER = user
            CURRENT_SESSION = {
                "user_id": user['id'],
                "email": user['email'],
                "role": user['role'],
                "token": f"token_{user['id']}_{int(time.time())}",
                "created_at": datetime.now().isoformat()
            }
            print_success(f"Login successful! Welcome {email}")
            return True
    
    print_error("Invalid credentials")
    return False

def login_staff():
    """Login as staff"""
    print_header("Staff Login")
    
    email = input(f"{Colors.OKCYAN}Staff Email: {Colors.ENDC}").strip()
    password = input(f"{Colors.OKCYAN}Password: {Colors.ENDC}").strip()
    
    for user in MOCK_DATABASE['auth_users']:
        if user['email'] == email and user['password'] == password and user['role'] == 'staff':
            global CURRENT_USER, CURRENT_SESSION
            CURRENT_USER = user
            CURRENT_SESSION = {
                "user_id": user['id'],
                "email": user['email'],
                "role": user['role'],
                "token": f"token_{user['id']}_{int(time.time())}",
                "created_at": datetime.now().isoformat()
            }
            print_success(f"Login successful! Welcome {email}")
            return True
    
    print_error("Invalid credentials - Staff not found")
    return False

def logout():
    """Logout current user"""
    global CURRENT_USER, CURRENT_SESSION
    if CURRENT_SESSION:
        email = CURRENT_SESSION['email']
        CURRENT_USER = None
        CURRENT_SESSION = None
        print_success(f"Logged out from {email}")
    else:
        print_warning("Not logged in")

# ============================================================================
# OWNER OPERATIONS
# ============================================================================

def view_salon():
    """View salon details"""
    print_header("View Salon Details")
    
    # Find owner's salon
    for salon in MOCK_DATABASE['salons']:
        if salon['owner_email'] == CURRENT_SESSION['email']:
            print_response("Salon Details", salon)
            return
    
    print_error("Salon not found")

def view_all_staff():
    """View all staff in owner's salon"""
    print_header("View All Staff")
    
    # Find owner's salon
    salon_id = None
    for salon in MOCK_DATABASE['salons']:
        if salon['owner_email'] == CURRENT_SESSION['email']:
            salon_id = salon['id']
            break
    
    if not salon_id:
        print_error("Salon not found")
        return
    
    # Get staff for salon
    staff_list = [s for s in MOCK_DATABASE['staff'] if s['salon_id'] == salon_id]
    
    if staff_list:
        print_success(f"Found {len(staff_list)} staff member(s):\n")
        for i, staff in enumerate(staff_list, 1):
            print(f"{i}. {staff['full_name']}")
            print(f"   Email: {staff['email']}")
            print(f"   Specialty: {staff['specialty']}")
            print(f"   Status: {staff['status']}\n")
        
        print_response("Raw Data", staff_list)
    else:
        print_warning("No staff members found")

def create_staff():
    """Create new staff member"""
    print_header("Create New Staff Member")
    
    # Find owner's salon
    salon_id = None
    for salon in MOCK_DATABASE['salons']:
        if salon['owner_email'] == CURRENT_SESSION['email']:
            salon_id = salon['id']
            break
    
    if not salon_id:
        print_error("Salon not found")
        return
    
    # Get input
    full_name = input(f"{Colors.OKCYAN}Full Name: {Colors.ENDC}").strip()
    email = input(f"{Colors.OKCYAN}Email: {Colors.ENDC}").strip()
    specialty = input(f"{Colors.OKCYAN}Specialty: {Colors.ENDC}").strip()
    
    # Check if email exists
    for staff in MOCK_DATABASE['staff']:
        if staff['email'] == email:
            print_error("Email already exists")
            return
    
    # Generate password
    timestamp = int(time.time())
    password = f"staff{timestamp}"
    staff_id = f"staff-{timestamp}"
    
    # Create staff record
    new_staff = {
        "id": staff_id,
        "full_name": full_name,
        "email": email,
        "password": password,
        "specialty": specialty,
        "status": "active",
        "salon_id": salon_id,
        "avatar_url": None,
        "created_at": datetime.now().isoformat()
    }
    
    # Create auth user
    new_auth = {
        "id": staff_id,
        "email": email,
        "password": password,
        "role": "staff",
        "created_at": datetime.now().isoformat()
    }
    
    MOCK_DATABASE['staff'].append(new_staff)
    MOCK_DATABASE['auth_users'].append(new_auth)
    
    print_success(f"Staff created successfully!")
    print_info(f"Email: {email}")
    print_info(f"Password: {password}")
    print_response("New Staff", new_staff)

def update_staff():
    """Update staff member"""
    print_header("Update Staff Member")
    
    # Find owner's salon
    salon_id = None
    for salon in MOCK_DATABASE['salons']:
        if salon['owner_email'] == CURRENT_SESSION['email']:
            salon_id = salon['id']
            break
    
    if not salon_id:
        print_error("Salon not found")
        return
    
    # Get staff list
    staff_list = [s for s in MOCK_DATABASE['staff'] if s['salon_id'] == salon_id]
    
    if not staff_list:
        print_warning("No staff members found")
        return
    
    # Show options
    print("Select staff to update:")
    for i, staff in enumerate(staff_list, 1):
        print(f"  {i}. {staff['full_name']} ({staff['email']})")
    
    choice = input(f"{Colors.OKCYAN}Enter number: {Colors.ENDC}").strip()
    
    try:
        staff = staff_list[int(choice) - 1]
    except:
        print_error("Invalid choice")
        return
    
    # Update field
    print("\nWhat to update?")
    print("  1. Specialty")
    print("  2. Status")
    
    field_choice = input(f"{Colors.OKCYAN}Enter choice: {Colors.ENDC}").strip()
    
    if field_choice == "1":
        new_specialty = input(f"{Colors.OKCYAN}New Specialty: {Colors.ENDC}").strip()
        staff['specialty'] = new_specialty
        print_success(f"Specialty updated to: {new_specialty}")
    elif field_choice == "2":
        new_status = input(f"{Colors.OKCYAN}New Status (active/inactive): {Colors.ENDC}").strip()
        if new_status in ['active', 'inactive']:
            staff['status'] = new_status
            print_success(f"Status updated to: {new_status}")
        else:
            print_error("Invalid status")
    else:
        print_error("Invalid choice")

def delete_staff():
    """Delete staff member"""
    print_header("Delete Staff Member")
    
    # Find owner's salon
    salon_id = None
    for salon in MOCK_DATABASE['salons']:
        if salon['owner_email'] == CURRENT_SESSION['email']:
            salon_id = salon['id']
            break
    
    if not salon_id:
        print_error("Salon not found")
        return
    
    # Get staff list
    staff_list = [s for s in MOCK_DATABASE['staff'] if s['salon_id'] == salon_id]
    
    if not staff_list:
        print_warning("No staff members found")
        return
    
    # Show options
    print("Select staff to delete:")
    for i, staff in enumerate(staff_list, 1):
        print(f"  {i}. {staff['full_name']} ({staff['email']})")
    
    choice = input(f"{Colors.OKCYAN}Enter number: {Colors.ENDC}").strip()
    
    try:
        staff = staff_list[int(choice) - 1]
    except:
        print_error("Invalid choice")
        return
    
    # Confirm
    confirm = input(f"{Colors.WARNING}Delete {staff['full_name']}? (y/n): {Colors.ENDC}").strip().lower()
    
    if confirm == 'y':
        # Remove from staff
        MOCK_DATABASE['staff'] = [s for s in MOCK_DATABASE['staff'] if s['id'] != staff['id']]
        # Remove from auth
        MOCK_DATABASE['auth_users'] = [u for u in MOCK_DATABASE['auth_users'] if u['id'] != staff['id']]
        print_success(f"Staff deleted: {staff['full_name']}")
    else:
        print_info("Delete cancelled")

def view_statistics():
    """View salon statistics"""
    print_header("View Salon Statistics")
    
    # Find owner's salon
    salon_id = None
    for salon in MOCK_DATABASE['salons']:
        if salon['owner_email'] == CURRENT_SESSION['email']:
            salon_id = salon['id']
            break
    
    if not salon_id:
        print_error("Salon not found")
        return
    
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
    
    print_response("Statistics", stats)

# ============================================================================
# STAFF OPERATIONS
# ============================================================================

def view_my_profile():
    """View staff member's profile"""
    print_header("My Profile")
    
    # Find own profile
    for staff in MOCK_DATABASE['staff']:
        if staff['email'] == CURRENT_SESSION['email']:
            print_response("Your Profile", {
                "id": staff['id'],
                "name": staff['full_name'],
                "email": staff['email'],
                "specialty": staff['specialty'],
                "status": staff['status'],
                "created_at": staff['created_at']
            })
            return
    
    print_error("Profile not found")

def view_my_salon():
    """View staff member's salon"""
    print_header("My Salon")
    
    # Find own profile
    staff_record = None
    for staff in MOCK_DATABASE['staff']:
        if staff['email'] == CURRENT_SESSION['email']:
            staff_record = staff
            break
    
    if not staff_record:
        print_error("Staff record not found")
        return
    
    # Find salon
    for salon in MOCK_DATABASE['salons']:
        if salon['id'] == staff_record['salon_id']:
            print_response("Your Salon", salon)
            return
    
    print_error("Salon not found")

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def view_database():
    """View complete database state"""
    print_header("Database State")
    
    print_response("Database", {
        "salons": len(MOCK_DATABASE['salons']),
        "auth_users": len(MOCK_DATABASE['auth_users']),
        "staff_members": len(MOCK_DATABASE['staff'])
    })
    
    print(f"\n{Colors.OKBLUE}Salons:{Colors.ENDC}")
    for salon in MOCK_DATABASE['salons']:
        print(f"  - {salon['name']} (ID: {salon['id']})")
    
    print(f"\n{Colors.OKBLUE}Auth Users:{Colors.ENDC}")
    for user in MOCK_DATABASE['auth_users']:
        print(f"  - {user['email']} (Role: {user['role']})")
    
    print(f"\n{Colors.OKBLUE}Staff Members:{Colors.ENDC}")
    for staff in MOCK_DATABASE['staff']:
        print(f"  - {staff['full_name']} ({staff['email']}) - {staff['specialty']}")

# ============================================================================
# MAIN LOOP
# ============================================================================

def main():
    """Main application loop"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║    BARBER SALON MANAGEMENT - INTERACTIVE TEST CONSOLE          ║")
    print(f"║    Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                                ║")
    print("╚════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}")
    
    while True:
        try:
            choice = show_main_menu()
            
            if not CURRENT_SESSION:
                # Not logged in
                if choice == "1":
                    login_owner()
                elif choice == "2":
                    login_staff()
                elif choice == "3":
                    view_database()
                elif choice == "0":
                    print_info("Exiting...")
                    break
                else:
                    print_error("Invalid choice")
            else:
                # Logged in
                if CURRENT_SESSION['role'] == 'owner':
                    if choice == "1":
                        view_salon()
                    elif choice == "2":
                        view_all_staff()
                    elif choice == "3":
                        create_staff()
                    elif choice == "4":
                        update_staff()
                    elif choice == "5":
                        delete_staff()
                    elif choice == "6":
                        view_statistics()
                    elif choice == "7":
                        view_database()
                    elif choice == "0":
                        logout()
                    else:
                        print_error("Invalid choice")
                else:
                    if choice == "1":
                        view_my_profile()
                    elif choice == "2":
                        view_my_salon()
                    elif choice == "3":
                        view_all_staff()
                    elif choice == "4":
                        view_database()
                    elif choice == "0":
                        logout()
                    else:
                        print_error("Invalid choice")
        
        except KeyboardInterrupt:
            print(f"\n{Colors.WARNING}Interrupted{Colors.ENDC}")
            break
        except Exception as e:
            print_error(f"Error: {str(e)}")
        
        input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Application terminated by user{Colors.ENDC}\n")
    except Exception as e:
        print_error(f"Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
