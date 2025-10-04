import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import {RedisStore} from 'connect-redis';
import { createClient } from 'redis';
import cors from 'cors';
import dotenv from 'dotenv';
import {randomUUID} from "node:crypto";

dotenv.config();

console.info({Environment: process.env.NODE_ENV, Domain: process.env.DOMAIN});

interface UserSession {
  user?: {
    id?: string;
    name?: string;
    email: string;
  }
}

declare module 'express-session' {
  interface SessionData extends UserSession {}
}

const app = express();

// Redis client setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Session setup with Redis store
app.use(session({
  store: new RedisStore({ 
    client: redisClient,
    prefix: '_SSID:'
  }),
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  name: '_SSID',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : 'localhost',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  }
}));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the API' });
});

app.get('/user/data', (req: Request, res: Response) => {
  if (req.session.user) {
    res.json({
      success: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }
});

app.post('/user/signup', (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // TODO: Add real user creation logic here
    // For now, just mock a successful response
    const user = {
      id: randomUUID(),
      name,
      email
    };

    // Store user in session
    req.session.user = user;

    res.status(201).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Signup failed'
    });
  }
});

app.post('/user/signin', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // TODO: Add real authentication logic here
    // For now, just mock a successful response
    const user = {
      id: randomUUID(),
      name: 'Test User',
      email
    };

    // Store user in session
    req.session.user = user;

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
