-- ====================================================================
-- MyAI - ChatGPT Clone Database Schema (MySQL 8.0+)
-- ====================================================================

-- 1. Create Database if not exists
CREATE DATABASE IF NOT EXISTS myai_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE myai_db;

-- 2. Users Table
-- Stores user credentials and profile information
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) DEFAULT 'User',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Conversations Table
-- Represents individual chat sessions owned by a user
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversations_user (user_id),
  KEY idx_conversations_updated (updated_at DESC),
  CONSTRAINT fk_conversations_user 
    FOREIGN KEY (user_id) 
    REFERENCES users (id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Messages Table
-- Stores individual message turns (user or assistant) within a conversation
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) NOT NULL,
  conversation_id VARCHAR(36) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content LONGTEXT NOT NULL,
  model VARCHAR(50) DEFAULT 'gemini-3.8-flash',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_conversation (conversation_id),
  KEY idx_messages_created (created_at ASC),
  CONSTRAINT fk_messages_conversation 
    FOREIGN KEY (conversation_id) 
    REFERENCES conversations (id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Sessions Table (for persistent stateful login sessions)
CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user 
    FOREIGN KEY (user_id) 
    REFERENCES users (id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample queries used by MyAI application:
-- Get recent chats for user:
--   SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC;
-- Get messages for chat:
--   SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC;
