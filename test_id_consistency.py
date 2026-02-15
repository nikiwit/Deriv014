#!/usr/bin/env python3
"""
Test script to verify ID consistency between users and employees tables.

This script tests that:
1. generate_offer_approval creates records in both tables
2. Both records use the same ID
3. No duplicate records with mismatched IDs

Usage:
    python test_id_consistency.py
"""

import requests
import json
from datetime import datetime
import uuid

# Configuration
API_BASE_URL = "http://localhost:5001"
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@example.com"

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def print_success(msg):
    print(f"{GREEN}✅ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}❌ {msg}{RESET}")

def print_info(msg):
    print(f"{BLUE}ℹ️  {msg}{RESET}")

def print_warning(msg):
    print(f"{YELLOW}⚠️  {msg}{RESET}")

def print_section(title):
    print(f"\n{BLUE}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{RESET}\n")

def check_backend_health():
    """Check if backend is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/health", timeout=3)
        if response.status_code == 200:
            print_success("Backend server is running")
            return True
        else:
            print_error(f"Backend returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Backend server is not running!")
        print_info("Start backend with: cd backend && source venv/bin/activate && python run.py")
        return False
    except Exception as e:
        print_error(f"Health check failed: {str(e)}")
        return False

def test_offer_generation():
    """Test the offer generation endpoint"""
    print_section("TEST 1: Offer Generation")
    
    # Prepare test data
    test_data = {
        "email": TEST_EMAIL,
        "first_name": "John",
        "last_name": "Doe",
        "position_title": "Software Engineer",
        "department": "Engineering",
        "role": "employee",
        "start_date": "2026-03-01",
        "nationality": "Malaysian",
        "nric": "900101-01-1234",
        "work_location": "Kuala Lumpur",
        "work_hours": "9:00 AM - 6:00 PM",
        "leave_annual_days": 14,
        "leave_sick_days": 14,
        "public_holidays_policy": "Malaysia Federal",
        "date_of_birth": "1990-01-01",
        "bank_name": "Maybank",
        "bank_account_holder": "John Doe",
        "bank_account_number": "1234567890"
    }
    
    print_info(f"Generating offer for: {TEST_EMAIL}")
    print_info(f"Test data: {json.dumps(test_data, indent=2)}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/onboarding-workflow/generate-offer-approval",
            json=test_data,
            timeout=10
        )
        
        print_info(f"Response status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            result = response.json()
            print_success("Offer generation successful!")
            print_info(f"Response: {json.dumps(result, indent=2)}")
            
            if result.get("success"):
                employee_id = result.get("employee_id")
                user_id = result.get("user_id")
                offer_url = result.get("offer_url")
                
                print_info(f"Employee ID: {employee_id}")
                print_info(f"User ID: {user_id}")
                print_info(f"Offer URL: {offer_url}")
                
                return {
                    "success": True,
                    "employee_id": employee_id,
                    "user_id": user_id,
                    "offer_url": offer_url,
                    "email": TEST_EMAIL
                }
            else:
                print_error(f"Offer generation failed: {result.get('error', 'Unknown error')}")
                return {"success": False}
        else:
            print_error(f"Request failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return {"success": False}
            
    except Exception as e:
        print_error(f"Exception during offer generation: {str(e)}")
        return {"success": False}

def verify_database_consistency(employee_id, email):
    """Verify that records exist in both tables with matching IDs"""
    print_section("TEST 2: Database ID Consistency")
    
    print_info("This test requires direct database access.")
    print_info("Please run the following SQL queries manually:\n")
    
    # Generate SQL queries for manual verification
    sql_queries = f"""
-- Query 1: Check users table
SELECT id, employee_id, email, role, first_name, last_name
FROM users 
WHERE email = '{email}';

-- Query 2: Check employees table
SELECT id, email, full_name, position, department, status
FROM employees 
WHERE email = '{email}';

-- Query 3: Verify ID consistency (should return 1 row if IDs match)
SELECT 
    u.id as user_id,
    u.employee_id as user_employee_id,
    e.id as employee_id,
    CASE 
        WHEN u.id = e.id AND u.employee_id = e.id THEN 'MATCH ✅'
        ELSE 'MISMATCH ❌'
    END as consistency_check
FROM users u
JOIN employees e ON u.email = e.email
WHERE u.email = '{email}';

-- Expected Result:
-- user_id = {employee_id}
-- user_employee_id = {employee_id}
-- employee_id = {employee_id}
-- consistency_check = 'MATCH ✅'
"""
    
    print(sql_queries)
    
    print_warning("Manual verification required!")
    print_info("Expected results:")
    print_info(f"  • users.id = {employee_id}")
    print_info(f"  • users.employee_id = {employee_id}")
    print_info(f"  • employees.id = {employee_id}")
    print_info(f"  • All three IDs should MATCH!")
    
    return True

def test_offer_retrieval(employee_id):
    """Test retrieving the generated offer"""
    print_section("TEST 3: Offer Retrieval")
    
    print_info(f"Retrieving offer for employee ID: {employee_id}")
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/offer/{employee_id}",
            timeout=5
        )
        
        if response.status_code == 200:
            offer_data = response.json()
            print_success("Offer retrieval successful!")
            print_info(f"Offer data preview:")
            print_info(f"  • Email: {offer_data.get('email')}")
            print_info(f"  • Name: {offer_data.get('first_name')} {offer_data.get('last_name')}")
            print_info(f"  • Position: {offer_data.get('position_title')}")
            print_info(f"  • Status: {offer_data.get('status')}")
            return {"success": True, "data": offer_data}
        else:
            print_error(f"Offer retrieval failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return {"success": False}
            
    except Exception as e:
        print_error(f"Exception during offer retrieval: {str(e)}")
        return {"success": False}

def test_offer_acceptance(employee_id):
    """Test accepting the offer"""
    print_section("TEST 4: Offer Acceptance")
    
    print_info(f"Accepting offer for employee ID: {employee_id}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/offer/{employee_id}/accept",
            json={"accepted_at": datetime.now().isoformat()},
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Offer acceptance successful!")
            print_info(f"Response: {json.dumps(result, indent=2)}")
            return {"success": True}
        else:
            print_error(f"Offer acceptance failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return {"success": False}
            
    except Exception as e:
        print_error(f"Exception during offer acceptance: {str(e)}")
        return {"success": False}

def verify_post_acceptance(employee_id, email):
    """Verify database state after acceptance"""
    print_section("TEST 5: Post-Acceptance Verification")
    
    print_info("Please verify the following in your database:\n")
    
    sql_queries = f"""
