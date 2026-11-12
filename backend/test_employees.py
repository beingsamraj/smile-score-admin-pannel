from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_employee_and_transfer_flow():
    # 1. Login as Superadmin test / test123
    login_res = client.post("/api/v1/auth/login", json={"username": "test", "password": "test123"})
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create unique Factory 1 and Factory 2
    import random
    suffix = str(random.randint(10000, 99999))

    f1 = client.post("/api/v1/factories", json={
        "name": f"Plant Alpha {suffix}",
        "factory_code": f"PLT-ALP-{suffix}",
        "address": "100 Alpha Rd",
        "city": "Dallas",
        "state": "TX",
        "country": "USA",
        "phone": "+1-214-555-1000",
        "email": f"alpha{suffix}@plants.internal"
    }, headers=headers).json()
    f1_id = f1["id"]

    f2 = client.post("/api/v1/factories", json={
        "name": f"Plant Beta {suffix}",
        "factory_code": f"PLT-BET-{suffix}",
        "address": "200 Beta Blvd",
        "city": "Houston",
        "state": "TX",
        "country": "USA",
        "phone": "+1-713-555-2000",
        "email": f"beta{suffix}@plants.internal"
    }, headers=headers).json()
    f2_id = f2["id"]

    # 3. Create Departments in Factory 1 (Dept 1A & Dept 1B) and Factory 2 (Dept 2A)
    d1a = client.post("/api/v1/departments", json={
        "factory_id": f1_id,
        "name": f"Assembly Line 1 {suffix}",
        "department_code": f"ASM-{suffix}"
    }, headers=headers).json()
    d1a_id = d1a["id"]

    d1b = client.post("/api/v1/departments", json={
        "factory_id": f1_id,
        "name": f"Inspection Line 2 {suffix}",
        "department_code": f"INSP-{suffix}"
    }, headers=headers).json()
    d1b_id = d1b["id"]

    d2a = client.post("/api/v1/departments", json={
        "factory_id": f2_id,
        "name": f"Packaging {suffix}",
        "department_code": f"PKG-{suffix}"
    }, headers=headers).json()
    d2a_id = d2a["id"]

    # 4. Create HR accounts for each department
    hr1a = client.post("/api/v1/hr", json={
        "factory_id": f1_id,
        "department_id": d1a_id,
        "full_name": "Alice HR",
        "username": f"alice_hr_{suffix}",
        "email": f"alice{suffix}@plants.internal",
        "password": "Password123!",
        "phone": "+1-214-555-1111"
    }, headers=headers).json()
    hr1a_id = hr1a["id"]

    hr1b = client.post("/api/v1/hr", json={
        "factory_id": f1_id,
        "department_id": d1b_id,
        "full_name": "Bob HR",
        "username": f"bob_hr_{suffix}",
        "email": f"bob{suffix}@plants.internal",
        "password": "Password123!",
        "phone": "+1-214-555-2222"
    }, headers=headers).json()
    hr1b_id = hr1b["id"]

    hr2a = client.post("/api/v1/hr", json={
        "factory_id": f2_id,
        "department_id": d2a_id,
        "full_name": "Charlie HR",
        "username": f"charlie_hr_{suffix}",
        "email": f"charlie{suffix}@plants.internal",
        "password": "Password123!",
        "phone": "+1-713-555-3333"
    }, headers=headers).json()
    hr2a_id = hr2a["id"]

    # Use randomized IDs for test run
    test_emp_id_1 = f"000{suffix}"
    test_emp_id_2 = f"999{suffix}".zfill(16)

    # 5. Test Employee ID validation:
    # A) Reject non-numeric
    non_num_res = client.post("/api/v1/employees", json={
        "employee_id": "ABC1234",
        "full_name": "Invalid Emp",
        "factory_id": f1_id,
        "department_id": d1a_id,
        "assigned_hr_id": hr1a_id,
    }, headers=headers)
    assert non_num_res.status_code == 422, non_num_res.text

    # B) Reject > 16 digits
    long_res = client.post("/api/v1/employees", json={
        "employee_id": "12345678901234567", # 17 digits
        "full_name": "Too Long Emp",
        "factory_id": f1_id,
        "department_id": d1a_id,
        "assigned_hr_id": hr1a_id,
    }, headers=headers)
    assert long_res.status_code == 422, long_res.text

    # C) Reject mismatched HR & Dept (e.g., HR from Dept 1B assigned with Dept 1A)
    mismatch_res = client.post("/api/v1/employees", json={
        "employee_id": "1001",
        "full_name": "Mismatch Emp",
        "factory_id": f1_id,
        "department_id": d1a_id,
        "assigned_hr_id": hr1b_id, # belonging to d1b, not d1a
    }, headers=headers)
    assert mismatch_res.status_code == 400
    assert "not assigned to factory" in mismatch_res.json()["detail"].lower()

    # D) Create employee with short numeric ID and preserve leading zeros
    emp1_res = client.post("/api/v1/employees", json={
        "employee_id": test_emp_id_1,
        "full_name": "John Doe",
        "factory_id": f1_id,
        "department_id": d1a_id,
        "assigned_hr_id": hr1a_id,
        "phone": "+1-555-0101",
        "email": f"john{suffix}@worker.internal"
    }, headers=headers)
    assert emp1_res.status_code == 201, emp1_res.text
    emp1 = emp1_res.json()
    assert emp1["employee_id"] == test_emp_id_1
    assert emp1["factory_name"] == f"Plant Alpha {suffix}"
    assert emp1["assigned_hr_name"] == "Alice HR"
    assert emp1["has_face_enrolled"] is False
    assert emp1["has_fingerprint_enrolled"] is False

    # E) Create employee with exactly 16 digits
    emp2_res = client.post("/api/v1/employees", json={
        "employee_id": test_emp_id_2,
        "full_name": "Jane Smith",
        "factory_id": f1_id,
        "department_id": d1a_id,
        "assigned_hr_id": hr1a_id,
    }, headers=headers)
    assert emp2_res.status_code == 201, emp2_res.text
    emp2 = emp2_res.json()
    assert emp2["employee_id"] == test_emp_id_2

    # F) Reject duplicate employee ID
    dup_res = client.post("/api/v1/employees", json={
        "employee_id": test_emp_id_1,
        "full_name": "Duplicate John",
        "factory_id": f1_id,
        "department_id": d1a_id,
        "assigned_hr_id": hr1a_id,
    }, headers=headers)
    assert dup_res.status_code == 400
    assert "already assigned" in dup_res.json()["detail"].lower()

    # 6. Test Department Transfer:
    # Move John Doe from d1a to d1b within Factory 1
    dept_trans_res = client.post(f"/api/v1/employees/{emp1['id']}/transfer/department", json={
        "target_department_id": d1b_id,
        "new_assigned_hr_id": hr1b_id,
        "reason": "Promoted to Inspection Specialist"
    }, headers=headers)
    assert dept_trans_res.status_code == 200, dept_trans_res.text
    emp1_updated = dept_trans_res.json()
    assert emp1_updated["department_id"] == d1b_id
    assert emp1_updated["department_name"] == f"Inspection Line 2 {suffix}"
    assert emp1_updated["assigned_hr_id"] == hr1b_id
    assert emp1_updated["factory_id"] == f1_id  # unchanged

    # 7. Test Factory Transfer:
    # Move John Doe from Factory 1 to Factory 2 (Dept 2A, HR 2A)
    fac_trans_res = client.post(f"/api/v1/employees/{emp1['id']}/transfer/factory", json={
        "target_factory_id": f2_id,
        "target_department_id": d2a_id,
        "new_assigned_hr_id": hr2a_id,
        "reason": "Relocated to Houston facility"
    }, headers=headers)
    assert fac_trans_res.status_code == 200, fac_trans_res.text
    emp1_relocated = fac_trans_res.json()
    assert emp1_relocated["factory_id"] == f2_id
    assert emp1_relocated["factory_name"] == f"Plant Beta {suffix}"
    assert emp1_relocated["department_id"] == d2a_id
    assert emp1_relocated["assigned_hr_id"] == hr2a_id
    assert emp1_relocated["employee_id"] == test_emp_id_1 # unchanged

    # 8. Verify Transfer History
    history_res = client.get(f"/api/v1/employees/{emp1['id']}/transfer-history", headers=headers)
    assert history_res.status_code == 200
    hist = history_res.json()
    assert len(hist) == 2
    assert hist[0]["transfer_type"] == "factory"
    assert hist[0]["new_factory_name"] == f"Plant Beta {suffix}"
    assert hist[1]["transfer_type"] == "department"
    assert hist[1]["new_department_name"] == f"Inspection Line 2 {suffix}"

    # 9. Test Soft Delete
    del_res = client.delete(f"/api/v1/employees/{emp1['id']}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Deleted employee must not show up in normal list
    list_res = client.get("/api/v1/employees", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert all(e["id"] != emp1["id"] for e in items)
    assert any(e["id"] == emp2["id"] for e in items)

    # 10. Clean up test records
    client.delete(f"/api/v1/employees/{emp2['id']}", headers=headers)
    client.delete(f"/api/v1/hr/{hr1a_id}", headers=headers)
    client.delete(f"/api/v1/hr/{hr1b_id}", headers=headers)
    client.delete(f"/api/v1/hr/{hr2a_id}", headers=headers)
    client.delete(f"/api/v1/departments/{d1a_id}", headers=headers)
    client.delete(f"/api/v1/departments/{d1b_id}", headers=headers)
    client.delete(f"/api/v1/departments/{d2a_id}", headers=headers)
    client.delete(f"/api/v1/factories/{f1_id}", headers=headers)
    client.delete(f"/api/v1/factories/{f2_id}", headers=headers)

    print("ALL EMPLOYEE AND TRANSFER TESTS PASSED!")

if __name__ == "__main__":
    test_employee_and_transfer_flow()
