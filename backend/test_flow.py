import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_factory_dept_hr_flow():
    # 1. Login as superadmin
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "AdminSecurePassword123!"
    })
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Unauthorized checks
    unauth_resp = client.get("/api/v1/factories")
    assert unauth_resp.status_code == 401

    # 3. Create Factory
    fac_payload = {
        "name": "Apex Automotive Plant 1",
        "factory_code": "FAC-APX-01",
        "address": "100 Industrial Parkway",
        "city": "Austin",
        "state": "Texas",
        "country": "USA",
        "phone": "+1-512-555-0199",
        "email": "contact@apexplant.com",
        "description": "Primary high-tech automotive assembly plant",
        "is_active": True
    }
    create_fac_resp = client.post("/api/v1/factories", json=fac_payload, headers=headers)
    assert create_fac_resp.status_code == 201, create_fac_resp.text
    factory = create_fac_resp.json()
    fac_id = factory["id"]
    assert factory["factory_code"] == "FAC-APX-01"

    # Duplicate code check
    dup_fac_resp = client.post("/api/v1/factories", json=fac_payload, headers=headers)
    assert dup_fac_resp.status_code == 400

    # 4. View all factories & search
    fac_list_resp = client.get("/api/v1/factories?search=Austin", headers=headers)
    assert fac_list_resp.status_code == 200
    assert len(fac_list_resp.json()) >= 1

    # View individual factory
    fac_detail_resp = client.get(f"/api/v1/factories/{fac_id}", headers=headers)
    assert fac_detail_resp.status_code == 200
    assert fac_detail_resp.json()["id"] == fac_id

    # 5. Create Department in Factory
    dept_payload = {
        "factory_id": fac_id,
        "name": "Quality Assurance & Robotics",
        "department_code": "QA-ROB-01",
        "description": "Automated vision inspection department",
        "is_active": True
    }
    create_dept_resp = client.post("/api/v1/departments", json=dept_payload, headers=headers)
    assert create_dept_resp.status_code == 201, create_dept_resp.text
    dept = create_dept_resp.json()
    dept_id = dept["id"]
    assert dept["factory_id"] == fac_id

    # Duplicate department code in same factory check
    dup_dept_resp = client.post("/api/v1/departments", json=dept_payload, headers=headers)
    assert dup_dept_resp.status_code == 400

    # Invalid factory ID check
    invalid_dept_resp = client.post("/api/v1/departments", json={
        "factory_id": "non-existent-id-0000",
        "name": "HR Dept",
        "department_code": "HR-01",
    }, headers=headers)
    assert invalid_dept_resp.status_code == 404

    # View factory's departments
    fac_depts_resp = client.get(f"/api/v1/factories/{fac_id}/departments", headers=headers)
    assert fac_depts_resp.status_code == 200
    assert len(fac_depts_resp.json()) == 1

    # 6. Create HR Account
    hr_payload = {
        "factory_id": fac_id,
        "department_id": dept_id,
        "full_name": "Sarah Connor",
        "username": "sarah_hr",
        "email": "sarah.connor@apexplant.com",
        "password": "PasswordHR999!",
        "phone": "+1-512-555-8888",
        "is_active": True
    }
    create_hr_resp = client.post("/api/v1/hr", json=hr_payload, headers=headers)
    assert create_hr_resp.status_code == 201, create_hr_resp.text
    hr_data = create_hr_resp.json()
    hr_id = hr_data["id"]
    assert "hashed_password" not in hr_data
    assert "password" not in hr_data
    assert hr_data["username"] == "sarah_hr"
    assert hr_data["factory_id"] == fac_id
    assert hr_data["department_id"] == dept_id

    # Duplicate username / email check
    dup_hr_resp = client.post("/api/v1/hr", json=hr_payload, headers=headers)
    assert dup_hr_resp.status_code == 400

    # Mismatched factory & department check
    # Create another factory
    fac2_resp = client.post("/api/v1/factories", json={
        "name": "Apex Warehouse 2",
        "factory_code": "FAC-APX-02",
        "address": "200 Distribution Way",
        "city": "Dallas",
        "state": "Texas",
        "country": "USA",
        "phone": "+1-214-555-0100",
        "email": "warehouse2@apexplant.com",
    }, headers=headers)
    assert fac2_resp.status_code == 201
    fac2_id = fac2_resp.json()["id"]

    # Try assigning Sarah to Fac2 with Dept1 (which belongs to Fac1)
    mismatch_hr_resp = client.post("/api/v1/hr", json={
        "factory_id": fac2_id,
        "department_id": dept_id,
        "full_name": "Mismatch Tester",
        "username": "mismatch_hr",
        "email": "mismatch@apexplant.com",
        "password": "PasswordHR999!",
        "phone": "+1-214-555-1111",
        "is_active": True
    }, headers=headers)
    assert mismatch_hr_resp.status_code == 400

    # 7. Safe Deletion Prevention Checks
    # Factory cannot be deleted because it has departments and HR accounts
    del_fac_resp = client.delete(f"/api/v1/factories/{fac_id}", headers=headers)
    assert del_fac_resp.status_code == 400
    assert "associated department" in del_fac_resp.json()["detail"].lower()

    # Department cannot be deleted because it has HR account
    del_dept_resp = client.delete(f"/api/v1/departments/{dept_id}", headers=headers)
    assert del_dept_resp.status_code == 400
    assert "assigned hr" in del_dept_resp.json()["detail"].lower()

    # 8. HR Status Toggle & Password Reset
    status_resp = client.patch(f"/api/v1/hr/{hr_id}/status", json={"is_active": False}, headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["is_active"] is False

    reset_resp = client.patch(f"/api/v1/hr/{hr_id}/reset-password", json={"new_password": "NewSecretPass123!"}, headers=headers)
    assert reset_resp.status_code == 200
    assert reset_resp.json()["success"] is True

    # 9. Clean up test records
    del_hr_resp = client.delete(f"/api/v1/hr/{hr_id}", headers=headers)
    assert del_hr_resp.status_code == 200

    # Now department can be safely deleted
    del_dept_ok = client.delete(f"/api/v1/departments/{dept_id}", headers=headers)
    assert del_dept_ok.status_code == 200

    # Now factory 1 and 2 can be safely deleted
    del_fac1_ok = client.delete(f"/api/v1/factories/{fac_id}", headers=headers)
    assert del_fac1_ok.status_code == 200

    del_fac2_ok = client.delete(f"/api/v1/factories/{fac2_id}", headers=headers)
    assert del_fac2_ok.status_code == 200

    print("ALL FACTORY, DEPARTMENT, AND HR MANAGEMENT TEST FLOWS PASSED!")

if __name__ == "__main__":
    test_full_factory_dept_hr_flow()
