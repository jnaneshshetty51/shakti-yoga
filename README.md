# Shakti Yoga Kendra 🧘‍♂️

Shakti Yoga Kendra is a comprehensive digital platform designed for yoga practitioners, teachers, and administrators. Built with a modern tech stack, it provides a seamless experience for booking classes, managing consultations, and participating in live sessions.

## ✨ Features

- **Class Management**: Browse and book yoga classes with ease.
- **Therapy & Consultations**: Integrated booking system for specialized therapy and consultation sessions.
- **Live Sessions**: Real-time video interaction powered by **Daily.co**.
- **User Dashboard**: Personalized dashboards for students and instructors.
- **Real-time Updates**: Instant notifications and updates using **Socket.io**.
- **Secure Authentication**: Robust authentication system with **Bcryptjs** and **Jose**.
- **Dynamic Media**: Media storage and management via **AWS S3**.
- **Admin Panel**: Comprehensive tools for administrators to manage users, bookings, and content.

## 🚀 Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes, [Prisma ORM](https://www.prisma.io/)
- **Real-time**: [Socket.io](https://socket.io/)
- **Video Conferencing**: [Daily.co](https://www.daily.co/)
- **Storage**: [AWS S3](https://aws.amazon.com/s3/)
- **Database**: PostgreSQL (via Prisma)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS)
- npm or yarn
- Database (PostgreSQL recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jnaneshshetty51/shakti-yoga.git
   cd shakti-yoga
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   - Copy `.env.example` to `.env` (if provided) or create a new `.env` file.
   - Fill in your database URL, AWS credentials, Daily.co API key, etc.

4. Initialize the database:
   ```bash
   npm run db:generate
   npm run db:migrate:dev
   npm run db:seed
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📦 Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint for code quality.
- `npm run db:setup`: Helper script to set up the database.
- `npm run db:studio`: Opens Prisma Studio for database management.

## 📄 License

This project is private and proprietary. All rights reserved.

---

Built with ❤️ for Shakti Yoga Kendra.
