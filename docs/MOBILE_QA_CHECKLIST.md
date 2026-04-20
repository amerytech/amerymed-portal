# Mobile QA Checklist

Use this checklist when validating the AmeryMed client portal on iPhone and Android devices.

## iPhone Safari

- Open the client portal in Safari
- Log in with the QA client user
- Confirm the page loads cleanly with no broken layout
- Scroll to `Send a new document`
- Choose `Insurance Card`
- Tap `Insurance front`
- Tap `Add Photo`
- Confirm Safari opens the camera or camera/photo chooser
- Take a sample photo
- Confirm the file appears in the selected files list
- Tap `Insurance back`
- Tap `Add Photo` again
- Take a second sample photo
- Confirm both files appear in the selected files list
- Remove one file and confirm the list updates correctly
- Add the removed file again
- Enter a patient reference
- Tap `Upload Document`
- Confirm the success message appears
- Confirm the uploaded files appear in client history
- Confirm admin portal shows the same files
- Test client-to-admin chat
- Confirm admin reply appears on the phone

## Android Chrome

- Open the client portal in Chrome
- Log in with the QA client user
- Confirm layout looks correct and buttons are tappable
- Choose `Multi-page packet`
- Tap `Add Photo`
- Confirm Chrome opens the camera or chooser
- Take page 1 photo
- Tap `Add Photo` again
- Take page 2 photo
- Confirm both files appear in the selected files list
- Tap `Browse Files`
- Select another image or sample file from device storage
- Confirm it is added without replacing earlier files
- Tap `Clear all`
- Confirm the list is emptied
- Re-add 2 or 3 files
- Tap `Upload Document`
- Confirm success message appears
- Confirm the files appear in client history
- Confirm the admin portal shows the files
- Test client-to-admin chat
- Confirm two-way chat works

## Shared Mobile Layout Checks

- Hero section does not overflow horizontally
- Capture preset buttons wrap correctly on smaller screens
- `Add Photo` and `Browse Files` buttons are easy to tap
- Selected files list is readable
- Remove buttons work
- Upload button remains visible and usable
- Live feed cards are readable on mobile
- Chat input remains usable without layout breakage

## Shared Upload Flow Checks

- `Insurance front` sets category to `Insurance Card`
- `Insurance back` keeps category as `Insurance Card`
- `Multi-page packet` guidance appears correctly
- Notes prefill behaves correctly for preset flows
- First image preview appears when an image is selected
- Multiple files upload in a single submission flow
- Files appear in admin workflow after upload

## Pass Criteria

- Camera or image picker opens on mobile
- Multiple images can be added
- Files are not unintentionally replaced
- Upload succeeds
- Client history updates
- Admin sees uploads
- Portal messaging continues to work on mobile
