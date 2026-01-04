# AI Chat Application

A full-stack AI chat application built with Next.js, featuring real-time streaming responses, persistent storage, and GitHub OAuth authentication.

## Features

- ✅ **GitHub OAuth Authentication** - Secure login with GitHub
- ✅ **Real-time Streaming** - AI responses stream in real-time using OpenAI's API
- ✅ **Persistent Storage** - All conversations and messages saved to PostgreSQL
- ✅ **Conversation Management** - Create, view, and delete chat conversations
- ✅ **Clean UI** - Modern, responsive interface with dark theme
- ✅ **Session Management** - Secure user sessions with NextAuth.js

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 with GitHub Provider
- **AI Provider**: Groq (Mixtral-8x7b) with streaming support
- **Additional Libraries**: Groq SDK for streaming

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 20.x or higher
- PostgreSQL database (local or cloud-hosted)
- GitHub account (for OAuth app)
- OpenAI API account

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd ai-chat-app
npm install
```

### 2. Set Up PostgreSQL Database

You can use a local PostgreSQL instance or a cloud provider like:
- [Neon](https://neon.tech/) (Recommended for quick setup)
- [Supabase](https://supabase.com/)
- [Railway](https://railway.app/)
- Local PostgreSQL installation

**For local PostgreSQL:**
```bash
# Create a new database
createdb ai_chat_db
```

### 3. Configure GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: AI Chat Application (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and generate a new **Client Secret**

### 4. Get Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key

### 5. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your credentials:

```env
# Database - Your PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/ai_chat_db"

# NextAuth Configuration
AUTH_SECRET="your-random-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth (from step 3)
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"

# Groq (from step 4)
GROQ_API_KEY="your-groq-api-key"
```

**Generate AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 6. Set Up Database Schema

Run Prisma migrations to create the database tables:

```bash
npx prisma generate
npx prisma db push
```

### 7. Run the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign In**: Click "Sign in with GitHub" on the homepage
2. **Create Chat**: Click "New Chat" to start a new conversation
3. **Send Messages**: Type your message and press Send or Enter
4. **View History**: All conversations are saved in the sidebar
5. **Delete Chats**: Hover over a conversation and click the delete icon
6. **Sign Out**: Click the "Sign Out" button in the sidebar

## Architecture & Design Decisions

### Database Schema

The application uses a normalized PostgreSQL schema with four main models:

1. **User**: Stores GitHub OAuth user information
2. **Account**: OAuth provider account details
3. **Session**: User session management
4. **Conversation**: Chat sessions with title and timestamps
5. **Message**: Individual messages (user and AI) within conversations

**Key relationships:**
- One-to-many: User → Conversations
- One-to-many: Conversation → Messages
- Cascade delete: Deleting a conversation removes all its messages

### Streaming Implementation

The streaming functionality uses:
- **Groq Streaming API**: Real-time token generation
- **Custom ReadableStream**: Efficient streaming implementation
- **Edge Runtime**: Fast, low-latency responses
- **React Hooks**: State management for streaming UI updates

**How it works:**
1. User sends a message
2. Message saved to database
3. Groq API called with streaming enabled
4. Tokens stream to the client in real-time
5. Complete response saved to database when streaming finishes

### Authentication Flow

- NextAuth.js v5 (Auth.js) with GitHub provider
- Prisma adapter for database sessions
- Middleware protects chat routes
- Server-side session validation on all API routes

### State Management

- **Server Components**: Initial data fetching (conversations)
- **Client Components**: Interactive chat interface with React state
- **API Routes**: CRUD operations for conversations and messages

## API Endpoints

### Authentication
- `GET/POST /api/auth/*` - NextAuth.js authentication routes

### Conversations
- `GET /api/conversations` - Get all user conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[id]` - Get specific conversation with messages
- `PATCH /api/conversations/[id]` - Update conversation title
- `DELETE /api/conversations/[id]` - Delete conversation

### Chat
- `POST /api/chat` - Send message and get streaming AI response

## Project Structure

```
ai-chat-app/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth handlers
│   │   ├── chat/route.ts                # Streaming chat endpoint
│   │   └── conversations/               # Conversation CRUD
│   ├── chat/page.tsx                    # Main chat interface
│   ├── layout.tsx                       # Root layout
│   └── page.tsx                         # Landing page
├── components/
│   ├── chat-interface.tsx               # Main chat UI component
│   ├── sign-in.tsx                      # GitHub sign-in button
│   └── sign-out.tsx                     # Sign-out button
├── lib/
│   └── prisma.ts                        # Prisma client singleton
├── prisma/
│   └── schema.prisma                    # Database schema
├── types/
│   └── next-auth.d.ts                   # NextAuth type extensions
├── auth.ts                              # NextAuth configuration
├── middleware.ts                        # Route protection
└── .env.local                           # Environment variables
```

## Development Notes

### Database Migrations

When modifying the Prisma schema:

```bash
npx prisma db push          # Push schema changes
npx prisma generate         # Regenerate Prisma Client
npx prisma studio           # Open database GUI
```

### Troubleshooting

**Issue: Database connection fails**
- Check your `DATABASE_URL` format
- Ensure PostgreSQL is running
- Verify database credentials

**Issue: GitHub OAuth not working**
- Verify callback URL matches exactly
- Check CLIENT_ID and CLIENT_SECRET
- Ensure AUTH_SECRET is set

**Issue: OpenAI API errors**
- Verify API key is valid
- Check your OpenAI account has credits
- Ensure you're using the correct model name

**Issue: Streaming not working**
- Ensure you're using Edge runtime
- Check browser console for errors
- Verify OpenAI API key permissions

## Time Tracking

**Total Development Time: ~4-5 hours**

- Project setup and configuration: 30 minutes
- Database schema design: 30 minutes
- Authentication implementation: 45 minutes
- API routes development: 1 hour
- Chat interface UI: 1.5 hours
- Streaming integration: 45 minutes
- Testing and bug fixes: 45 minutes
- Documentation: 30 minutes

## Future Enhancements

Potential features to add:

- [ ] **Message Editing/Deletion**: Edit or delete individual messages
- [ ] **Conversation Sharing**: Share conversations via public links
- [ ] **Multiple AI Providers**: Support for Anthropic, Cohere, etc.
- [ ] **Rate Limiting**: Prevent abuse with request throttling
- [ ] **Message Search**: Search across all conversations
- [ ] **Conversation Metadata**: Custom tags, favorites, folders
- [ ] **Voice Input**: Speech-to-text for messages
- [ ] **Export Conversations**: Download as PDF or markdown
- [ ] **User Preferences**: Theme selection, font size, etc.
- [ ] **Typing Indicators**: Show when AI is "thinking"

## Contributing

This is a demonstration project. Feel free to fork and modify as needed.

## License

MIT License - feel free to use this project for learning or as a base for your own applications.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code comments
3. Check Next.js, NextAuth, and Prisma documentation

---

Built with ❤️ using Next.js, OpenAI, and PostgreSQL
#   a i - c h a t - a p p  
 #   a i - c h a t - a p p  
 #   a i - c h a t - a p p  
 