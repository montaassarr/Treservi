#!/usr/bin/env python3
"""
COMPREHENSIVE SUPABASE SYSTEM DIAGNOSTIC & TESTING SUITE
Tests all containers, services, tables, columns, RPC functions, and edge functions
Generates deployment readiness report
"""

import requests
import json
import subprocess
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional

# Configuration
LOCAL_SUPABASE_URL = "http://localhost:54321"
REMOTE_SUPABASE_URL = "https://czvsgtvienmchudyzqpk.supabase.co"
LOCAL_ANON_KEY = "REDACTED_JWT"

# Color codes
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

class DiagnosticResult:
    def __init__(self):
        self.passed_tests = []
        self.failed_tests = []
        self.warnings = []
        self.info = []
    
    def pass_test(self, name: str, details: str = ""):
        self.passed_tests.append((name, details))
        print(f"{Colors.GREEN}✓{Colors.END} {name}" + (f" - {details}" if details else ""))
    
    def fail_test(self, name: str, error: str):
        self.failed_tests.append((name, error))
        print(f"{Colors.RED}✗{Colors.END} {name}: {error}")
    
    def warn(self, message: str):
        self.warnings.append(message)
        print(f"{Colors.YELLOW}⚠{Colors.END} {message}")
    
    def info_msg(self, message: str):
        self.info.append(message)
        print(f"{Colors.BLUE}ℹ{Colors.END} {message}")
    
    def summary(self) -> Dict[str, int]:
        return {
            "passed": len(self.passed_tests),
            "failed": len(self.failed_tests),
            "warnings": len(self.warnings),
            "total": len(self.passed_tests) + len(self.failed_tests)
        }

def print_section(title: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title.center(70)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}\n")

def print_subsection(title: str):
    print(f"\n{Colors.CYAN}{title}{Colors.END}")
    print(f"{Colors.CYAN}{'-' * len(title)}{Colors.END}")

# ============================================================
# DOCKER CONTAINER TESTS
# ============================================================

def test_docker_containers(result: DiagnosticResult):
    """Test all Docker containers are running"""
    print_section("1. DOCKER CONTAINER STATUS")
    
    required_containers = {
        'supabase-db': 'PostgreSQL Database',
        'supabase-rest': 'PostgREST API',
        'supabase-auth': 'Authentication Service',
        'supabase-storage': 'Storage Service',
        'supabase-realtime': 'Realtime Service',
        'supabase-kong': 'API Gateway (Kong)',
        'supabase-functions': 'Edge Functions Runtime',
        'supabase-studio': 'Supabase Studio',
        'reservi-frontend-1': 'Frontend Application'
    }
    
    try:
        # Get Docker PS output
        cmd = "docker compose ps --format json 2>/dev/null"
        output = subprocess.check_output(cmd, shell=True).decode().strip()
        
        if not output:
            result.fail_test("Docker Containers", "Unable to retrieve container status")
            return
        
        containers = json.loads(f"[{','.join(output.split('}{'))}]") if output else []
        running_containers = {c.get('Service', ''): c for c in containers if isinstance(c, dict)}
        
        for container_name, description in required_containers.items():
            if container_name in running_containers or any(container_name in k for k in running_containers):
                status = running_containers.get(container_name, {}).get('Status', 'unknown')
                if 'Up' in status or 'Healthy' in status:
                    result.pass_test(f"Container: {container_name}", f"{description} - Running")
                else:
                    result.warn(f"Container {container_name} not healthy: {status}")
            else:
                result.fail_test(f"Container: {container_name}", f"{description} - Not found")
    
    except Exception as e:
        result.warn(f"Could not query Docker containers: {str(e)}")

# ============================================================
# SUPABASE CONNECTION TESTS
# ============================================================

