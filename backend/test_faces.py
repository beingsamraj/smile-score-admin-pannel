import base64
import cv2
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def generate_synthetic_face_base64(pattern_id: int = 1) -> str:
    """Generate a synthetic 128x128 face-like image for testing."""
    img = np.zeros((160, 160, 3), dtype=np.uint8)
    cv2.circle(img, (80, 80), 50, (200, 200, 200), -1)  # Head
    cv2.circle(img, (65, 70), 8, (50, 50, pattern_id * 30 % 255), -1)  # Left eye
    cv2.circle(img, (95, 70), 8, (50, 50, pattern_id * 30 % 255), -1)  # Right eye
    cv2.ellipse(img, (80, 105), (20, 10), 0, 0, 180, (0, 0, 255), 3)  # Smile
    _, buf = cv2.imencode(".jpg", img)
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")


def test_face_enrollment_and_matching():
    # 1. Login as Superadmin test / test123
    login_res = client.post("/api/v1/auth/login", json={"username": "test", "password": "test123"})
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get face summary
    summary_res = client.get("/api/v1/faces/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "total_employees" in summary
    assert "total_face_templates" in summary

    # 3. Get roster
    roster_res = client.get("/api/v1/faces", headers=headers)
    assert roster_res.status_code == 200
    roster = roster_res.json()
    assert len(roster) > 0
    emp = roster[0]
    emp_id = emp["id"]

    # 4. Enroll 5 face angles: center, left, right, top, bottom
    angles = ["center", "left", "right", "top", "bottom"]
    samples = []
    for idx, angle in enumerate(angles, start=1):
        samples.append({
            "sample_index": idx,
            "angle": angle,
            "image_base64": generate_synthetic_face_base64(pattern_id=idx),
        })

    enroll_res = client.post(
        f"/api/v1/faces/enroll/{emp_id}",
        json={"samples": samples},
        headers=headers,
    )
    assert enroll_res.status_code == 200, enroll_res.text
    assert enroll_res.json()["success"] is True

    # 5. Retrieve enrolled templates
    templates_res = client.get(f"/api/v1/faces/{emp_id}/templates", headers=headers)
    assert templates_res.status_code == 200
    templates = templates_res.json()
    assert len(templates) == 5
    assert set(t["angle"] for t in templates) == set(angles)

    # 6. Verify 1:1 match
    verify_res = client.post(
        "/api/v1/faces/verify",
        json={
            "employee_id": emp_id,
            "image_base64": generate_synthetic_face_base64(pattern_id=1),  # matches center sample
        },
        headers=headers,
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_match"] is True
    assert v_data["confidence_score"] > 0.65

    # 7. Identify 1:N match
    identify_res = client.post(
        "/api/v1/faces/identify",
        json={
            "image_base64": generate_synthetic_face_base64(pattern_id=1),
            "threshold": 0.65,
        },
        headers=headers,
    )
    assert identify_res.status_code == 200
    id_data = identify_res.json()
    assert id_data["is_identified"] is True
    assert id_data["matched_employee"]["id"] == emp_id
    assert id_data["matched_angle"] == "center"

    print("ALL FACE BIOMETRICS & 5-ANGLE TESTS PASSED!")


if __name__ == "__main__":
    test_face_enrollment_and_matching()
