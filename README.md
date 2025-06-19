# PasteForge

A modern pastebin platform with advanced project management, AI-powered analysis, and collaboration features.

## 🚀 Quick Start

### Development Options

#### Option 1: Use Production Backend (Recommended)
This is the easiest way to get started - no local backend setup required!

```bash
# Install dependencies
npm install

# Start frontend only (uses production backend)
npm run dev
```

#### Option 2: Full Local Development
If you want to run both frontend and backend locally:

```bash
# Install dependencies
npm install

# Set up local backend environment
cp .env.example .env
# Edit .env and set VITE_USE_LOCAL_BACKEND=true

# Start both frontend and backend
npm run dev:full
```

#### Option 3: Backend Only
```bash
# Start just the backend server
npm run server
```

## 🔧 Environment Configuration

### Development (.env)
```env
# Use production backend (default)
VITE_API_BASE_URL=https://pb2-ahh9.onrender.com/api

# OR use local backend (requires local setup)
VITE_USE_LOCAL_BACKEND=true
VITE_API_BASE_URL=http://localhost:3001/api

# Local database (only needed for local backend)
DATABASE_URL=postgresql://localhost:5432/pasteforge
JWT_SECRET=your-super-secret-jwt-key-here
```

### Production (.env.production)
```env
VITE_API_BASE_URL=https://pb2-ahh9.onrender.com/api
```

## 🌐 Deployment

### Backend (Render)
- **URL**: `https://pb2-ahh9.onrender.com`
- **API**: `https://pb2-ahh9.onrender.com/api`

### Frontend (Render)
The frontend automatically detects the environment:
- **Development**: Uses production backend by default (no proxy errors!)
- **Production**: Uses `https://pb2-ahh9.onrender.com/api`

## 🛠️ Development Scripts

```bash
# Frontend only (uses production backend)
npm run dev

# Frontend only (alternative)
npm run dev:frontend

# Backend only
npm run dev:backend

# Both frontend and backend
npm run dev:full

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🔍 Troubleshooting

### ECONNREFUSED Error
If you see "ECONNREFUSED" errors:

1. **Using production backend (recommended)**: Make sure `VITE_USE_LOCAL_BACKEND` is not set to `true`
2. **Using local backend**: Ensure the backend server is running on port 3001

### API Connection Issues
- Check the browser console for API configuration logs
- Verify the `VITE_API_BASE_URL` environment variable
- Ensure CORS is properly configured on the backend

### Local Backend Setup
If you want to run the backend locally:

1. Install PostgreSQL
2. Create a database named `pasteforge`
3. Set `DATABASE_URL` in your `.env` file
4. Set `VITE_USE_LOCAL_BACKEND=true`
5. Run `npm run dev:full`

## ✨ Features

- **Modern Pastebin**: Syntax highlighting for 200+ languages
- **Project Management**: Organize code into collaborative projects
- **AI-Powered Analysis**: Intelligent code summaries and recommendations
- **Dark/Light Theme**: Beautiful themes with smooth transitions
- **User Authentication**: Secure login and registration
- **Admin Dashboard**: Comprehensive admin controls
- **Real-time Notifications**: Stay updated with activity
- **Responsive Design**: Works perfectly on all devices

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, PostgreSQL
- **Deployment**: Render
- **State Management**: Zustand
- **UI Components**: Lucide React, Framer Motion
- **Code Highlighting**: Prism.js

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification

### Pastes
- `GET /api/pastes/recent` - Get recent public pastes
- `GET /api/pastes/archive` - Get paginated paste archive
- `GET /api/pastes/:id` - Get specific paste
- `POST /api/pastes` - Create new paste
- `GET /api/pastes/:id/download` - Download paste as file

### Users
- `GET /api/users/:username` - Get user profile
- `GET /api/users/:username/pastes` - Get user's public pastes

### Admin
- `GET /api/admin/stats` - Get admin dashboard statistics
- `GET /api/admin/users` - Get user list (admin only)
- `GET /api/admin/languages` - Get language statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.