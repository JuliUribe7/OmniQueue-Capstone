# OmniQueue – Customer Portal

The customer-facing mobile app for OmniQueue. Built with React Native + Expo. Customers scan a QR code at a business, pick their service, and join the queue from their phone instead of standing in line.

## Setup

```bash
npm install
npm start
```

To view the app:
- Press `w` to open in browser at localhost:8081
- Scan the QR code with the Expo Go app on your phone
- Press `i` / `a` for iOS or Android simulator

## Project Structure

```
app/
  _layout.tsx           sets up navigation
  index.tsx             main screen (all the customer portal UI)

components/queue/
  ServiceCard.tsx       the service option cards on the home screen
  PositionIndicator.tsx big circle showing your spot in line
  WaitTimeDisplay.tsx   the wait time readout
  ProgressBar.tsx       progress bar that fills as you move up
  SnoozeModal.tsx       popup for picking how long to snooze

hooks/
  useQueue.ts           all state and logic for the queue flow

services/
  queueService.ts       backend API calls (using mock data for now)

constants/
  theme.ts              colors, spacing, border radius — edit here not inline
```

## Current Status

The full flow works end-to-end with mock data — service selection, description input, wait time estimate, queue position tracking, snooze, and the "you're up" screen. Queue movement is simulated every 8 seconds for demo purposes.

Still needs:
- Phone number collection before joining
- Real API connected in `queueService.ts` (just swap the base URL)
- Telnyx SMS confirmation on join + when called
- WebSocket for live position updates instead of the fake timer

## Quick Note

No backend needed to run this — it falls back to mock data automatically. The teal accent color is `#0a7ea4` to stay consistent with the rest of the project.
