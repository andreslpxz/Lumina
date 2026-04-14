import requests
import sys
import json
from datetime import datetime

class AxonAgentAPITester:
    def __init__(self, base_url="https://52667618-46e0-4dd9-aa0c-a20e03244385.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.chat_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": "admin@axon.dev", "password": "admin123"}
        )
        if success and 'id' in response:
            self.user_id = response['id']
            print(f"   Logged in as: {response.get('email')} (Role: {response.get('role')})")
            return True
        return False

    def test_register_new_user(self):
        """Test user registration"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data={"name": "Test User", "email": test_email, "password": "testpass123"}
        )
        if success:
            print(f"   Registered user: {response.get('email')}")
        return success

    def test_auth_me(self):
        """Test /api/auth/me endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "api/auth/me",
            200
        )
        if success:
            print(f"   User info: {response.get('email')} (Role: {response.get('role')})")
        return success

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "api/auth/logout",
            200
        )
        return success

    def test_create_chat(self):
        """Test chat creation"""
        success, response = self.run_test(
            "Create Chat",
            "POST",
            "api/chats",
            200,
            data={"title": "Test Chat"}
        )
        if success and '_id' in response:
            self.chat_id = response['_id']
            print(f"   Created chat: {response.get('title')} (ID: {self.chat_id})")
            return True
        return False

    def test_list_chats(self):
        """Test chat listing"""
        success, response = self.run_test(
            "List Chats",
            "GET",
            "api/chats",
            200
        )
        if success:
            print(f"   Found {len(response)} chats")
        return success

    def test_get_chat(self):
        """Test get specific chat"""
        if not self.chat_id:
            print("❌ No chat ID available for testing")
            return False
        
        success, response = self.run_test(
            "Get Chat",
            "GET",
            f"api/chats/{self.chat_id}",
            200
        )
        if success:
            print(f"   Chat title: {response.get('title')}")
            print(f"   Messages count: {len(response.get('messages', []))}")
        return success

    def test_delete_chat(self):
        """Test chat deletion"""
        if not self.chat_id:
            print("❌ No chat ID available for testing")
            return False
        
        success, response = self.run_test(
            "Delete Chat",
            "DELETE",
            f"api/chats/{self.chat_id}",
            200
        )
        return success

    def test_chat_message_endpoint(self):
        """Test chat message endpoint (without streaming)"""
        # First create a new chat for messaging
        success, response = self.run_test(
            "Create Chat for Messaging",
            "POST",
            "api/chats",
            200,
            data={"title": "Message Test Chat"}
        )
        
        if not success or '_id' not in response:
            return False
        
        test_chat_id = response['_id']
        
        # Test sending a simple message
        try:
            url = f"{self.base_url}/api/chat"
            response = self.session.post(
                url,
                json={"content": "Hello, this is a test message", "chat_id": test_chat_id},
                headers={'Content-Type': 'application/json'},
                stream=True,
                timeout=10
            )
            
            if response.status_code == 200:
                print("✅ Chat message endpoint accessible")
                # Read a bit of the stream to verify it's working
                content = ""
                for line in response.iter_lines(decode_unicode=True):
                    if line and line.startswith('data: '):
                        content += line[6:]
                        if len(content) > 100:  # Just read a bit to verify streaming
                            break
                
                if content:
                    print("   Streaming response received")
                    self.tests_passed += 1
                else:
                    print("   No streaming content received")
                
                self.tests_run += 1
                return True
            else:
                print(f"❌ Chat message failed - Status: {response.status_code}")
                self.tests_run += 1
                return False
                
        except Exception as e:
            print(f"❌ Chat message failed - Error: {str(e)}")
            self.tests_run += 1
            return False

def main():
    print("🚀 Starting Axon Agent API Tests")
    print("=" * 50)
    
    tester = AxonAgentAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health),
        ("Admin Login", tester.test_admin_login),
        ("Auth Me", tester.test_auth_me),
        ("User Registration", tester.test_register_new_user),
        ("Admin Login (Re-login)", tester.test_admin_login),  # Re-login as admin
        ("Create Chat", tester.test_create_chat),
        ("List Chats", tester.test_list_chats),
        ("Get Chat", tester.test_get_chat),
        ("Chat Message", tester.test_chat_message_endpoint),
        ("Delete Chat", tester.test_delete_chat),
        ("Logout", tester.test_logout),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())