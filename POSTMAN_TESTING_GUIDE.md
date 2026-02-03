# Postman Testing Guide - Work Hours Tracking System

## Prerequisites

1. **Start your server:**
   ```bash
   cd server
   npm start
   # or
   node src/index.js
   ```

2. **Base URL:** `http://localhost:4000`

3. **Seed data available:**
   - Student: `student1@uni.ac.uk` / `student123`
   - Employer: `employer@company.com` / `employer123`
   - Admin: `admin@system.com` / `admin123`

---

## Testing Flow Overview

1. **Setup Phase:** Login and create student profile
2. **Relationship Phase:** Employer requests access, student accepts
3. **Work Hours Phase:** Employer logs hours, student confirms
4. **Verification Phase:** Check weekly hours and compliance

---

## Step-by-Step Testing

### 🔐 PHASE 1: Authentication & Setup

#### 1.1 Login as Student
```
POST http://localhost:4000/auth/login
Headers: Content-Type: application/json
Body (JSON):
{
  "email": "student1@uni.ac.uk",
  "password": "student123"
}
```
**Save the `token` from response** - You'll need it for all student requests!

#### 1.2 Create Student Profile
```
POST http://localhost:4000/students/profile
Headers: 
  Authorization: Bearer <student-token>
  Content-Type: application/json
Body (JSON):
{
  "universityId": "SOUTHAMPTON",
  "visaType": "Student Visa",
  "courseEndDate": "2026-09-01",
  "maxWeeklyHours": 20
}
```

#### 1.3 Login as Employer
```
POST http://localhost:4000/auth/login
Headers: Content-Type: application/json
Body (JSON):
{
  "email": "employer@company.com",
  "password": "employer123"
}
```
**Save the `token` from response** - You'll need it for all employer requests!

---

### 🤝 PHASE 2: Student-Employer Relationships

#### 2.1 Employer Requests Access to Student
```
POST http://localhost:4000/relationships/request
Headers: 
  Authorization: Bearer <employer-token>
  Content-Type: application/json
Body (JSON):
{
  "studentUniversityId": "SOUTHAMPTON"
}
```
**Expected:** Status 201, relationship with status "PENDING"
**Save the `relationship.id` from response**

#### 2.2 Student Views Pending Requests
```
GET http://localhost:4000/relationships/requests
Headers: 
  Authorization: Bearer <student-token>
```
**Expected:** List of pending relationship requests

#### 2.3 Student Accepts Employer Access
```
PUT http://localhost:4000/relationships/:relationshipId/accept
Headers: 
  Authorization: Bearer <student-token>
```
**Replace `:relationshipId` with the ID from step 2.1**
**Expected:** Status 200, relationship with status "ACTIVE"

#### 2.4 Employer Views Their Students
```
GET http://localhost:4000/relationships/my-students
Headers: 
  Authorization: Bearer <employer-token>
```
**Expected:** List of all student relationships

---

### ⏰ PHASE 3: Work Hours Logging

#### 3.1 Employer Logs Work Hours
```
POST http://localhost:4000/work-shifts
Headers: 
  Authorization: Bearer <employer-token>
  Content-Type: application/json
Body (JSON):
{
  "studentUniversityId": "SOUTHAMPTON",
  "date": "2025-02-03",
  "hours": 8.5,
  "description": "Morning shift at restaurant"
}
```
**Expected:** Status 201, work shift with status "PENDING"
**Save the `workShift.id` from response**

#### 3.2 Student Views Their Work Shifts
```
GET http://localhost:4000/work-shifts/me
Headers: 
  Authorization: Bearer <student-token>
```
**Expected:** List of all work shifts (should see the PENDING one)

#### 3.3 Student Views Weekly Hours Summary
```
GET http://localhost:4000/work-shifts/me/weekly
Headers: 
  Authorization: Bearer <student-token>
```
**Expected:** Current week's hours, remaining hours, compliance status

#### 3.4 Student Confirms Work Shift
```
PUT http://localhost:4000/work-shifts/:shiftId/confirm
Headers: 
  Authorization: Bearer <student-token>
```
**Replace `:shiftId` with the ID from step 3.1**
**Expected:** Status 200, work shift with status "CONFIRMED"

#### 3.5 Employer Views Student's Shifts
```
GET http://localhost:4000/work-shifts/student/SOUTHAMPTON
Headers: 
  Authorization: Bearer <employer-token>
```
**Expected:** List of shifts for that student

---

### 📊 PHASE 4: Testing Weekly Limits

#### 4.1 Log Multiple Shifts (Test Weekly Limit)
```
POST http://localhost:4000/work-shifts
Headers: 
  Authorization: Bearer <employer-token>
  Content-Type: application/json
Body (JSON):
{
  "studentUniversityId": "SOUTHAMPTON",
  "date": "2025-02-04",
  "hours": 10,
  "description": "Afternoon shift"
}
```
**Confirm this shift as student (step 3.4)**

#### 4.2 Try to Log Hours That Would Exceed Limit
```
POST http://localhost:4000/work-shifts
Headers: 
  Authorization: Bearer <employer-token>
  Content-Type: application/json
Body (JSON):
{
  "studentUniversityId": "SOUTHAMPTON",
  "date": "2025-02-05",
  "hours": 15,
  "description": "Trying to exceed limit"
}
```
**Expected:** Status 400, error about exceeding weekly limit

#### 4.3 View Weekly Hours Summary Again
```
GET http://localhost:4000/work-shifts/me/weekly
Headers: 
  Authorization: Bearer <student-token>
```
**Expected:** Should show current hours (18.5h if both shifts confirmed), remaining hours

