
import { neon } from '@neondatabase/serverless';
import { CONFIG } from '../config';
import { TeamMember, Task, Meeting, User } from '../types';
import { INITIAL_MEMBERS } from '../constants';

const sql = neon(CONFIG.NEON_DATABASE_URL);

// Initialize Database Schema
export const initDB = async () => {
    try {
        // Users Table for Auth
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                security_question TEXT,
                security_answer TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;
        
        // Migration for existing users table
        try {
             await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question TEXT`;
             await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer TEXT`;
        } catch (e) {
            // Ignore if columns exist
        }

        // Members Table
        await sql`
            CREATE TABLE IF NOT EXISTS members (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                location TEXT NOT NULL,
                timezone TEXT NOT NULL,
                avatar_url TEXT,
                work_start_hour INTEGER,
                work_end_hour INTEGER,
                status_override TEXT,
                bio TEXT,
                skills TEXT[],
                email TEXT,
                github_handle TEXT,
                linkedin_handle TEXT,
                lat FLOAT,
                lng FLOAT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Schema Migration: Add columns if they don't exist (for existing DBs)
        try {
             await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS bio TEXT`;
             await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS skills TEXT[]`;
             await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS email TEXT`;
             await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS github_handle TEXT`;
             await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS linkedin_handle TEXT`;
             await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS lat FLOAT`;
             await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS lng FLOAT`;
        } catch (e) {
            // Ignore errors if columns exist
        }

        // Tasks Table
        await sql`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                due_date TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Meetings Table
        await sql`
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                content_html TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Check if empty, if so seed
        const membersCount = await sql`SELECT count(*) FROM members`;
        if (Number(membersCount[0].count) === 0) {
            console.log("Seeding database...");
            for (const member of INITIAL_MEMBERS) {
                await addMember(member);
                if (member.tasks) {
                    for (const task of member.tasks) {
                        await addTask(member.id, task);
                    }
                }
            }
        }

        // Ensure dev user exists
        const usersCount = await sql`SELECT count(*) FROM users WHERE email = 'dev@aureus.tasking'`;
        if (Number(usersCount[0].count) === 0) {
            console.log("Seeding dev user...");
            await sql`
                INSERT INTO users (id, email, password) 
                VALUES ('dev-user-id', 'dev@aureus.tasking', 'password123')
            `;
        }

        return true;
    } catch (error) {
        console.error("Database Initialization Error:", error);
        throw error;
    }
};

// --- Auth ---

export const registerUser = async (email: string, password: string, securityQuestion?: string, securityAnswer?: string): Promise<User> => {
    // Ensure tables exist before trying to register
    await initDB();
    
    const id = Date.now().toString();
    // In a real app, hash the password!
    await sql`
        INSERT INTO users (id, email, password, security_question, security_answer) 
        VALUES (${id}, ${email}, ${password}, ${securityQuestion || null}, ${securityAnswer || null})
    `;
    return { id, email };
};

export const loginUser = async (email: string, password: string): Promise<User> => {
    // Ensure tables exist before trying to login
    await initDB();

    const users = await sql`SELECT * FROM users WHERE email = ${email} AND password = ${password}`;
    if (users.length === 0) throw new Error("Invalid credentials");
    return { id: users[0].id, email: users[0].email };
};

export const getSecurityQuestion = async (email: string): Promise<string> => {
    await initDB();
    const users = await sql`SELECT security_question FROM users WHERE email = ${email}`;
    if (users.length === 0) throw new Error("User not found");
    if (!users[0].security_question) throw new Error("No security question set for this account");
    return users[0].security_question;
};

export const resetPassword = async (email: string, answer: string, newPassword: string): Promise<boolean> => {
    const users = await sql`SELECT security_answer FROM users WHERE email = ${email}`;
    if (users.length === 0) throw new Error("User not found");
    
    // Case insensitive check
    if (users[0].security_answer.toLowerCase() !== answer.toLowerCase()) {
        throw new Error("Incorrect answer");
    }

    await sql`UPDATE users SET password = ${newPassword} WHERE email = ${email}`;
    return true;
};

// --- Members ---

export const getMembers = async (): Promise<TeamMember[]> => {
    const membersRows = await sql`SELECT * FROM members`;
    const tasksRows = await sql`SELECT * FROM tasks`;

    return membersRows.map((row: any) => {
        const memberTasks = tasksRows
            .filter((t: any) => t.member_id === row.id)
            .map((t: any) => ({
                id: t.id,
                text: t.text,
                completed: t.completed,
                dueDate: t.due_date
            }));

        return {
            id: row.id,
            name: row.name,
            role: row.role,
            location: row.location,
            timezone: row.timezone,
            avatarUrl: row.avatar_url,
            workStartHour: row.work_start_hour,
            workEndHour: row.work_end_hour,
            statusOverride: row.status_override || undefined,
            bio: row.bio || '',
            skills: row.skills || [],
            email: row.email || '',
            githubHandle: row.github_handle || '',
            linkedinHandle: row.linkedin_handle || '',
            lat: row.lat || 0,
            lng: row.lng || 0,
            tasks: memberTasks
        };
    });
};

