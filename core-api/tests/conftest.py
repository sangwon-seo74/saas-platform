import os

# 테스트는 실제 Supabase에 의존하지 않는다. config가 요구하는 값만 결정적으로 주입.
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key"
os.environ["SUPABASE_JWT_SECRET"] = "test-jwt-secret-for-pytest-only"
os.environ["INVITE_TOKEN_SECRET"] = "test-invite-secret-for-pytest-only"
os.environ["SUPER_ADMIN_EMAILS"] = "admin@test.com"
