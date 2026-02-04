#!/usr/bin/env python3
"""
Comprehensive API Test Suite for Barber Salon Management System
Tests all CRUD operations against local Supabase instance
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple

# Configuration
SUPABASE_URL = "http://localhost:54321"
SUPABASE_ANON_KEY = "REDACTED"

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.total = 0
        self.failures: list[str] = []
    
    def add_pass(self, test_name: str):
        self.passed += 1
        self.total += 1
        print(f"{Colors.GREEN}✓{Colors.END} {test_name}")
    
    def add_fail(self, test_name: str, error: str):
        self.failed += 1
        self.total += 1
        self.failures.append(f"{test_name}: {error}")
        print(f"{Colors.RED}✗{Colors.END} {test_name}: {error}")
    
    def print_summary(self):
        print("\n" + "="*60)
        print(f"{Colors.BOLD}TEST SUMMARY{Colors.END}")
        print("="*60)
        print(f"{Colors.GREEN}Passed: {self.passed}{Colors.END}")
        print(f"{Colors.RED}Failed: {self.failed}{Colors.END}")
        print(f"{Colors.BLUE}Total: {self.total}{Colors.END}")
        
        if self.failures:
            print(f"\n{Colors.RED}{Colors.BOLD}Failures:{Colors.END}")
            for failure in self.failures:
                print(f"  - {failure}")
        
        print()
        if self.failed == 0:
            print(f"{Colors.GREEN}{Colors.BOLD}🎉 All tests passed!{Colors.END}")
            return True
        else:
            print(f"{Colors.YELLOW}⚠️  Some tests failed.{Colors.END}")
            return False

class APIClient:
    def __init__(self, base_url: str, anon_key: str):
        self.base_url = base_url
        self.headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
            "Content-Type": "application/json",
        }
    
    def get(self, endpoint: str, params: Dict = None) -> Tuple[bool, Any]:
        """GET request"""
        try:
            url = f"{self.base_url}/rest/v1{endpoint}"
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            if response.status_code in [200, 201]:
                return True, response.json()
            else:
                return False, response.text
        except Exception as e:
            return False, str(e)
    
    def post(self, endpoint: str, data: Dict) -> Tuple[bool, Any]:
        """POST request"""
        try:
            url = f"{self.base_url}/rest/v1{endpoint}"
            response = requests.post(url, headers=self.headers, json=data, timeout=10)
            if response.status_code in [200, 201]:
                return True, response.json()
            else:
                return False, response.text
        except Exception as e:
            return False, str(e)
    
    def patch(self, endpoint: str, data: Dict) -> Tuple[bool, Any]:
        """PATCH request"""
        try:
            url = f"{self.base_url}/rest/v1{endpoint}"
            response = requests.patch(url, headers=self.headers, json=data, timeout=10)
            if response.status_code in [200, 201]:
                return True, response.json()
            else:
                return False, response.text
        except Exception as e:
            return False, str(e)
    
    def delete(self, endpoint: str) -> Tuple[bool, Any]:
        """DELETE request"""
        try:
            url = f"{self.base_url}/rest/v1{endpoint}"
            response = requests.delete(url, headers=self.headers, timeout=10)
            if response.status_code in [200, 201, 204]:
                try:
                    return True, response.json()
                except:
                    return True, {"message": "Deleted successfully"}
            else:
                return False, response.text
        except Exception as e:
            return False, str(e)

def print_header(title: str):
    """Print a formatted header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title.center(60)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def test_connection(client: APIClient, results: TestResults) -> bool:
    """Test connection to Supabase"""
    print_header("Connection Test")
    
    success, response = client.get("/salons?limit=1")
    if success:
        results.add_pass("Supabase Connection")
        return True
    else:
        results.add_fail("Supabase Connection", f"Cannot connect to {SUPABASE_URL}")
        return False