export const addMember = async (member: TeamMember) => {
    await sql`
        INSERT INTO members (id, name, role, location, timezone, avatar_url, work_start_hour, work_end_hour, status_override, bio, skills, email, github_handle, linkedin_handle, lat, lng)
        VALUES (${member.id}, ${member.name}, ${member.role}, ${member.location}, ${member.timezone}, ${member.avatarUrl}, ${member.workStartHour}, ${member.workEndHour}, ${member.statusOverride || null}, ${member.bio || null}, ${member.skills || null}, ${member.email || null}, ${member.githubHandle || null}, ${member.linkedinHandle || null}, ${member.lat || 0}, ${member.lng || 0})
    `;
};

export const updateMemberInDB = async (id: string, updates: Partial<TeamMember>) => {
    if (updates.name !== undefined) await sql`UPDATE members SET name = ${updates.name} WHERE id = ${id}`;
    if (updates.role !== undefined) await sql`UPDATE members SET role = ${updates.role} WHERE id = ${id}`;
    if (updates.location !== undefined) await sql`UPDATE members SET location = ${updates.location} WHERE id = ${id}`;
    if (updates.timezone !== undefined) await sql`UPDATE members SET timezone = ${updates.timezone} WHERE id = ${id}`;
    if (updates.avatarUrl !== undefined) await sql`UPDATE members SET avatar_url = ${updates.avatarUrl} WHERE id = ${id}`;
    if (updates.workStartHour !== undefined) await sql`UPDATE members SET work_start_hour = ${updates.workStartHour} WHERE id = ${id}`;
    if (updates.workEndHour !== undefined) await sql`UPDATE members SET work_end_hour = ${updates.workEndHour} WHERE id = ${id}`;
    
    // New Fields
    if (updates.bio !== undefined) await sql`UPDATE members SET bio = ${updates.bio} WHERE id = ${id}`;
    if (updates.email !== undefined) await sql`UPDATE members SET email = ${updates.email} WHERE id = ${id}`;
    if (updates.githubHandle !== undefined) await sql`UPDATE members SET github_handle = ${updates.githubHandle} WHERE id = ${id}`;
    if (updates.linkedinHandle !== undefined) await sql`UPDATE members SET linkedin_handle = ${updates.linkedinHandle} WHERE id = ${id}`;
    if (updates.skills !== undefined) await sql`UPDATE members SET skills = ${updates.skills} WHERE id = ${id}`;
    if (updates.lat !== undefined) await sql`UPDATE members SET lat = ${updates.lat} WHERE id = ${id}`;
    if (updates.lng !== undefined) await sql`UPDATE members SET lng = ${updates.lng} WHERE id = ${id}`;

    if (updates.statusOverride !== undefined) {
         const val = updates.statusOverride === undefined ? null : updates.statusOverride;
         await sql`UPDATE members SET status_override = ${val} WHERE id = ${id}`;
    }
};

export const deleteMemberFromDB = async (id: string) => {
    await sql`DELETE FROM members WHERE id = ${id}`;
};

// --- Tasks ---

export const addTask = async (memberId: string, task: Task) => {
    await sql`
        INSERT INTO tasks (id, member_id, text, completed, due_date)
        VALUES (${task.id}, ${memberId}, ${task.text}, ${task.completed}, ${task.dueDate || null})
    `;
};

export const updateTaskInDB = async (taskId: string, updates: Partial<Task>) => {
    if (updates.text !== undefined) await sql`UPDATE tasks SET text = ${updates.text} WHERE id = ${taskId}`;
    if (updates.completed !== undefined) await sql`UPDATE tasks SET completed = ${updates.completed} WHERE id = ${taskId}`;
    if (updates.dueDate !== undefined) await sql`UPDATE tasks SET due_date = ${updates.dueDate} WHERE id = ${taskId}`;
};

export const deleteTaskFromDB = async (taskId: string) => {
    await sql`DELETE FROM tasks WHERE id = ${taskId}`;
};

// --- Meetings ---

export const getMeetings = async (): Promise<Meeting[]> => {
    const rows = await sql`SELECT * FROM meetings ORDER BY date DESC`;
    return rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        date: row.date,
        contentHtml: row.content_html
    }));
};

export const saveMeetingInDB = async (meeting: Meeting) => {
    const exists = await sql`SELECT 1 FROM meetings WHERE id = ${meeting.id}`;
    if (exists.length > 0) {
        await sql`
            UPDATE meetings 
            SET title = ${meeting.title}, date = ${meeting.date}, content_html = ${meeting.contentHtml}
            WHERE id = ${meeting.id}
        `;
    } else {
        await sql`
            INSERT INTO meetings (id, title, date, content_html)
            VALUES (${meeting.id}, ${meeting.title}, ${meeting.date}, ${meeting.contentHtml})
        `;
    }
};

export const deleteMeetingFromDB = async (id: string) => {
    await sql`DELETE FROM meetings WHERE id = ${id}`;
};
    