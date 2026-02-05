# Term Times & Work Hours Compliance – System Rules

This document defines how **academic term times**, **work hour limits**, and **legal compliance** work in the International Student Hours Tracking Application.

This file is a **source of truth** for system logic and must be followed exactly.

---

## 1. Academic Terms Model

A student academic year is divided into **three terms**:

- Autumn Term
- Spring Term
- Summer Term

Each term has:
- a start date
- an end date

A student may have **multiple terms over multiple years**.

⚠️ **Important**
- There is NO single global term.
- Term dates are **student-declared** and may differ between universities.
- The system must support **multiple terms per student**.

---

## 2. Term Time vs Non-Term Time

The system distinguishes between two states:

### Term Time
A date is considered **term time** if:
- It falls within ANY declared academic term for the student.

### Non-Term Time (Vacation / Holiday)
A date is considered **non-term time** if:
- It does NOT fall within any declared term.

---

## 3. Legal Work Hour Rules (UK Student Visa)

### During Term Time
- Maximum allowed work: **20 hours per week**
- Working more than 20 hours is **illegal**
- Employers must NOT schedule more than 20 hours

### Outside Term Time
- Students may work **full-time**
- No weekly hour cap enforced by the system

---

## 4. System Enforcement Rules

### The system MUST:
- Calculate weekly hours based on student-declared term dates
- Clearly flag weeks as:
  - `TERM_TIME`
  - `NON_TERM_TIME`
- Apply a **20-hour weekly cap ONLY during term time**
- Log all confirmations and calculations for audit purposes

### The system MUST NOT:
- Guess term dates automatically
- Pull official university calendars
- Claim legal authority over visa rules
- Override student-declared information

---

## 5. Illegal Scenarios (Must Be Flagged)

The following scenarios are **non-compliant and illegal**:

- Employer schedules >20 hours during term time
- Student works >20 hours during term time
- Employer ignores a term-time warning

When this occurs, the system must:
- Flag a **compliance violation**
- Record the violation in audit logs
- Preserve evidence for employer due diligence

---

## 6. Student Confirmation (Critical Legal Requirement)

### Why confirmation exists
The system is **not legally authoritative**.

Only the student can confirm:
- Their university status
- Their term dates
- Their visa conditions

### Student confirmation means:
> “I confirm that the term dates and work eligibility I have declared are correct as of this date.”

This confirmation:
- Protects the platform
- Protects the employer
- Assigns legal responsibility correctly

---

## 7. Employer Responsibility

Employers use the system to:
- Check declared eligibility
- View weekly allowed hours
- Store compliance evidence

Employers are **not guaranteed truth** — they are guaranteed:
- Proof of due diligence
- Recorded student confirmations
- Calculated limits based on declared data

This is sufficient for legal compliance.

---

## 8. Key Compliance Principle

🚨 **This application is a compliance evidence system, NOT a legal authority.**

The system:
- Records
- Calculates
- Flags risks
- Stores confirmations

It does NOT:
- Decide visa legality
- Replace legal advice
- Guarantee compliance outcomes

---

## 9. Summary (Non-Negotiable Rules)

- Term time = max 20 hours/week
- Non-term time = full-time allowed
- >20 hours during term time is illegal
- Term dates are student-declared
- Student confirmation is mandatory
- Employers rely on audit logs, not guarantees

These rules must be enforced consistently across:
- Backend logic
- UI warnings
- Audit logging
- Employer views