def test_salons(client: APIClient, results: TestResults) -> Optional[str]:
    """Test Salons CRUD operations"""
    print_header("Salons CRUD Tests")
    
    salon_id = None
    
    # CREATE
    salon_data = {
        "name": f"Test Salon {datetime.now().timestamp()}",
        "slug": f"test-salon-{datetime.now().timestamp()}",
        "owner_email": "owner@testbarber.com",
        "is_active": True
    }
    
    success, response = client.post("/salons", salon_data)
    if success and isinstance(response, list) and len(response) > 0:
        salon_id = response[0].get("id")
        results.add_pass(f"Create Salon (ID: {salon_id})")
    else:
        results.add_fail("Create Salon", str(response))
        return None
    
    # READ ALL
    success, response = client.get("/salons")
    if success and isinstance(response, list):
        results.add_pass(f"Read All Salons ({len(response)} found)")
    else:
        results.add_fail("Read All Salons", str(response))
    
    # READ SINGLE
    success, response = client.get(f"/salons?id=eq.{salon_id}")
    if success and isinstance(response, list) and len(response) > 0:
        results.add_pass("Read Single Salon")
    else:
        results.add_fail("Read Single Salon", str(response))
    
    # UPDATE
    update_data = {"name": f"Updated Salon {datetime.now().timestamp()}"}
    success, response = client.patch(f"/salons?id=eq.{salon_id}", update_data)
    if success:
        results.add_pass("Update Salon")
    else:
        results.add_fail("Update Salon", str(response))
    
    return salon_id

def test_services(client: APIClient, results: TestResults, salon_id: str) -> Optional[str]:
    """Test Services CRUD operations"""
    print_header("Services CRUD Tests")
    
    service_id = None
    
    # CREATE
    service_data = {
        "salon_id": salon_id,
        "name": f"Haircut - {datetime.now().timestamp()}",
        "description": "Professional haircut service",
        "price": 35.00,
        "duration": 30,
        "is_active": True
    }
    
    success, response = client.post("/services", service_data)
    if success and isinstance(response, list) and len(response) > 0:
        service_id = response[0].get("id")
        results.add_pass(f"Create Service (ID: {service_id})")
    else:
        results.add_fail("Create Service", str(response))
        return None
    
    # READ ALL
    success, response = client.get(f"/services?salon_id=eq.{salon_id}")
    if success and isinstance(response, list):
        results.add_pass(f"Read Services for Salon ({len(response)} found)")
    else:
        results.add_fail("Read Services", str(response))
    
    # READ SINGLE
    success, response = client.get(f"/services?id=eq.{service_id}")
    if success and isinstance(response, list) and len(response) > 0:
        results.add_pass("Read Single Service")
    else:
        results.add_fail("Read Single Service", str(response))
    
    # UPDATE
    update_data = {"name": f"Premium Haircut - {datetime.now().timestamp()}", "price": 45.00}
    success, response = client.patch(f"/services?id=eq.{service_id}", update_data)
    if success:
        results.add_pass("Update Service")
    else:
        results.add_fail("Update Service", str(response))
    
    return service_id

def test_staff(client: APIClient, results: TestResults, salon_id: str) -> Optional[str]:
    """Test Staff CRUD operations"""
    print_header("Staff CRUD Tests")
    
    staff_id = None
    
    # CREATE
    staff_data = {
        "full_name": f"John Barber {datetime.now().timestamp()}",
        "email": f"barber{datetime.now().timestamp()}@testbarber.com",
        "specialty": "Haircut & Beard Trim",
        "salon_id": salon_id,
        "role": "staff",
        "status": "Active"
    }
    
    success, response = client.post("/staff", staff_data)
    if success and isinstance(response, list) and len(response) > 0:
        staff_id = response[0].get("id")
        results.add_pass(f"Create Staff (ID: {staff_id})")
    else:
        results.add_fail("Create Staff", str(response))
        return None
    
    # READ ALL
    success, response = client.get(f"/staff?salon_id=eq.{salon_id}")
    if success and isinstance(response, list):
        results.add_pass(f"Read Staff for Salon ({len(response)} found)")
    else:
        results.add_fail("Read Staff", str(response))
    
    # READ SINGLE
    success, response = client.get(f"/staff?id=eq.{staff_id}")
    if success and isinstance(response, list) and len(response) > 0:
        results.add_pass("Read Single Staff")
    else:
        results.add_fail("Read Single Staff", str(response))
    
    # UPDATE
    update_data = {"specialty": "Master Barber & Colorist", "status": "Active"}
    success, response = client.patch(f"/staff?id=eq.{staff_id}", update_data)
    if success:
        results.add_pass("Update Staff")
    else:
        results.add_fail("Update Staff", str(response))
    
    return staff_id

