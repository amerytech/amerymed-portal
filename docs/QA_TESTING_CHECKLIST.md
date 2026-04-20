# AmeryMed QA Testing Checklist

## Login

- Client login succeeds with QA client user
- Admin login succeeds with QA admin user
- Wrong-role users are redirected correctly
- Logout returns to the correct login page

## Client Portal

- Welcome banner shows physician / practice identity correctly
- Upload form loads without disabled state when profile is linked
- File selection works
- Category, patient reference, and notes save correctly
- Upload success message appears
- New upload appears in recent history
- Duplicate detection warning appears when expected
- Live feed cards load in one-row layout
- Live feed labels show in red
- Portal messaging input allows typing
- Client can send a message to admin
- Client receives admin reply

## Admin Portal

- Admin dashboard loads without role error
- Upload list shows new client uploads
- Admin can review and act on files
- Audit log shows admin-side activity
- Admin messaging thread list loads
- Admin can reply to client chat
- Admin reply bubble styling displays correctly

## Responsive Testing

- Client login page works on desktop
- Admin login page works on desktop
- Client portal works on desktop
- Admin portal works on desktop
- Client portal works on iPhone / Safari
- Client portal works on Android / Chrome
- Messaging layout remains usable on smaller screens

## Notifications

- Upload still succeeds even if email service is temporarily unavailable
- After Resend verification, upload notification email sends successfully

