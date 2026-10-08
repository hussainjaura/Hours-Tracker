# Quick Test - Copy & Paste into Postman

## 🚀 Fastest Way to Test

### Step 1: Login as Student
```
POST http://localhost:4000/auth/login
Content-Type: application/json

{
  "email": "student1@uni.ac.uk",
  "password": "student123"
}
```
**Copy the token from response → Use as `{{student_token}}`**

---

### Step 2: Create Student Profile
```
POST http://localhost:4000/students/profile
Authorization: Bearer {{student_token}}
Content-Type: application/json

{
  "universityId": "SOUTHAMPTON",
  "visaType": "Student Visa",
  "courseEndDate": "2026-09-01"
}
```

---

### Step 3: Login as Employer
```
POST http://localhost:4000/auth/login
Content-Type: application/json

{
  "email": "employer@company.com",
  "password": "employer123"
}
```
**Copy the token from response → Use as `{{employer_token}}`**

---

### Step 4: Employer Requests Access
```
POST http://localhost:4000/relationships/request
Authorization: Bearer {{employer_token}}
Content-Type: application/json

{
  "studentUniversityId": "SOUTHAMPTON"
}
```
**Copy the `relationship.id` from response → Use as `{{relationship_id}}`**

---

### Step 5: Student Accepts
```
PUT http://localhost:4000/relationships/{{relationship_id}}/accept
Authorization: Bearer {{student_token}}
```

---

### Step 6: Employer Logs Hours
```
POST http://localhost:4000/work-shifts
Authorization: Bearer {{employer_token}}
Content-Type: application/json

{
  "studentUniversityId": "SOUTHAMPTON",
  "date": "2025-02-03",
  "hours": 8.5,
  "description": "Morning shift"
}
```
**Copy the `workShift.id` from response → Use as `{{shift_id}}`**

---

### Step 7: Student Confirms
```
PUT http://localhost:4000/work-shifts/{{shift_id}}/confirm
Authorization: Bearer {{student_token}}
```

---

### Step 8: Check Weekly Hours
```
GET http://localhost:4000/work-shifts/me/weekly
Authorization: Bearer {{student_token}}
```

**Expected Response:**
```json
{
  "totalHours": 8.5,
  "allowedWeeklyHours": 20,
  "remaining": 11.5,
  "inTermTime": false,
  "activeTerm": null,
  "shifts": [...],
  "weekStart": "2025-02-03T00:00:00.000Z",
  "weekEnd": "2025-02-09T23:59:59.999Z"
}
```

---

## ✅ Success Indicators

- ✅ All requests return 200/201 status
- ✅ Weekly hours shows correct total
- ✅ Remaining hours calculated correctly
- ✅ Audit logs are created (check `/audit/audit-logs` as admin)

---

## 🐛 Troubleshooting

**401 Unauthorized?**
- Check Authorization header: `Bearer <token>`
- Make sure token is from login response

**404 Not Found?**
- Make sure server is running on port 4000
- Check endpoint URL is correct

**403 Forbidden?**
- Wrong role token (using student token for employer endpoint)
- Relationship not active (accept the request first)

**400 Bad Request?**
- Check required fields in body
- Verify date format: `YYYY-MM-DD`
- Hours must be between 0 and 24


## Demo accounts with names (created 7 Oct 2026, local dev DB only)

Linked, acknowledged, with one confirmed Autumn 2026/27 term:

- Student: `demo.student.889494@uni.ac.uk` / `DemoPass123!` (Aisha Khan, University ID `DEMO889494`)
- Employer: `demo.employer.889494@company.com` / `DemoPass123!` (James Carter, Kahawa Coffee Ltd)

More demo data (added 8 Oct 2026, password `DemoPass123!` for all), used for the landing page screenshots:

- Employer: `demo.harbour@company.com` (Priya Shah, Harbour Books Ltd), linked to Aisha
- Students linked to James Carter: `demo.daniel@uni.ac.uk` (Daniel Okafor, `DEMO204118`), `demo.mei@uni.ac.uk` (Mei Lin, `DEMO317502`)
- Every demo student has confirmed Autumn, Spring and Summer 2026/27 terms
