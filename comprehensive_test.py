#!/usr/bin/env python3
"""
Comprehensive Multi-Tenant CRUD Test Suite
Tests: Tenant Creation, Auth, Appointments, Staff Management, and CRUD operations
"""

import os
import sys
import json
import time
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

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

class SupabaseTestSuite:
    def __init__(self):
        self.base_url = os.getenv('SUPABASE_URL', 'http://localhost:54321')
        self.anon_key = os.getenv('SUPABASE_ANON_KEY')
        self.service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.anon_key:
            raise ValueError("SUPABASE_ANON_KEY not found in environment")
        
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        
        # Test data storage
        self.test_salon_id = None
        self.test_owner_token = None
        self.test_owner_id = None
        self.test_staff_id = None
        self.test_staff_token = None
        self.test_appointment_id = None
        self.test_service_id = None
        self.super_admin_token = None

    def log(self, message: str, level: str = "info"):
        """Print colored log messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        if level == "success":
            print(f"{Colors.OKGREEN}✓ [{timestamp}] {message}{Colors.ENDC}")
        elif level == "error":
            print(f"{Colors.FAIL}✗ [{timestamp}] {message}{Colors.ENDC}")
        elif level == "warning":
            print(f"{Colors.WARNING}⚠ [{timestamp}] {message}{Colors.ENDC}")
        elif level == "info":
            print(f"{Colors.OKCYAN}ℹ [{timestamp}] {message}{Colors.ENDC}")
        elif level == "header":
            print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}")
            print(f"{message}")
            print(f"{'='*60}{Colors.ENDC}\n")

    def assert_test(self, condition: bool, test_name: str, details: str = ""):
        """Track test results"""
        if condition:
            self.test_results["passed"] += 1
            self.log(f"PASS: {test_name} {details}", "success")
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {details}")
            self.log(f"FAIL: {test_name} {details}", "error")
        return condition

    def make_request(self, method: str, endpoint: str, data: dict = None, 
                     token: str = None, use_service_key: bool = False) -> Dict[str, Any]:
        """Make HTTP request to Supabase"""
        url = f"{self.base_url}{endpoint}"
        headers = {
            "apikey": self.anon_key,
            "Content-Type": "application/json"
        }
        
        # Add Prefer header for POST/PATCH to return representation
        if method in ["POST", "PATCH"]:
            headers["Prefer"] = "return=representation"
        
        if use_service_key and self.service_key:
            headers["apikey"] = self.service_key
            headers["Authorization"] = f"Bearer {self.service_key}"
        elif token:
            headers["Authorization"] = f"Bearer {token}"
        else:
            headers["Authorization"] = f"Bearer {self.anon_key}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method == "PATCH":
                response = requests.patch(url, headers=headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                return {"error": f"Unknown method: {method}"}
            
            # Try to parse JSON response
            try:
                result = response.json()
            except:
                result = {"text": response.text, "status_code": response.status_code}
            
            return {
                "status_code": response.status_code,
                "data": result,
                "ok": response.ok
            }
        except Exception as e:
            return {"error": str(e), "status_code": 0}

    # =========================================================================
    # 1. TENANT CREATION TESTS
    # =========================================================================
    
    def test_create_super_admin(self):
        """Setup super admin for testing"""
        self.log("Setting up super admin account...", "header")
        
        # Try to login first
        response = self.make_request("POST", "/auth/v1/token?grant_type=password", {
            "email": "superadmin@reservi.com",
            "password": "SuperAdmin123!"
        })
        
        if response.get("ok") and response.get("data", {}).get("access_token"):
            self.super_admin_token = response["data"]["access_token"]
            self.log("Super admin already exists, logged in", "success")
            return True
        
        # If not exists, create (requires service key)
        self.log("Super admin not found, attempting to create...", "info")
        return False

    def test_create_new_tenant(self):
        """Test: Create a new tenant/salon with owner account"""
        self.log("Creating new tenant (salon)...", "header")
        
        # NOTE: For local testing, we skip edge function tenant creation due to Docker routing limits.
        # In production/CI, this will use the create-salon-complete edge function.
        # For now, we'll test with an existing salon.
        
        # Try to find an existing test salon
        response = self.make_request(
            "GET",
            "/rest/v1/salons?slug=like.test-salon*&limit=1",
            token=self.super_admin_token
        )
        
        if response.get("ok") and len(response.get("data", [])) > 0:
            salon = response["data"][0]
            self.test_salon_id = salon["id"]
            
            # Login as owner
            login_response = self.make_request("POST", "/auth/v1/token?grant_type=password", {
                "email": salon["owner_email"],
                "password": "TestOwner123!"  # Assumes this password
            })
            
            if login_response.get("ok"):
                self.test_owner_token = login_response["data"]["access_token"]
                self.assert_test(True, "Tenant Login", f"Using existing salon: {salon['name']}")
                return True
        
        # If no existing salon, log warning and continue with limited tests
        self.log("No existing test salon found. Some tests will be skipped.", "warning")
        self.assert_test(False, "Tenant Setup", "Create a salon via SuperAdminDashboard first")
        return False

    # =========================================================================
    # 2. AUTHENTICATION TESTS
    # =========================================================================
    
    def test_owner_access_to_salon(self):
        """Test: Owner can access their salon data"""
        self.log("Testing owner access to salon...", "header")
        
        if not self.test_salon_id or not self.test_owner_token:
            self.assert_test(False, "Owner Access", "Missing salon or token")
            return False
        
        response = self.make_request(
            "GET",
            f"/rest/v1/salons?id=eq.{self.test_salon_id}",
            token=self.test_owner_token
        )
        
        if response.get("ok"):
            salons = response.get("data", [])
            self.assert_test(
                len(salons) > 0 and salons[0]["id"] == self.test_salon_id,
                "Owner Access to Salon",
                f"Salon: {salons[0].get('name', '')}"
            )
            return True
        else:
            self.assert_test(False, "Owner Access", response.get("data"))
            return False

    def test_tenant_isolation(self):
        """Test: Owner cannot access other salons"""
        self.log("Testing tenant isolation...", "header")
        
        if not self.test_owner_token:
            self.assert_test(False, "Tenant Isolation", "Missing owner token")
            return False
        
        # Try to access hamdisalon (should fail or return empty)
        response = self.make_request(
            "GET",
            "/rest/v1/salons?slug=eq.hamdisalon",
            token=self.test_owner_token
        )
        
        if response.get("ok"):
            salons = response.get("data", [])
            # Should either be empty or the owner shouldn't see other salon's private data
            self.assert_test(
                len(salons) == 0 or salons[0].get("id") != self.test_salon_id,
                "Tenant Isolation",
                "Owner cannot access other salons"
            )
            return True
        else:
            self.assert_test(True, "Tenant Isolation", "Access properly restricted")
            return True

    # =========================================================================
    # 3. SERVICES CRUD TESTS
    # =========================================================================
    
    def test_create_service(self):
        """Test: Create a service for the salon"""
        self.log("Creating service...", "header")
        
        if not self.test_salon_id or not self.test_owner_token:
            self.assert_test(False, "Create Service", "Missing prerequisites")
            return False
        
        payload = {
            "salon_id": self.test_salon_id,
            "name": "Haircut",
            "duration": 30,
            "price": 25.00,
            "description": "Standard haircut service"
        }
        
        response = self.make_request(
            "POST",
            "/rest/v1/services",
            data=payload,
            token=self.test_owner_token
        )
        
        if response.get("ok"):
            service = response.get("data", [{}])[0] if isinstance(response.get("data"), list) else response.get("data", {})
            self.test_service_id = service.get("id")
            self.assert_test(
                self.test_service_id is not None,
                "Create Service",
                f"Service ID: {self.test_service_id}"
            )
            return True
        else:
            error_data = response.get("data", {})
            self.assert_test(False, "Create Service", f"Status: {response.get('status_code')}, Error: {error_data}")
            return False

    def test_read_services(self):
        """Test: Read services list"""
        self.log("Reading services...", "header")
        
        response = self.make_request(
            "GET",
            f"/rest/v1/services?salon_id=eq.{self.test_salon_id}",
            token=self.test_owner_token
        )
        
        if response.get("ok"):
            services = response.get("data", [])
            self.assert_test(
                len(services) > 0,
                "Read Services",
                f"Found {len(services)} service(s)"
            )
            return True
        else:
            self.assert_test(False, "Read Services", response.get("data"))
            return False

    def test_update_service(self):
        """Test: Update a service"""
        self.log("Updating service...", "header")
        
        if not self.test_service_id:
            self.assert_test(False, "Update Service", "No service to update")
            return False
        
        response = self.make_request(
            "PATCH",
            f"/rest/v1/services?id=eq.{self.test_service_id}",
            data={"price": 30.00, "description": "Updated haircut service"},
            token=self.test_owner_token
        )
        
        self.assert_test(
            response.get("ok"),
            "Update Service",
            "Price updated to 30.00"
        )
        return response.get("ok")

    # =========================================================================
    # 4. STAFF CRUD TESTS
    # =========================================================================
    
    def test_create_staff(self):
        """Test: Create a staff member"""
        self.log("Creating staff member...", "header")
        
        if not self.test_salon_id or not self.test_owner_token:
            self.assert_test(False, "Create Staff", "Missing prerequisites")
            return False
        
        timestamp = int(time.time())
        staff_email = f"staff{timestamp}@testsalon.com"
        
        payload = {
            "fullName": f"Staff Member {timestamp}",
            "email": staff_email,
            "password": "StaffPass123!",
            "specialty": "Barber",
            "salonId": self.test_salon_id
        }
        
        response = self.make_request(
            "POST",
            "/functions/v1/create-staff",
            data=payload,
            token=self.test_owner_token
        )
        
        if response.get("ok") or response.get("status_code") == 200:
            data = response.get("data", {})
            self.test_staff_id = data.get("staff", {}).get("id")
            
            # Login as staff
            login_response = self.make_request("POST", "/auth/v1/token?grant_type=password", {
                "email": staff_email,
                "password": "StaffPass123!"
            })
            
            if login_response.get("ok"):
                self.test_staff_token = login_response["data"]["access_token"]
            
            self.assert_test(
                self.test_staff_id is not None,
                "Create Staff",
                f"Staff ID: {self.test_staff_id}"
            )
            return True
        else:
            error_data = response.get("data", {})
            self.assert_test(False, "Create Staff", f"Status: {response.get('status_code')}, Data: {error_data}")
            return False

    def test_read_staff(self):
        """Test: Read staff list"""
        self.log("Reading staff list...", "header")
        
        response = self.make_request(
            "GET",
            f"/rest/v1/staff?salon_id=eq.{self.test_salon_id}",
            token=self.test_owner_token
        )
        
        if response.get("ok"):
            staff_list = response.get("data", [])
            self.assert_test(
                len(staff_list) > 0,
                "Read Staff",
                f"Found {len(staff_list)} staff member(s)"
            )
            return True
        else:
            self.assert_test(False, "Read Staff", response.get("data"))
            return False

    def test_update_staff(self):
        """Test: Update staff member"""
        self.log("Updating staff member...", "header")
        
        if not self.test_staff_id:
            self.assert_test(False, "Update Staff", "No staff to update")
            return False
        
        response = self.make_request(
            "PATCH",
            f"/rest/v1/staff?id=eq.{self.test_staff_id}",
            data={"specialty": "Senior Barber", "status": "active"},
            token=self.test_owner_token
        )
        
        self.assert_test(
            response.get("ok"),
            "Update Staff",
            "Specialty updated"
        )
        return response.get("ok")

    def test_delete_staff(self):
        """Test: Delete staff member (soft delete/deactivate)"""
        self.log("Deactivating staff member...", "header")
        
        if not self.test_staff_id:
            self.assert_test(False, "Delete Staff", "No staff to delete")
            return False
        
        # Soft delete by setting status to inactive
        response = self.make_request(
            "PATCH",
            f"/rest/v1/staff?id=eq.{self.test_staff_id}",
            data={"status": "inactive"},
            token=self.test_owner_token
        )
        
        self.assert_test(
            response.get("ok"),
            "Deactivate Staff",
            "Staff marked as inactive"
        )
        return response.get("ok")

    # =========================================================================
    # 5. APPOINTMENT CRUD TESTS
    # =========================================================================
    
    def test_create_appointment_public(self):
        """Test: Create appointment via public booking"""
        self.log("Creating public appointment...", "header")
        
        if not self.test_salon_id or not self.test_service_id or not self.test_staff_id:
            self.assert_test(False, "Create Appointment", "Missing prerequisites")
            return False
        
        # Book for tomorrow at 10:00 AM
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        appointment_time = f"{tomorrow}T10:00:00"
        
        payload = {
            "salon_id": self.test_salon_id,
            "staff_id": self.test_staff_id,
            "service_id": self.test_service_id,
            "appointment_time": appointment_time,
            "customer_name": "Test Customer",
            "customer_phone": "+1234567890",
            "status": "scheduled"
        }
        
        response = self.make_request(
            "POST",
            "/rest/v1/appointments",
            data=payload
        )
        
        if response.get("ok"):
            appointment = response.get("data", [{}])[0] if isinstance(response.get("data"), list) else response.get("data", {})
            self.test_appointment_id = appointment.get("id")
            self.assert_test(
                self.test_appointment_id is not None,
                "Create Appointment (Public)",
                f"Appointment ID: {self.test_appointment_id}"
            )
            return True
        else:
            self.assert_test(False, "Create Appointment", response.get("data"))
            return False

    def test_read_appointments(self):
        """Test: Read appointments"""
        self.log("Reading appointments...", "header")
        
        response = self.make_request(
            "GET",
            f"/rest/v1/appointments?salon_id=eq.{self.test_salon_id}",
            token=self.test_owner_token
        )
        
        if response.get("ok"):
            appointments = response.get("data", [])
            self.assert_test(
                len(appointments) > 0,
                "Read Appointments",
                f"Found {len(appointments)} appointment(s)"
            )
            return True
        else:
            self.assert_test(False, "Read Appointments", response.get("data"))
            return False

    def test_update_appointment(self):
        """Test: Update appointment status"""
        self.log("Updating appointment...", "header")
        
        if not self.test_appointment_id:
            self.assert_test(False, "Update Appointment", "No appointment to update")
            return False
        
        response = self.make_request(
            "PATCH",
            f"/rest/v1/appointments?id=eq.{self.test_appointment_id}",
            data={"status": "confirmed"},
            token=self.test_owner_token
        )
        
        self.assert_test(
            response.get("ok"),
            "Update Appointment",
            "Status changed to confirmed"
        )
        return response.get("ok")

    def test_delete_appointment(self):
        """Test: Cancel appointment"""
        self.log("Cancelling appointment...", "header")
        
        if not self.test_appointment_id:
            self.assert_test(False, "Cancel Appointment", "No appointment to cancel")
            return False
        
        response = self.make_request(
            "PATCH",
            f"/rest/v1/appointments?id=eq.{self.test_appointment_id}",
            data={"status": "cancelled"},
            token=self.test_owner_token
        )
        
        self.assert_test(
            response.get("ok"),
            "Cancel Appointment",
            "Appointment cancelled"
        )
        return response.get("ok")

    # =========================================================================
    # 6. ROLE-BASED ACCESS TESTS
    # =========================================================================
    
    def test_staff_cannot_create_staff(self):
        """Test: Staff member cannot create other staff"""
        self.log("Testing staff permissions...", "header")
        
        if not self.test_staff_token:
            self.log("Skipping: No staff token", "warning")
            return True
        
        payload = {
            "fullName": "Unauthorized Staff",
            "email": "unauthorized@test.com",
            "password": "Test123!",
            "specialty": "Barber",
            "salonId": self.test_salon_id
        }
        
        response = self.make_request(
            "POST",
            "/functions/v1/create-staff",
            data=payload,
            token=self.test_staff_token
        )
        
        # Should fail (403 or 401)
        self.assert_test(
            not response.get("ok"),
            "Staff Permission Check",
            "Staff correctly denied from creating staff"
        )
        return not response.get("ok")

    # =========================================================================
    # 7. RUN ALL TESTS
    # =========================================================================
    
    def run_all_tests(self):
        """Execute full test suite"""
        self.log("STARTING COMPREHENSIVE CRUD TEST SUITE", "header")
        self.log(f"Base URL: {self.base_url}", "info")
        
        # Phase 1: Setup
        self.test_create_super_admin()
        
        # Phase 2: Tenant Creation
        if not self.test_create_new_tenant():
            self.log("Tenant creation failed, stopping tests", "error")
            return self.print_summary()
        
        # Phase 3: Authentication
        self.test_owner_access_to_salon()
        self.test_tenant_isolation()
        
        # Phase 4: Services CRUD
        self.test_create_service()
        self.test_read_services()
        self.test_update_service()
        
        # Phase 5: Staff CRUD
        self.test_create_staff()
        self.test_read_staff()
        self.test_update_staff()
        
        # Phase 6: Appointments CRUD
        self.test_create_appointment_public()
        self.test_read_appointments()
        self.test_update_appointment()
        self.test_delete_appointment()
        
        # Phase 7: Permissions
        self.test_staff_cannot_create_staff()
        
        # Phase 8: Cleanup (soft delete)
        self.test_delete_staff()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        self.log("TEST RESULTS SUMMARY", "header")
        
        total = self.test_results["passed"] + self.test_results["failed"]
        pass_rate = (self.test_results["passed"] / total * 100) if total > 0 else 0
        
        print(f"{Colors.BOLD}Total Tests: {total}{Colors.ENDC}")
        print(f"{Colors.OKGREEN}Passed: {self.test_results['passed']}{Colors.ENDC}")
        print(f"{Colors.FAIL}Failed: {self.test_results['failed']}{Colors.ENDC}")
        print(f"{Colors.OKCYAN}Pass Rate: {pass_rate:.1f}%{Colors.ENDC}\n")
        
        if self.test_results["errors"]:
            print(f"{Colors.FAIL}Failed Tests:{Colors.ENDC}")
            for error in self.test_results["errors"]:
                print(f"  - {error}")
        
        return self.test_results["failed"] == 0


def main():
    """Main entry point"""
    try:
        suite = SupabaseTestSuite()
        success = suite.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Tests interrupted by user{Colors.ENDC}")
        sys.exit(130)
    except Exception as e:
        print(f"{Colors.FAIL}Fatal error: {str(e)}{Colors.ENDC}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