def test_appointments(client: APIClient, results: TestResults, salon_id: str, staff_id: Optional[str], service_id: Optional[str]):
    """Test Appointments CRUD operations"""
    print_header("Appointments CRUD Tests")
    
    appointment_id = None
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # CREATE
    appointment_data = {
        "salon_id": salon_id,
        "staff_id": staff_id,
        "service_id": service_id,
        "customer_name": f"Test Customer {datetime.now().timestamp()}",
        "customer_email": "customer@test.com",
        "customer_phone": "+1234567890",
        "appointment_date": tomorrow,
        "appointment_time": "14:00:00",
        "status": "Pending",
        "amount": 35.00,
        "notes": "Test appointment"
    }
    
    success, response = client.post("/appointments", appointment_data)
    if success and isinstance(response, list) and len(response) > 0:
        appointment_id = response[0].get("id")
        results.add_pass(f"Create Appointment (ID: {appointment_id})")
    else:
        results.add_fail("Create Appointment", str(response))
        return
    
    # READ ALL
    success, response = client.get(f"/appointments?salon_id=eq.{salon_id}")
    if success and isinstance(response, list):
        results.add_pass(f"Read Appointments for Salon ({len(response)} found)")
    else:
        results.add_fail("Read Appointments", str(response))
    
    # READ SINGLE WITH RELATIONS
    success, response = client.get(
        f"/appointments?id=eq.{appointment_id}&select=*,service:services(*),staff:staff(*)"
    )
    if success and isinstance(response, list) and len(response) > 0:
        results.add_pass("Read Single Appointment with Relations")
    else:
        results.add_fail("Read Appointment with Relations", str(response))
    
    # UPDATE STATUS
    update_data = {"status": "Confirmed"}
    success, response = client.patch(f"/appointments?id=eq.{appointment_id}", update_data)
    if success:
        results.add_pass("Update Appointment Status")
    else:
        results.add_fail("Update Appointment Status", str(response))
    
    # DELETE APPOINTMENT
    success, response = client.delete(f"/appointments?id=eq.{appointment_id}")
    if success:
        results.add_pass("Delete Appointment")
    else:
        results.add_fail("Delete Appointment", str(response))

def test_data_validation(client: APIClient, results: TestResults, salon_id: str):
    """Test data validation and error handling"""
    print_header("Data Validation Tests")
    
    # Invalid appointment time format
    appointment_data = {
        "salon_id": salon_id,
        "customer_name": "Test",
        "appointment_date": "2025-02-05",
        "appointment_time": "invalid-time",  # Invalid format
        "amount": 30.00
    }
    
    success, response = client.post("/appointments", appointment_data)
    if not success or (isinstance(response, str) and "error" in response.lower()):
        results.add_pass("Invalid Time Format Validation")
    else:
        results.add_fail("Invalid Time Format Validation", "Should have rejected invalid time")
    
    # Missing required fields
    service_data = {
        "salon_id": salon_id,
        "name": "Test Service"
        # Missing required fields like price, duration
    }
    
    success, response = client.post("/services", service_data)
    if not success or (isinstance(response, str) and "error" in response.lower()):
        results.add_pass("Missing Required Fields Validation")
    else:
        results.add_fail("Missing Required Fields Validation", "Should have rejected missing fields")

def cleanup(client: APIClient, results: TestResults, salon_id: str):
    """Clean up test data"""
    print_header("Cleanup")
    
    # Delete all services for salon
    success, response = client.get(f"/services?salon_id=eq.{salon_id}")
    if success and isinstance(response, list):
        for service in response:
            client.delete(f"/services?id=eq.{service['id']}")
        results.add_pass(f"Cleaned up {len(response)} services")
    
    # Delete all staff for salon
    success, response = client.get(f"/staff?salon_id=eq.{salon_id}")
    if success and isinstance(response, list):
        for staff in response:
            client.delete(f"/staff?id=eq.{staff['id']}")
        results.add_pass(f"Cleaned up {len(response)} staff")
    
    # Delete all appointments for salon
    success, response = client.get(f"/appointments?salon_id=eq.{salon_id}")
    if success and isinstance(response, list):
        for appointment in response:
            client.delete(f"/appointments?id=eq.{appointment['id']}")
        results.add_pass(f"Cleaned up {len(response)} appointments")

def main():
    """Run all tests"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║  BARBER SALON MANAGEMENT - COMPREHENSIVE API TEST SUITE   ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}\n")
    
    client = APIClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    results = TestResults()
    
    # Test connection
    if not test_connection(client, results):
        print(f"\n{Colors.RED}Cannot connect to Supabase. Make sure containers are running.{Colors.END}")
        return False
    
    # Run all tests
    salon_id = test_salons(client, results)
    if salon_id:
        service_id = test_services(client, results, salon_id)
        staff_id = test_staff(client, results, salon_id)
        test_appointments(client, results, salon_id, staff_id, service_id)
        test_data_validation(client, results, salon_id)
        cleanup(client, results, salon_id)
    
    # Print summary and return status
    return results.print_summary()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