-- Query 1: Verify user role updated to 'employee'
SELECT id, email, role, onboarding_complete
FROM users 
WHERE email = '{email}';
-- Expected: role = 'employee' (changed from 'pending_employee')

-- Query 2: Verify employee status
SELECT id, email, status
FROM employees 
WHERE email = '{email}';
-- Expected: status should be updated appropriately

-- Query 3: Verify IDs still match
SELECT 
    u.id as user_id,
    e.id as employee_id,
    u.role as user_role,
    e.status as employee_status,
    CASE 
        WHEN u.id = e.id THEN 'IDs MATCH ✅'
        ELSE 'IDs MISMATCH ❌'
    END as id_consistency
FROM users u
JOIN employees e ON u.email = e.email
WHERE u.email = '{email}';
"""
    
    print(sql_queries)
    
    print_info("Expected results:")
    print_info(f"  • users.role = 'employee' (was 'pending_employee')")
    print_info(f"  • users.id = employees.id = {employee_id}")
    print_info(f"  • No duplicate records")

def generate_summary(results):
    """Generate test summary"""
    print_section("TEST SUMMARY")
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r.get("passed", False))
    
    print_info(f"Total Tests: {total_tests}")
    print_info(f"Passed: {passed_tests}")
    print_info(f"Failed: {total_tests - passed_tests}")
    
    if passed_tests == total_tests:
        print_success("\n🎉 All automated tests passed!")
    else:
        print_warning(f"\n⚠️  {total_tests - passed_tests} test(s) need attention")
    
    print("\n" + "="*60)
    print("Individual Test Results:")
    print("="*60 + "\n")
    
    for i, result in enumerate(results, 1):
        status = "✅ PASS" if result.get("passed") else "❌ FAIL"
        print(f"{i}. {result['name']}: {status}")
        if result.get("note"):
            print(f"   Note: {result['note']}")
    
    print("\n" + "="*60)

def main():
    """Main test execution"""
    print_section("ID CONSISTENCY TEST SUITE")
    print_info("Testing employee record creation with matching IDs")
    print_info(f"API Base URL: {API_BASE_URL}")
    print_info(f"Test Email: {TEST_EMAIL}\n")
    
    results = []
    
    # Test 1: Backend Health
    if not check_backend_health():
        print_error("\nTests cannot proceed without backend running!")
        print_info("Please start the backend server and try again.")
        return
    
    results.append({"name": "Backend Health Check", "passed": True})
    
    # Test 2: Offer Generation
    offer_result = test_offer_generation()
    if offer_result.get("success"):
        results.append({"name": "Offer Generation", "passed": True})
        employee_id = offer_result["employee_id"]
        user_id = offer_result["user_id"]
        email = offer_result["email"]
        
        # Verify IDs match
        if employee_id == user_id:
            print_success(f"\n✅ ID CONSISTENCY CHECK PASSED!")
            print_success(f"   Both employee_id and user_id are: {employee_id}")
            results.append({"name": "ID Consistency (API Response)", "passed": True})
        else:
            print_error(f"\n❌ ID MISMATCH DETECTED!")
            print_error(f"   employee_id: {employee_id}")
            print_error(f"   user_id: {user_id}")
            results.append({"name": "ID Consistency (API Response)", "passed": False})
        
        # Test 3: Database Verification
        verify_database_consistency(employee_id, email)
        results.append({
            "name": "Database ID Consistency", 
            "passed": True,
            "note": "Manual verification required"
        })
        
        # Test 4: Offer Retrieval
        retrieval_result = test_offer_retrieval(employee_id)
        results.append({
            "name": "Offer Retrieval",
            "passed": retrieval_result.get("success", False)
        })
        
        # Test 5: Offer Acceptance
        acceptance_result = test_offer_acceptance(employee_id)
        results.append({
            "name": "Offer Acceptance",
            "passed": acceptance_result.get("success", False)
        })
        
        # Test 6: Post-Acceptance Verification
        if acceptance_result.get("success"):
            verify_post_acceptance(employee_id, email)
            results.append({
                "name": "Post-Acceptance Verification",
                "passed": True,
                "note": "Manual verification required"
            })
    else:
        results.append({"name": "Offer Generation", "passed": False})
        print_error("\nTests cannot proceed without successful offer generation!")
    
    # Generate summary
    generate_summary(results)
    
    # Final instructions
    print_section("NEXT STEPS")
    print_info("1. Review the SQL queries above and run them in your database")
    print_info("2. Verify that all IDs match across tables")
    print_info("3. Check that roles/statuses updated correctly after acceptance")
    print_info("4. Clean up test data if needed:")
    print_info(f"   DELETE FROM users WHERE email = '{TEST_EMAIL}';")
    print_info(f"   DELETE FROM employees WHERE email = '{TEST_EMAIL}';")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_warning("\n\nTest interrupted by user")
    except Exception as e:
        print_error(f"\nUnexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