---

### 📜 PHASE 5: Work History & Reports

#### 5.1 Student Views Work History
```
GET http://localhost:4000/work-shifts/me/history
Headers: 
  Authorization: Bearer <student-token>
Query Params (optional):
  ?startDate=2025-01-01&endDate=2025-02-28
```
**Expected:** Work history with weekly breakdown

#### 5.2 Filter Shifts by Status
```
GET http://localhost:4000/work-shifts/me?status=PENDING
Headers: 
  Authorization: Bearer <student-token>
```
**Expected:** Only PENDING shifts

---

### 🔍 PHASE 6: Testing Edge Cases

#### 6.1 Student Rejects a Shift
```
PUT http://localhost:4000/work-shifts/:shiftId/reject
Headers: 
  Authorization: Bearer <student-token>
  Content-Type: application/json
Body (JSON):
{
  "reason": "Hours incorrect"
}
```
**Expected:** Status 200, shift status becomes "REJECTED"

#### 6.2 Check Eligibility (Updated with Actual Hours)
```
POST http://localhost:4000/employer/check-eligibility
Headers: 
  Authorization: Bearer <employer-token>
  Content-Type: application/json
Body (JSON):
{
  "universityId": "SOUTHAMPTON",
  "requestedHours": 5
}
```
**Expected:** Eligibility check including current weekly hours

#### 6.3 Student Deactivates Employer Access
```
PUT http://localhost:4000/relationships/:relationshipId/deactivate
Headers: 
  Authorization: Bearer <student-token>
```
**Expected:** Status 200, relationship status becomes "INACTIVE"

#### 6.4 Try Logging Hours After Deactivation (Should Fail)
```
POST http://localhost:4000/work-shifts
Headers: 
  Authorization: Bearer <employer-token>
  Content-Type: application/json
Body (JSON):
{
  "studentUniversityId": "SOUTHAMPTON",
  "date": "2025-02-06",
  "hours": 4
}
```
**Expected:** Status 403, error about relationship not active

---

### 📋 PHASE 7: Audit Logs

#### 7.1 Admin Views Audit Logs
```
GET http://localhost:4000/audit/audit-logs
Headers: 
  Authorization: Bearer <admin-token>
```
**Expected:** List of all audit logs (should see all operations)

#### 7.2 Admin Views Audit Logs for Specific Student
```
GET http://localhost:4000/audit/audit-logs/student/SOUTHAMPTON
Headers: 
  Authorization: Bearer <admin-token>
```
**Expected:** Audit logs filtered by university ID

---

## Quick Reference: All Endpoints

### Authentication
- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `GET /auth/me` - Get current user

### Student Profile
- `POST /students/profile` - Create profile (STUDENT)

### Relationships
- `POST /relationships/request` - Request access (EMPLOYER)
- `GET /relationships/requests` - View requests (STUDENT)
- `PUT /relationships/:id/accept` - Accept request (STUDENT)
- `PUT /relationships/:id/reject` - Reject request (STUDENT)
- `PUT /relationships/:id/deactivate` - Deactivate (STUDENT)
- `GET /relationships/my-students` - View students (EMPLOYER)
- `GET /relationships/my-employers` - View employers (STUDENT)
- `DELETE /relationships/:id` - Remove relationship (EMPLOYER)

### Work Shifts
- `POST /work-shifts` - Log hours (EMPLOYER)
- `GET /work-shifts/me` - View own shifts (STUDENT)
- `GET /work-shifts/me/weekly` - Weekly summary (STUDENT)
- `GET /work-shifts/me/history` - Work history (STUDENT)
- `GET /work-shifts/student/:universityId` - View student shifts (EMPLOYER)
- `PUT /work-shifts/:id/confirm` - Confirm shift (STUDENT)
- `PUT /work-shifts/:id/reject` - Reject shift (STUDENT)

### Eligibility
- `GET /students/:universityId` - Check eligibility (EMPLOYER)
- `POST /employer/check-eligibility` - Check with hours (EMPLOYER)

---

## Common Issues & Solutions

### Issue: "Student profile not found"
**Solution:** Make sure you created the student profile (Step 1.2)

### Issue: "Relationship not active"
**Solution:** Make sure employer requested access and student accepted it

### Issue: "Would exceed weekly limit"
**Solution:** This is correct behavior! The system prevents exceeding limits

### Issue: 401 Unauthorized
**Solution:** Check your Authorization header: `Bearer <token>`

### Issue: 403 Forbidden
**Solution:** Make sure you're using the correct role's token

---

## Testing Checklist

- [ ] Student can create profile
- [ ] Employer can request access
- [ ] Student can accept/reject requests
- [ ] Employer can log work hours
- [ ] Student can view pending shifts
- [ ] Student can confirm shifts
- [ ] Weekly hours are calculated correctly
- [ ] System prevents exceeding weekly limits
- [ ] Work history shows correct data
- [ ] Audit logs capture all operations
- [ ] Deactivated relationships prevent logging

---

## Tips for Testing

1. **Use Postman Collections:** Create a collection for each role (Student, Employer, Admin)
2. **Environment Variables:** Set up variables for `base_url`, `student_token`, `employer_token`
3. **Test Scripts:** Add scripts to automatically save tokens from login responses
4. **Date Testing:** Use dates in the current week to test weekly calculations
5. **Edge Cases:** Test with 0 hours, negative hours, very large hours, etc.

---

## Expected Weekly Limits

- **In Term Time:** 20 hours/week
- **Outside Term Time:** 40 hours/week
- **Course Ended:** 0 hours/week

Make sure you have terms set up to test term-time vs non-term-time scenarios!