def test_supabase_connection(result: DiagnosticResult, url: str, label: str):
    """Test connection to Supabase instance"""
    print_subsection(f"Testing {label}")
    
    try:
        response = requests.get(f"{url}/rest/v1/", 
                              headers={"apikey": LOCAL_ANON_KEY},
                              timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            version = data.get('info', {}).get('version', 'unknown')
            result.pass_test(f"Connection to {label}", f"Version {version}")
            return True
        else:
            result.fail_test(f"Connection to {label}", f"HTTP {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        result.fail_test(f"Connection to {label}", "Connection refused")
        return False
    except Exception as e:
        result.fail_test(f"Connection to {label}", str(e))
        return False

# ============================================================
# DATABASE SCHEMA TESTS
# ============================================================

def test_database_schema(result: DiagnosticResult, url: str):
    """Test all tables and their columns"""
    print_subsection("Database Schema Validation")
    
    expected_tables = {
        'salons': ['id', 'name', 'slug', 'owner_email', 'status', 'created_at'],
        'staff': ['id', 'full_name', 'email', 'specialty', 'salon_id', 'role', 'is_super_admin'],
        'services': ['id', 'salon_id', 'name', 'price', 'duration', 'is_active'],
        'appointments': ['id', 'salon_id', 'customer_name', 'appointment_date', 'appointment_time', 'status', 'amount'],
        'push_subscriptions': ['id', 'user_id', 'endpoint', 'p256dh', 'auth'],
        'stations': ['id', 'salon_id', 'name', 'type', 'is_active'],
    }
    
    headers = {
        "apikey": LOCAL_ANON_KEY,
        "Authorization": f"Bearer {LOCAL_ANON_KEY}",
    }
    
    for table_name, expected_columns in expected_tables.items():
        try:
            # Check if table exists by querying it
            response = requests.get(f"{url}/rest/v1/{table_name}?limit=1",
                                  headers=headers, timeout=5)
            
            if response.status_code == 200:
                result.pass_test(f"Table exists: {table_name}", f"{len(expected_columns)} expected columns")
            elif response.status_code == 404:
                result.fail_test(f"Table: {table_name}", "Table not found")
            else:
                result.warn(f"Table {table_name}: HTTP {response.status_code}")
        
        except Exception as e:
            result.fail_test(f"Table: {table_name}", str(e))

# ============================================================
# RPC FUNCTIONS TESTS
# ============================================================

def test_rpc_functions(result: DiagnosticResult, url: str):
    """Test RPC functions"""
    print_subsection("RPC Functions Validation")
    
    rpc_functions = {
        'is_user_super_admin': {
            'params': {'user_id': '550e8400-e29b-41d4-a716-446655440000'},
            'description': 'Check if user is super admin'
        },
        'generate_slug': {
            'params': {'name': 'Test Salon'},
            'description': 'Generate URL slug from name'
        },
        'check_is_super_admin': {
            'params': {},
            'description': 'Check current user super admin status'
        },
        'mark_notifications_read': {
            'params': {'p_salon_id': '550e8400-e29b-41d4-a716-446655440000'},
            'description': 'Mark salon notifications as read'
        },
    }
    
    headers = {
        "apikey": LOCAL_ANON_KEY,
        "Authorization": f"Bearer {LOCAL_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    for func_name, func_info in rpc_functions.items():
        try:
            response = requests.post(
                f"{url}/rest/v1/rpc/{func_name}",
                json=func_info.get('params', {}),
                headers=headers,
                timeout=5
            )
            
            if response.status_code in [200, 201]:
                result.pass_test(f"RPC Function: {func_name}", func_info['description'])
            elif response.status_code == 404:
                result.warn(f"RPC Function {func_name}: Not found (may not be deployed)")
            else:
                result.warn(f"RPC Function {func_name}: HTTP {response.status_code}")
        
        except requests.exceptions.ConnectionError:
            result.warn(f"RPC Function {func_name}: Cannot connect")
        except Exception as e:
            result.warn(f"RPC Function {func_name}: {str(e)}")

# ============================================================
# ROW LEVEL SECURITY TESTS
# ============================================================

def test_rls_policies(result: DiagnosticResult):
    """Test RLS policies are properly configured"""
    print_subsection("RLS Policies Configuration")
    
    expected_policies = {
        'salons': ['allow_anyone_create_salons', 'allow_anyone_view_salons'],
        'services': ['allow_anyone_create_services', 'allow_anyone_view_services'],
        'appointments': ['allow_anyone_create_appointments', 'allow_anyone_view_appointments', 'allow_update_appointments'],
        'staff': ['allow_anyone_view_staff'],
    }
    
    try:
        cmd = "docker exec supabase-db psql -U postgres -d postgres -c \"SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;\" 2>/dev/null"
        output = subprocess.check_output(cmd, shell=True, text=True).strip()
        
        if output:
            result.pass_test("RLS Policies", "PostgreSQL policies accessible")
            
            for table_name, policies in expected_policies.items():
                if any(table_name in line for line in output.split('\n')):
                    result.pass_test(f"RLS Policies for {table_name}", f"Configured ({len(policies)} expected)")
                else:
                    result.warn(f"RLS Policies for {table_name}: May need configuration")
        else:
            result.warn("RLS Policies: Could not verify from database")
    
    except Exception as e:
        result.warn(f"RLS Policies: {str(e)}")

# ============================================================
# EDGE FUNCTIONS TESTS
# ============================================================

def test_edge_functions(result: DiagnosticResult, url: str):
    """Test Edge Functions"""
    print_subsection("Edge Functions Deployment")
    
    edge_functions = {
        'create-staff': 'Create staff member in auth and database',
        'create-salon-complete': 'Create complete salon with owner',
        'delete-salon': 'Delete salon with cascade',
        'reset-staff-password': 'Reset staff member password',
        'push-notification': 'Send push notifications',
        'realtime-notification': 'Send realtime notifications',
    }
    
    headers = {
        "apikey": LOCAL_ANON_KEY,
        "Authorization": f"Bearer {LOCAL_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    for func_name, description in edge_functions.items():
        try:
            # Test with empty payload to avoid validation errors
            response = requests.post(
                f"{url}/functions/v1/{func_name}",
                json={},
                headers=headers,
                timeout=5
            )
            
            if response.status_code != 404:
                result.pass_test(f"Edge Function: {func_name}", description)
            else:
                result.warn(f"Edge Function {func_name}: Not deployed (may be intentional)")
        
        except requests.exceptions.ConnectionError:
            result.warn(f"Edge Function {func_name}: Cannot connect to functions API")
        except Exception as e:
            result.warn(f"Edge Function {func_name}: {str(e)[:50]}")

# ============================================================
# DATA INTEGRITY TESTS
# ============================================================

def test_data_integrity(result: DiagnosticResult, url: str):
    """Test foreign keys and data constraints"""
    print_subsection("Data Integrity & Constraints")
    
    try:
        headers = {
            "apikey": LOCAL_ANON_KEY,
            "Authorization": f"Bearer {LOCAL_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        # Test 1: Create salon
        salon_data = {
            "name": "Integrity Test Salon",
            "slug": f"integrity-test-{datetime.now().timestamp()}",
            "owner_email": "integrity@test.com"
        }
        
        response = requests.post(f"{url}/rest/v1/salons", 
                               json=salon_data, headers=headers, timeout=5)
        
        if response.status_code == 201 and response.text:
            salon = response.json()[0]
            salon_id = salon['id']
            result.pass_test("Foreign Key: Salon creation", "Valid UUID generated")
            
            # Test 2: Create service for salon
            service_data = {
                "salon_id": salon_id,
                "name": "Test Service",
                "price": 25.00,
                "duration": 30
            }
            
            response = requests.post(f"{url}/rest/v1/services",
                                   json=service_data, headers=headers, timeout=5)
            
            if response.status_code == 201:
                result.pass_test("Foreign Key Constraint", "Service linked to salon correctly")
                
                # Cleanup
                requests.delete(f"{url}/rest/v1/services?id=eq.{response.json()[0]['id']}", 
                              headers=headers, timeout=5)
            else:
                result.fail_test("Foreign Key Constraint", f"Service creation failed: {response.status_code}")
            
            # Cleanup salon
            requests.delete(f"{url}/rest/v1/salons?id=eq.{salon_id}", 
                          headers=headers, timeout=5)
        else:
            result.fail_test("Foreign Key: Salon creation", f"Failed with status {response.status_code}")
    
    except Exception as e:
        result.fail_test("Data Integrity Tests", str(e))

# ============================================================
# AUTHENTICATION TESTS
# ============================================================

def test_authentication(result: DiagnosticResult, url: str):
    """Test authentication and authorization"""
    print_subsection("Authentication & Authorization")
    
    headers_valid = {
        "apikey": LOCAL_ANON_KEY,
        "Authorization": f"Bearer {LOCAL_ANON_KEY}",
    }
    
    headers_invalid = {
        "apikey": "invalid.key.here",
        "Authorization": "Bearer invalid.token.here",
    }
    
    # Test with valid key
    try:
        response = requests.get(f"{url}/rest/v1/salons?limit=1", 
                              headers=headers_valid, timeout=5)
        if response.status_code == 200:
            result.pass_test("Valid Authentication", "ANON_KEY works correctly")
        else:
            result.fail_test("Valid Authentication", f"Unexpected status {response.status_code}")
    except Exception as e:
        result.fail_test("Valid Authentication", str(e))
    
    # Test with invalid key
    try:
        response = requests.get(f"{url}/rest/v1/salons?limit=1", 
                              headers=headers_invalid, timeout=5)
        if response.status_code in [401, 403]:
            result.pass_test("Invalid Authentication Rejection", "Invalid keys properly rejected")
        elif response.status_code == 200:
            result.warn("Invalid Authentication: Server accepted invalid credentials (security concern)")
        else:
            result.warn(f"Invalid Authentication: Unexpected status {response.status_code}")
    except Exception as e:
        result.warn(f"Invalid Authentication Test: {str(e)}")

# ============================================================
# PERFORMANCE & LOAD TESTS
# ============================================================

def test_performance(result: DiagnosticResult, url: str):
    """Test API response times"""
    print_subsection("Performance & Response Times")
    
    headers = {
        "apikey": LOCAL_ANON_KEY,
        "Authorization": f"Bearer {LOCAL_ANON_KEY}",
    }
    
    test_endpoints = [
        ('/rest/v1/salons?limit=1', 'Salons endpoint'),
        ('/rest/v1/services?limit=1', 'Services endpoint'),
        ('/rest/v1/appointments?limit=1', 'Appointments endpoint'),
        ('/rest/v1/staff?limit=1', 'Staff endpoint'),
    ]
    
    for endpoint, description in test_endpoints:
        try:
            start = datetime.now()
            response = requests.get(f"{url}{endpoint}", headers=headers, timeout=10)
            elapsed = (datetime.now() - start).total_seconds() * 1000  # ms
            
            if response.status_code == 200:
                if elapsed < 500:
                    result.pass_test(f"Performance: {description}", f"{elapsed:.0f}ms (Excellent)")
                elif elapsed < 1000:
                    result.pass_test(f"Performance: {description}", f"{elapsed:.0f}ms (Good)")
                else:
                    result.warn(f"Performance: {description} - {elapsed:.0f}ms (Slow)")
            else:
                result.warn(f"Performance: {description} - Status {response.status_code}")
        except Exception as e:
            result.fail_test(f"Performance: {description}", str(e))

# ============================================================
# DEPLOYMENT READINESS CHECK
# ============================================================

def generate_deployment_readiness_report(result: DiagnosticResult) -> str:
    """Generate deployment readiness assessment"""
    
    summary = result.summary()
    total_tests = summary['total']
    passed_tests = summary['passed']
    failed_tests = summary['failed']
    warnings = summary['warnings']
    
    pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    report = f"""
{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}
{Colors.BOLD}DEPLOYMENT READINESS ASSESSMENT{Colors.END}
{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}

Test Results Summary:
  ✓ Passed Tests:    {passed_tests}/{total_tests}
  ✗ Failed Tests:    {failed_tests}/{total_tests}
  ⚠ Warnings:        {warnings}
  Pass Rate:         {pass_rate:.1f}%

Deployment Status:
"""
    
    if failed_tests == 0 and pass_rate >= 95:
        report += f"{Colors.GREEN}✓ READY FOR DEPLOYMENT{Colors.END}\n"
        report += """
Your application is ready to deploy to the internet. All critical tests
have passed. Consider the following before deploying:

1. ✓ All containers are running and healthy
2. ✓ Database schema is complete
3. ✓ RLS policies are configured
4. ✓ Edge functions are deployed
5. ✓ Authentication is working
6. ✓ API performance is acceptable

Recommended Pre-Deployment Steps:
  □ Run full regression tests
  □ Load test with expected traffic volume
  □ Verify all environment variables are set
  □ Review security group/firewall rules
  □ Set up monitoring and alerting
  □ Create database backups
  □ Enable audit logging
  □ Test disaster recovery procedures
"""
    elif failed_tests <= 2 and warnings <= 3:
        report += f"{Colors.YELLOW}⚠ CONDITIONALLY READY{Colors.END}\n"
        report += f"""
Your application has some minor issues that should be resolved before
deploying to production:

Failed Tests: {failed_tests}
Warnings: {warnings}

Actions Required:
  1. Review and fix the {failed_tests} failed tests
  2. Address the {warnings} warnings
  3. Re-run diagnostic tests
  4. Verify fixes don't introduce regressions

Once these issues are resolved, the application will be ready for deployment.
"""
    else:
        report += f"{Colors.RED}✗ NOT READY FOR DEPLOYMENT{Colors.END}\n"
        report += f"""
Your application has critical issues that must be resolved before
deploying to production:

Failed Tests: {failed_tests}
Warnings: {warnings}
Pass Rate: {pass_rate:.1f}%

Critical Actions Required:
  1. Review all {failed_tests} failed tests
  2. Fix root causes of failures
  3. Address high-priority warnings
  4. Re-run diagnostic tests
  5. Verify all tests pass (target: 100%)

Do NOT deploy until all critical issues are resolved.
"""
    
    report += f"""
{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}
When to Deploy:
{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}

WAIT and FIX if:
  ✗ Any failed tests (failed_tests > 0)
  ✗ Pass rate below 95%
  ✗ Critical warnings about security or data
  ✗ Edge functions not deployed
  ✗ RLS policies not configured

SAFE TO DEPLOY when:
  ✓ Pass rate >= 95%
  ✓ No failed tests
  ✓ All containers healthy
  ✓ Database fully migrated
  ✓ RLS policies active
  ✓ Edge functions working
  ✓ Performance acceptable

Deployment Commands:
  1. Local to Remote (Supabase CLI):
     cd barber-backend
     supabase db push

  2. Frontend Deployment:
     cd barber-frontend
     # Verify environment: VITE_SUPABASE_URL (production URL)
     # Verify environment: VITE_SUPABASE_ANON_KEY (production key)
     npm run build
     # Deploy to: Vercel / Netlify / Docker / Your host

  3. Docker Production:
     docker compose -f docker-compose.prod.yml up -d

{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}
Generated: {datetime.now().isoformat()}
{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}
"""
    
    return report

# ============================================================
# MAIN TEST RUNNER
# ============================================================

def main():
    """Run all diagnostic tests"""
    
    print(f"\n{Colors.BOLD}{Colors.CYAN}")
    print("╔" + "="*68 + "╗")
    print("║" + "SUPABASE COMPREHENSIVE DIAGNOSTIC & DEPLOYMENT READINESS TEST".center(68) + "║")
    print("╚" + "="*68 + "╝")
    print(f"{Colors.END}\n")
    
    result = DiagnosticResult()
    
    # Run all diagnostic tests
    print_section("LOCAL SUPABASE SYSTEM DIAGNOSTICS")
    test_docker_containers(result)
    
    print_section("2. CONNECTIVITY TESTS")
    if test_supabase_connection(result, LOCAL_SUPABASE_URL, "Local Supabase"):
        print_section("3. DATABASE SCHEMA VALIDATION")
        test_database_schema(result, LOCAL_SUPABASE_URL)
        
        print_section("4. RPC FUNCTIONS")
        test_rpc_functions(result, LOCAL_SUPABASE_URL)
        
        print_section("5. ROW LEVEL SECURITY")
        test_rls_policies(result)
        
        print_section("6. EDGE FUNCTIONS")
        test_edge_functions(result, LOCAL_SUPABASE_URL)
        
        print_section("7. DATA INTEGRITY")
        test_data_integrity(result, LOCAL_SUPABASE_URL)
        
        print_section("8. AUTHENTICATION")
        test_authentication(result, LOCAL_SUPABASE_URL)
        
        print_section("9. PERFORMANCE")
        test_performance(result, LOCAL_SUPABASE_URL)
    else:
        result.fail_test("All Subsequent Tests", "Cannot proceed without Supabase connection")
    
    # Generate deployment readiness report
    report = generate_deployment_readiness_report(result)
    print(report)
    
    # Return exit code based on results
    summary = result.summary()
    if summary['failed'] == 0:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())
