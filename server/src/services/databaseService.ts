import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface BackupSession {
  id?: number;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalSize: number;
  sourceDirectory: string;
  destination: 'local' | 's3';
  destinationPath?: string;
}

export interface FileUpload {
  id?: number;
  sessionId: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'inProgress' | 'completed' | 'failed';
  uploadTime?: string;
  errorMessage?: string;
}

class DatabaseService {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = path.join(dataDir, 'photo-backup.db');
    this.db = new Database(this.dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database and create tables if they don't exist
   */
  private initializeDatabase(): void {
    // Create backup_sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS backup_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'stopped', 'failed')),
        total_files INTEGER NOT NULL DEFAULT 0,
        completed_files INTEGER NOT NULL DEFAULT 0,
        failed_files INTEGER NOT NULL DEFAULT 0,
        total_size INTEGER NOT NULL DEFAULT 0,
        source_directory TEXT NOT NULL,
        destination TEXT NOT NULL DEFAULT 's3' CHECK(destination IN ('local', 's3')),
        destination_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add destination columns if they don't exist (migration)
    try {
      this.db.exec(`
        ALTER TABLE backup_sessions ADD COLUMN destination TEXT NOT NULL DEFAULT 's3' CHECK(destination IN ('local', 's3'));
      `);
    } catch (e) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`
        ALTER TABLE backup_sessions ADD COLUMN destination_path TEXT;
      `);
    } catch (e) {
      // Column already exists, ignore
    }

    // Create file_uploads table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'inProgress', 'completed', 'failed')),
        upload_time TEXT,
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES backup_sessions(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_backup_sessions_status ON backup_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_backup_sessions_start_time ON backup_sessions(start_time DESC);
      CREATE INDEX IF NOT EXISTS idx_file_uploads_session_id ON file_uploads(session_id);
      CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(status);
    `);

    console.log('Database initialized successfully at:', this.dbPath);
  }

  /**
   * Create a new backup session
   */
  public createBackupSession(session: Omit<BackupSession, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO backup_sessions (start_time, status, total_files, completed_files, failed_files, total_size, source_directory, destination, destination_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      session.startTime,
      session.status,
      session.totalFiles,
      session.completedFiles,
      session.failedFiles,
      session.totalSize,
      session.sourceDirectory,
      session.destination,
      session.destinationPath || null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Update a backup session
   */
  public updateBackupSession(id: number, session: Partial<BackupSession>): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (session.endTime !== undefined) {
      updates.push('end_time = ?');
      values.push(session.endTime);
    }
    if (session.status !== undefined) {
      updates.push('status = ?');
      values.push(session.status);
    }
    if (session.totalFiles !== undefined) {
      updates.push('total_files = ?');
      values.push(session.totalFiles);
    }
    if (session.completedFiles !== undefined) {
      updates.push('completed_files = ?');
      values.push(session.completedFiles);
    }
    if (session.failedFiles !== undefined) {
      updates.push('failed_files = ?');
      values.push(session.failedFiles);
    }
    if (session.totalSize !== undefined) {
      updates.push('total_size = ?');
      values.push(session.totalSize);
    }

    if (updates.length === 0) return;

    values.push(id);
    const stmt = this.db.prepare(`
      UPDATE backup_sessions
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Get a backup session by ID
   */
  public getBackupSession(id: number): BackupSession | null {
    const stmt = this.db.prepare(`
      SELECT id, start_time as startTime, end_time as endTime, status,
             total_files as totalFiles, completed_files as completedFiles,
             failed_files as failedFiles, total_size as totalSize,
             source_directory as sourceDirectory, destination,
             destination_path as destinationPath
      FROM backup_sessions
      WHERE id = ?
    `);

    return stmt.get(id) as BackupSession | null;
  }

  /**
   * Get all backup sessions
   */
  public getAllBackupSessions(limit: number = 50): BackupSession[] {
    const stmt = this.db.prepare(`
      SELECT id, start_time as startTime, end_time as endTime, status,
             total_files as totalFiles, completed_files as completedFiles,
             failed_files as failedFiles, total_size as totalSize,
             source_directory as sourceDirectory, destination,
             destination_path as destinationPath
      FROM backup_sessions
      ORDER BY start_time DESC
      LIMIT ?
    `);

    return stmt.all(limit) as BackupSession[];
  }

  /**
   * Get the most recent backup session
   */
  public getLatestBackupSession(): BackupSession | null {
    const stmt = this.db.prepare(`
      SELECT id, start_time as startTime, end_time as endTime, status,
             total_files as totalFiles, completed_files as completedFiles,
             failed_files as failedFiles, total_size as totalSize,
             source_directory as sourceDirectory, destination,
             destination_path as destinationPath
      FROM backup_sessions
      ORDER BY start_time DESC
      LIMIT 1
    `);

    return stmt.get() as BackupSession | null;
  }

  /**
   * Create a new file upload record
   */
  public createFileUpload(fileUpload: Omit<FileUpload, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO file_uploads (session_id, file_path, file_name, file_size, status, upload_time, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      fileUpload.sessionId,
      fileUpload.filePath,
      fileUpload.fileName,
      fileUpload.fileSize,
      fileUpload.status,
      fileUpload.uploadTime || null,
      fileUpload.errorMessage || null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Update a file upload record
   */
  public updateFileUpload(id: number, fileUpload: Partial<FileUpload>): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (fileUpload.status !== undefined) {
      updates.push('status = ?');
      values.push(fileUpload.status);
    }
    if (fileUpload.uploadTime !== undefined) {
      updates.push('upload_time = ?');
      values.push(fileUpload.uploadTime);
    }
    if (fileUpload.errorMessage !== undefined) {
      updates.push('error_message = ?');
      values.push(fileUpload.errorMessage);
    }

    if (updates.length === 0) return;

    values.push(id);
    const stmt = this.db.prepare(`
      UPDATE file_uploads
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Get file uploads for a specific session
   */
  public getFileUploadsBySession(sessionId: number): FileUpload[] {
    const stmt = this.db.prepare(`
      SELECT id, session_id as sessionId, file_path as filePath,
             file_name as fileName, file_size as fileSize, status,
             upload_time as uploadTime, error_message as errorMessage
      FROM file_uploads
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);

    return stmt.all(sessionId) as FileUpload[];
  }

  /**
   * Get file upload by ID
   */
  public getFileUpload(id: number): FileUpload | null {
    const stmt = this.db.prepare(`
      SELECT id, session_id as sessionId, file_path as filePath,
             file_name as fileName, file_size as fileSize, status,
             upload_time as uploadTime, error_message as errorMessage
      FROM file_uploads
      WHERE id = ?
    `);

    return stmt.get(id) as FileUpload | null;
  }

  /**
   * Bulk create file uploads for a session
   */
  public bulkCreateFileUploads(fileUploads: Omit<FileUpload, 'id'>[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO file_uploads (session_id, file_path, file_name, file_size, status, upload_time, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((uploads: Omit<FileUpload, 'id'>[]) => {
      for (const upload of uploads) {
        stmt.run(
          upload.sessionId,
          upload.filePath,
          upload.fileName,
          upload.fileSize,
          upload.status,
          upload.uploadTime || null,
          upload.errorMessage || null
        );
      }
    });

    transaction(fileUploads);
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Get database path
   */
  public getDbPath(): string {
    return this.dbPath;
  }
}

// Export a singleton instance
export const databaseService = new DatabaseService();
