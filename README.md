# iCash Mobile – Fintech and EdTech Solutions

> iCash is a modern mobile financial hub designed for seamless P2P transfers, iCash purchasing, and automated transaction management. It features a robust dashboard with real-time statistics and a paginated financial history system.

## Key Features

1. Financial Dashboard: Real-time balance updates and quick action shortcuts for buying and withdrawing iCash.

2. P2P Transfers: Secure peer-to-peer transfers using unique user tags (iTags).

3. Transaction Hub: Advanced history with infinite scrolling, server-side search, and date filtering.

4. Analytics & Statistics: Visualized data insights using Pie Charts for income vs. expenditure tracking.

5. Statement Export: Generate and email professional PDF transaction statements.

6. Security First: JWT-based authentication and secure PIN resets for financial operations.
   
7. Online Class sessions: Online class sessions for student, lecturers (instructors) and guest users.

8. Attendance Tracking: Using Bluetooth Low Energy (BLE) for physical lectures attendance tracking.

9. Recorded Lecture Session: Includes pre recorded video lectures capabilities for enhanced learning.
    
11. Lectures create/edit/maintain/tracking: Included capabilities for Lecturers (instuctors) to manage lectures and students enrolled.

12. Create Paid Lectures: Pro and Premium tier students, instructors or guestusers can create paid courses and tracking analysis on iCampus.

13. Posts create/delete/edit/view/comment/like: Provided users with the listed post capabilities.

14. Store purchases: Users can sell softwares, courses, and physical goods on the app, with free shipping for premium users.

15. Ranking: Users (students, lecturers, guestusers) are ranked/graded fairly based on given app procedures and activities.

## Tech Stack
Frontend:

1. React Native (TypeScript)

2. React Navigation (Stack & Tabs)

3. Redux Toolkit (State Management)

4. React Native Paper / Vector Icons (UI Components)

Backend:

1. Node.js & Express.js

2. MongoDB & Mongoose (Aggregation Pipelines for Stats) and dev database.

3. Socket.io (for real time front end and backend communtication).

4. AsyncStorage (Local Session Management).

5. Nodemailer & PDFKit (For Statement Generation and emails).

6. Firebase and firestore (production database)

## Installation & Setup

1. Clone the repository
   
```sh
git clone https://github.com/aniagoluchiemelie77/iCampus-App.git
cd iCampus-App
```
2. Install Dependencies
   
```sh
cd frontend && npm install

# For Backend
cd backend && npm install
```
3. Environment Variables
   Create a .env file:
```sh
#Frontend
PORT=5000
EXCHANGERATE_API_KEY=your_exchangerate_api_key
SERVICE_UUID=your_service_uuid_key
FLUTTERWAVE_CLIENT_EKEY=your_flutterwave_ekey
WEB_CLIENT_ID=your_webclient_id
WEB_CLIENT_SECRET=your_webclient_secret_key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secretkey
GEMINI_API_KEY=your_germini_api_key
VERVE_SEARCH_API_KEY=your_verve_search_key
FLUTTERWAVE_CLIENT_ID=your_flutterwave_client_id
ANDROID_HOME=your_androidsdk_local_urlroute
```

4. Run the Project
```sh
# Using npm
npx react-native run-android # or run-ios
```


