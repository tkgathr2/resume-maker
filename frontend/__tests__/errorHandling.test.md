# Error Handling & Validation Test Cases (W3-W4)

## Test Case 1: Token Not Found / Expired
**Scenario**: User visits `/a/invalid-token/form` with non-existent token.

**Expected Behavior**:
1. Loading spinner displayed (Spinner component)
2. After 2-3s, error message appears: "Token not found or expired"
3. Toast notification shows: "Error: http_404" (red background, auto-dismiss after 5s)
4. User cannot submit form
5. Accessibility: Role="status" + aria-live="polite" on Toast

**Component**: ApplicantFormPage + Toast
**Evidence**: 
- [ ] Screenshot of error state
- [ ] Network tab shows GET /api/a/invalid-token returning 404
- [ ] Console shows no errors

---

## Test Case 2: Validation Error - Required Fields
**Scenario**: User clicks submit with empty required fields.

**Expected Behavior**:
1. First invalid field gets focus (auto-scroll to center)
2. Invalid fields highlighted in red with border-red-400 + bg-red-50
3. Each field shows aria-invalid="true" + aria-describedby pointing to error message
4. Toast shows: "3 field(s) required" (red)
5. Submit button remains enabled for retry
6. Spinner does NOT appear (client-side only)

**Component**: ApplicantFormPage
**Evidence**:
- [ ] Screenshot of form with 3+ fields red-highlighted
- [ ] Inspect element shows aria-invalid="true" on input
- [ ] Toast appears + auto-dismisses after 5s

---

## Test Case 3: Server Validation Error - Invalid Email / Phone
**Scenario**: User submits form with valid client-side checks but server rejects due to invalid email format.

**Request**: POST /api/a/{token}/submit with malformed email
**Server Response**: 
```json
{
  "ok": false,
  "error": "Validation failed",
  "fields": ["email", "phone"]
}
```

**Expected Behavior**:
1. Submit button shows Spinner + "Loading" text while sending
2. After 2-3s, submit completes
3. Toast shows: "Error: Validation failed" (red, auto-dismiss)
4. Fields "email" and "phone" get red highlight + error message
5. aria-invalid="true" on those fields
6. Submit button returns to normal state (Spinner removed)
7. User can edit and retry

**Component**: ApplicantFormPage + Toast
**Evidence**:
- [ ] Screenshot of Spinner in submit button
- [ ] Toast notification visible
- [ ] Network tab shows POST /api/a/{token}/submit returning 422 (or 400)
- [ ] Red-highlighted fields show specific error messages

---

## Accessibility Checklist

- [ ] Toast has role="status" + aria-live="polite"
- [ ] Spinner has role="status" + aria-label="Loading"
- [ ] Form inputs have aria-invalid="true" when error state
- [ ] Error messages linked via aria-describedby={fieldId-error}
- [ ] Required indicator has aria-label="required"
- [ ] Submit button has aria-busy="true" when loading
- [ ] Focus trap: first error field auto-focused
- [ ] Color not sole indicator: icons/text also present

---

## Build & Type Safety

✅ npm run type-check: PASSED (0 errors)
✅ npm run build: PASSED (all routes built)

## Files Modified

1. components/Toast.tsx (NEW)
2. components/Spinner.tsx (NEW)
3. lib/useToast.ts (NEW)
4. app/providers.tsx (ToastProvider added)
5. app/a/[token]/form/page.tsx (error handling + a11y)
6. app/auth/signin/SignInView.tsx (error handling + loading state)
7. tailwind.config.js (fadeIn animation)
