import os
import sys
import requests
import json
import time

# Configuration
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://resevini.vercel.app")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = REDACTED("SUPABASE_ANON_KEY")

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    RESET = '\033[0m'

def log(msg, type="info"):
    if type == "success":
        print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")
    elif type == "error":
        print(f"{Colors.RED}❌ {msg}{Colors.RESET}")
    elif type == "warning":
        print(f"{Colors.YELLOW}⚠️ {msg}{Colors.RESET}")
    else:
        print(f"ℹ️ {msg}")

def check_frontend():
    log(f"Checking Frontend at {FRONTEND_URL}...")
    try:
        response = requests.get(FRONTEND_URL, timeout=10)
        if response.status_code == 200:
            log(f"Frontend is UP ({response.elapsed.total_seconds():.2f}s)", "success")
            return True
        else:
            log(f"Frontend returned status {response.status_code}", "error")
            return False
    except Exception as e:
        log(f"Frontend unreachable: {str(e)}", "error")
        return False

def check_supabase():
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        log("Skipping Supabase checks (Missing credentials)", "warning")
        return True

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }

    # Check 1: Salons Table (Public Read)
    log("Checking Database Connection (Salons table)...")
    try:
        url = f"{SUPABASE_URL}/rest/v1/salons?select=count"
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            log("Database is Accessible via API", "success")
        else:
            log(f"Database returned status {response.status_code}: {response.text}", "error")
            return False
    except Exception as e:
        log(f"Database connection failed: {str(e)}", "error")
        return False

    return True

if __name__ == "__main__":
    log("🚀 Starting Smoke Tests...")
    
    frontend_ok = check_frontend()
    backend_ok = check_supabase()
    
    if frontend_ok and backend_ok:
        log("All Systems Operational", "success")
        sys.exit(0)
    else:
        log("Some checks failed", "error")
        sys.exit(1)
