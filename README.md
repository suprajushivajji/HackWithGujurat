# TechSynergy – All-in-One Tech Collaboration Platform

TechSynergy is a full-stack web platform designed to connect freelancers, event organizers, and tech enthusiasts. It provides a seamless experience for finding gigs, managing events, real-time chatting, and building a professional tech community.

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Frontend Overview](#frontend-overview)
- [Setup & Installation](#setup--installation)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **User Authentication** (Email/Password, Google)
- **Freelancing Hub**: Post and find gigs, submit proposals, manage projects
- **Event Management**: Create, discover, and attend tech events with calendar integration
- **Community Chat**: Real-time messaging, group chats, file sharing
- **AI Recommendations**: Personalized gig and event suggestions
- **Gamification**: Earn badges, climb leaderboards, track progress
- **Global Search**: Search gigs, events, and people
- **Notifications**: Real-time and persistent notifications

---

## Project Structure

```
HackWithGujurat/
│
├── project_structure/
│   ├── frontend/         # All frontend code (HTML, CSS, JS)
│   └── backend/          # All backend code (Node.js, Express, MongoDB)
│
├── node_modules/         # Root dependencies
├── .vscode/              # Editor settings
├── .git/                 # Git repository data
├── package.json          # Root project metadata and scripts
├── package-lock.json     # Root dependency lock file
└── .gitattributes        # Git attributes
```

---

## Frontend Overview

- **Location:** `project_structure/frontend/`
- **Tech:** HTML, CSS, JavaScript (Vanilla), Firebase Auth
- **Key Pages:**
  - `index.html`: Landing page
  - `dashboard.html`: User dashboard with stats, quick actions, AI recommendations
  - `profile.html`: User profile, skills, portfolio, contact info
  - `freelancing/gigs.html`: Browse/post gigs, filter, search, manage proposals
  - `events/events.html`: Browse/create events, filter, calendar view
  - `chat/chat.html`: Real-time chat interface (private, group)
  - `register.html` & `login.html`: Auth pages

- **JS Modules:** Located in `js/` (e.g., `dashboard.js`, `gigs.js`, `chat.js`, etc.)
- **CSS:** Modular styles for each feature (e.g., `dashboard.css`, `gigs.css`, `chat.css`, etc.)

---

## Setup & Installation

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd HackWithGujurat
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Open `project_structure/frontend/index.html` in your browser** (or serve with a static server).

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Firebase Auth

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## License

This project is licensed under the ISC License.

---

## Live Demo

You can access the live demo of the project at [https://hack-with-gujurat.vercel.app/chat.html](https://hack-with-gujurat.vercel.app/chat.html).

---

## Important Note

This project is currently a prototype with only the frontend code implemented. The backend code is not yet developed. Any login information provided will redirect to the dashboard page. The project can be scaled later using MongoDB and Firebase.

---

## Additional Information

- **Frontend Features:**
  - **User Authentication:** Simple login and registration with mock functionality.
  - **Dashboard:** Overview of user activity, quick actions, and AI recommendations.
  - **Profile Management:** Edit personal information, skills, and portfolio.
  - **Freelancing:** Browse and post gigs, manage proposals.
  - **Events:** Discover and create tech events with filtering options.
  - **Chat:** Real-time messaging with private and group chat capabilities.
  - **Responsive Design:** Optimized for various screen sizes.

- **Future Enhancements:**
  - Integration with a backend for data persistence and real-time features.
  - Enhanced security and user authentication.
  - Advanced search and recommendation algorithms.
