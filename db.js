/**
 * db.js - Article Website Database & Authentication Engine
 * Handles persistent storage of users, active sessions, and custom articles.
 */

// ==========================================================================
// SUPABASE CLOUD DATABASE CONFIGURATION
// Project: "POV by youth" (https://pyhceptcqhwdyhvpykbj.supabase.co)
// ==========================================================================
const SUPABASE_URL = 'https://pyhceptcqhwdyhvpykbj.supabase.co';
// >>> REPLACE THE STRING BELOW WITH YOUR SUPABASE ANON PUBLIC KEY <<<
const SUPABASE_ANON_KEY = 'sb_publishable_0mOtqjP2g0YUu5T5aHHaPw_Jj3Vkm7Z';

const DB = (function() {
    const USERS_KEY = 'article_website_users';
    const SESSION_KEY = 'article_website_session';
    const ARTICLES_KEY = 'custom_articles';
    const DELETED_KEY = 'deleted_articles';
    const EDITORIAL_PICKS_KEY = 'article_website_editorial_picks';
    const EDITORIAL_PICKS_CLOUD_TABLE = 'editorial_picks';
    const CONTACT_MESSAGES_KEY = 'article_website_contact_messages';
    const PROJECTS_KEY = 'article_website_projects';
    const PROFILES_KEY = 'article_website_profiles';

    // ==========================================================================
    // Supabase Client & Cloud Synchronization Engine
    // ==========================================================================
    let supabaseClient = null;

    function isSupabaseConfigured() {
        return (
            typeof supabase !== 'undefined' &&
            typeof supabase.createClient === 'function' &&
            typeof SUPABASE_ANON_KEY === 'string' &&
            SUPABASE_ANON_KEY !== 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE' &&
            SUPABASE_ANON_KEY.trim().length > 20
        );
    }

    function getSupabaseClient() {
        if (!supabaseClient && isSupabaseConfigured()) {
            try {
                supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('⚡ Connected to Supabase Cloud: "POV by youth"');
            } catch (err) {
                console.error('Failed to initialize Supabase client:', err);
            }
        }
        return supabaseClient;
    }

    // Mapping Helpers between JS Domain Objects and Supabase Cloud Tables
    function articleToRow(a) {
        return {
            id: String(a.id),
            title: a.title || 'Untitled Article',
            subtitle: a.subtitle || '',
            description: a.description || '',
            author: a.author || 'Anonymous',
            author_id: a.authorId || a.author_id || null,
            date: a.date || null,
            image: a.image || null,
            read_time: parseInt(a.readTime || a.read_time, 10) || 5,
            body: a.body || '',
            keywords: Array.isArray(a.keywords) ? a.keywords : [],
            bibliography: a.bibliography || '',
            project_id: a.projectId || a.project_id || null
        };
    }

    function rowToArticle(r) {
        return {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle || '',
            description: r.description || '',
            author: r.author,
            authorId: r.author_id || r.authorId,
            author_id: r.author_id,
            date: r.date,
            image: r.image,
            readTime: r.read_time || r.readTime || 5,
            read_time: r.read_time,
            body: r.body,
            keywords: Array.isArray(r.keywords) ? r.keywords : (typeof r.keywords === 'string' ? JSON.parse(r.keywords || '[]') : []),
            bibliography: r.bibliography || '',
            projectId: r.project_id || r.projectId || null,
            createdAt: r.created_at
        };
    }

    function projectToRow(p) {
        return {
            id: String(p.id),
            title: p.title || 'Untitled Project',
            subtitle: p.subtitle || '',
            description: p.description || '',
            author: p.author || 'Anonymous',
            author_id: p.authorId || p.author_id || null,
            author_role: p.authorRole || p.author_role || null,
            collaborator_id: p.collaboratorId || p.collaborator_id || null,
            collaborator_name: p.collaboratorName || p.collaborator_name || null,
            collaborator_role: p.collaboratorRole || p.collaborator_role || null,
            cover: p.cover || null,
            categories: Array.isArray(p.categories) ? p.categories : [],
            parts: Array.isArray(p.parts) ? p.parts : []
        };
    }

    function rowToProject(r) {
        return {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle || '',
            description: r.description || '',
            author: r.author,
            authorId: r.author_id,
            authorRole: r.author_role,
            collaboratorId: r.collaborator_id,
            collaboratorName: r.collaborator_name,
            collaboratorRole: r.collaborator_role,
            cover: r.cover,
            categories: Array.isArray(r.categories) ? r.categories : (typeof r.categories === 'string' ? JSON.parse(r.categories || '[]') : []),
            parts: Array.isArray(r.parts) ? r.parts : (typeof r.parts === 'string' ? JSON.parse(r.parts || '[]') : []),
            createdAt: r.created_at,
            updatedAt: r.updated_at
        };
    }

    function profileToRow(prof, user) {
        const cleanName = (prof.name || user?.name || '').trim();
        const users = getAllUsers();
        const matchingUser = users.find(u => (u.name && u.name.trim().toLowerCase() === cleanName.toLowerCase()) || (u.id && String(u.id) === String(prof.id)));
        const defaultEmail = cleanName ? `${cleanName.toLowerCase().replace(/\s+/g, '.')}@articlewebsite.com` : 'contributor@articlewebsite.com';
        
        const finalId = String(prof.id || matchingUser?.id || (user?.name?.toLowerCase() === cleanName.toLowerCase() ? user.id : null) || ('prof-' + (cleanName || 'user').toLowerCase().replace(/\s+/g, '-')));
        const finalEmail = matchingUser?.email || prof.email || (user?.name?.toLowerCase() === cleanName.toLowerCase() ? user.email : null) || defaultEmail;

        return {
            id: finalId,
            name: cleanName,
            email: finalEmail,
            password: matchingUser?.password || prof.password || (user?.name?.toLowerCase() === cleanName.toLowerCase() ? user.password : null),
            role: matchingUser?.role || prof.role || 'writer',
            bio: prof.bio || matchingUser?.bio || '',
            avatar: prof.avatar || matchingUser?.avatar || null,
            instagram: prof.instagram || matchingUser?.instagram || '',
            linkedin: prof.linkedin || matchingUser?.linkedin || '',
            public_email: prof.publicEmail || prof.public_email || matchingUser?.publicEmail || ''
        };
    }

    function rowToProfile(r) {
        return {
            id: r.id,
            name: r.name,
            email: r.email,
            password: r.password,
            role: r.role,
            bio: r.bio,
            avatar: r.avatar,
            instagram: r.instagram,
            linkedin: r.linkedin,
            publicEmail: r.public_email,
            public_email: r.public_email,
            createdAt: r.created_at
        };
    }

    function messageToRow(m) {
        return {
            id: String(m.id),
            name: m.name || '',
            email: m.email || '',
            subject: m.subject || 'General Inquiry',
            message: m.message || '',
            timestamp: m.timestamp || new Date().toISOString(),
            read: !!m.read,
            read_by: Array.isArray(m.readBy) ? m.readBy : (Array.isArray(m.read_by) ? m.read_by : [])
        };
    }

    function rowToMessage(r) {
        return {
            id: r.id,
            name: r.name,
            email: r.email,
            subject: r.subject,
            message: r.message,
            timestamp: r.timestamp,
            read: !!r.read,
            readBy: Array.isArray(r.read_by) ? r.read_by : (Array.isArray(r.readBy) ? r.readBy : [])
        };
    }

    function isDummyItem(item) {
        if (!item) return false;
        const strId = String(item.id || '').trim();
        if (['0', '1', '2', '3', 'proj-atlantic-world', 'proj-colonial-culture'].includes(strId)) return true;
        const title = (item.title || '').trim().toLowerCase();
        if (title.includes('demographic collapse')) return true;
        if (title.includes('mercantilism')) return true;
        if (title.includes('racial classes and social stratification')) return true;
        if (title.includes('technological and cultural exchanges')) return true;
        if (title.includes('the atlantic world')) return true;
        if (title.includes('colonial social orders')) return true;
        return false;
    }

    // Cloud background sync
    let isSyncingCloud = false;
    async function syncCloudData() {
        if (!isSupabaseConfigured() || isSyncingCloud) return;
        const client = getSupabaseClient();
        if (!client) return;

        isSyncingCloud = true;
        try {
            // 1. Articles Sync
            const { data: cloudArticles, error: artError } = await client.from('articles').select('*');
            if (!artError && Array.isArray(cloudArticles)) {
                // Delete dummy articles from Supabase Cloud
                for (const row of cloudArticles) {
                    if (isDummyItem(row)) {
                        console.log('Purging dummy article from Supabase cloud:', row.id, row.title);
                        client.from('articles').delete().eq('id', row.id).then(() => {});
                    }
                }

                const validCloud = cloudArticles.filter(row => !isDummyItem(row));
                const localArticles = getCustomArticles();
                const localMap = new Map();
                localArticles.forEach(a => localMap.set(String(a.id), a));
                validCloud.forEach(row => {
                    const mapped = rowToArticle(row);
                    if (!isDummyItem(mapped)) {
                        localMap.set(String(mapped.id), mapped);
                    }
                });
                const mergedArticles = Array.from(localMap.values()).filter(a => !isDummyItem(a));
                try {
                    localStorage.setItem(ARTICLES_KEY, JSON.stringify(mergedArticles));
                } catch (e) {}
            }

            // 2. Projects Sync
            const { data: cloudProjects, error: projError } = await client.from('projects').select('*');
            if (!projError && Array.isArray(cloudProjects)) {
                // Delete dummy projects from Supabase Cloud
                for (const row of cloudProjects) {
                    if (isDummyItem(row)) {
                        console.log('Purging dummy project from Supabase cloud:', row.id, row.title);
                        client.from('projects').delete().eq('id', row.id).then(() => {});
                    }
                }

                const validCloudProjects = cloudProjects.filter(row => !isDummyItem(row));
                const mappedProjects = validCloudProjects.map(rowToProject).filter(p => !isDummyItem(p));
                const localProjects = getProjects();
                const projMap = new Map();
                mappedProjects.forEach(p => projMap.set(String(p.id), p));
                localProjects.forEach(p => {
                    if (!projMap.has(String(p.id)) && !isDummyItem(p)) {
                        projMap.set(String(p.id), p);
                    }
                });
                const finalProjects = Array.from(projMap.values()).filter(p => !isDummyItem(p));
                try {
                    localStorage.setItem(PROJECTS_KEY, JSON.stringify(finalProjects));
                } catch (e) {}
            }

            // 3. Profiles Sync
            const { data: cloudProfiles, error: profError } = await client.from('profiles').select('*');
            if (!profError && Array.isArray(cloudProfiles)) {
                if (cloudProfiles.length > 0) {
                    let customProfiles = {};
                    try {
                        customProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
                    } catch (e) {}
                    cloudProfiles.forEach(row => {
                        const mapped = rowToProfile(row);
                        if (mapped.name) {
                            customProfiles[mapped.name.toLowerCase()] = {
                                ...(customProfiles[mapped.name.toLowerCase()] || {}),
                                ...mapped
                            };
                        }
                    });
                    try {
                        localStorage.setItem(PROFILES_KEY, JSON.stringify(customProfiles));
                    } catch (e) {}

                    // Also sync cloud profiles into local users and active session
                    try {
                        const localUsers = getAllUsers();
                        let usersChanged = false;
                        cloudProfiles.forEach(row => {
                            const mapped = rowToProfile(row);
                            const cleanName = (mapped.name || '').trim();
                            if (!cleanName || cleanName.startsWith('[SYSTEM]')) return;

                            let u = localUsers.find(user => 
                                (user.name && user.name.trim().toLowerCase() === cleanName.toLowerCase()) || 
                                (user.id && String(user.id) === String(mapped.id)) ||
                                (user.email && mapped.email && user.email.trim().toLowerCase() === mapped.email.trim().toLowerCase())
                            );

                            const mappedRole = (mapped.role || '').trim().toLowerCase();
                            const normalizedMappedRole = (mappedRole === 'co-founder' || mappedRole === 'co founder' || mappedRole === 'cofounder') ? 'co-founder' : (mappedRole === 'admin' ? 'admin' : (mappedRole === 'writer' ? 'writer' : 'editor'));

                            if (u) {
                                if (mapped.password && u.password !== mapped.password) { u.password = mapped.password; usersChanged = true; }
                                if (normalizedMappedRole && u.role !== normalizedMappedRole) { u.role = normalizedMappedRole; usersChanged = true; }
                                if (mapped.avatar && u.avatar !== mapped.avatar) { u.avatar = mapped.avatar; usersChanged = true; }
                                if (mapped.bio && u.bio !== mapped.bio) { u.bio = mapped.bio; usersChanged = true; }
                                if (mapped.instagram !== undefined && u.instagram !== mapped.instagram) { u.instagram = mapped.instagram; usersChanged = true; }
                                if (mapped.linkedin !== undefined && u.linkedin !== mapped.linkedin) { u.linkedin = mapped.linkedin; usersChanged = true; }
                                if (mapped.publicEmail !== undefined && u.publicEmail !== mapped.publicEmail) { u.publicEmail = mapped.publicEmail; usersChanged = true; }
                            } else {
                                localUsers.push({
                                    id: mapped.id || ('user-' + Date.now()),
                                    name: cleanName,
                                    email: mapped.email || `${cleanName.toLowerCase().replace(/\s+/g, '.')}@articlewebsite.com`,
                                    password: mapped.password || null,
                                    role: normalizedMappedRole || 'writer',
                                    avatar: mapped.avatar || null,
                                    bio: mapped.bio || '',
                                    instagram: mapped.instagram || '',
                                    linkedin: mapped.linkedin || '',
                                    publicEmail: mapped.publicEmail || '',
                                    createdAt: mapped.createdAt || new Date().toISOString()
                                });
                                usersChanged = true;
                            }
                        });

                        if (usersChanged) {
                            localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
                        }

                        // Refresh active session and re-render header if role or profile updated
                        const current = getCurrentUser();
                        if (current) {
                            const refreshed = localUsers.find(u => 
                                String(u.id) === String(current.id) ||
                                (u.email && current.email && u.email.trim().toLowerCase() === current.email.trim().toLowerCase()) ||
                                (u.name && current.name && u.name.trim().toLowerCase() === current.name.trim().toLowerCase())
                            );
                            if (refreshed && (refreshed.role !== current.role || refreshed.avatar !== current.avatar)) {
                                createSession(refreshed);
                                if (document.getElementById('authHeaderSlot')) {
                                    renderHeaderAuth('authHeaderSlot');
                                } else if (document.getElementById('headerRight')) {
                                    renderHeaderAuth('headerRight');
                                }
                                if (typeof document !== 'undefined') {
                                    document.dispatchEvent(new CustomEvent('userRoleUpdated', { detail: { user: refreshed } }));
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Error syncing cloud profiles into local users:', e);
                    }
                } else {
                    // Initial sync of existing profiles to Supabase cloud
                    const localUsers = getAllUsers();
                    if (localUsers.length > 0) {
                        const rows = localUsers.map(u => profileToRow(getAuthorProfile(u.name) || u, u));
                        await client.from('profiles').upsert(rows, { onConflict: 'id' });
                    }
                }
            }

            // 4. Contact Messages Sync (if admin / co-founder)
            const user = getCurrentUser();
            if (isAdmin() || (user && isCoFounder(user))) {
                const { data: cloudMsgs, error: msgError } = await client.from('contact_messages').select('*');
                if (!msgError && Array.isArray(cloudMsgs) && cloudMsgs.length > 0) {
                    const mappedMsgs = cloudMsgs.map(rowToMessage);
                    mappedMsgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    try {
                        localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(mappedMsgs));
                    } catch (e) {}
                }
            }

            // 5. Editorial Picks Sync (syncs on every device so picks stay identical)
            try {
                await pullEditorialPicksFromCloud();
            } catch (picksErr) {
                console.warn('Error pulling cloud editorial picks:', picksErr);
            }

            // Dispatch notification event for dynamic UI components
            if (typeof document !== 'undefined') {
                document.dispatchEvent(new CustomEvent('cloudDataSynced', {
                    detail: {
                        articlesCount: cloudArticles ? cloudArticles.length : 0,
                        projectsCount: cloudProjects ? cloudProjects.length : 0
                    }
                }));
            }
        } catch (syncErr) {
            console.warn('Supabase cloud sync notification:', syncErr.message || syncErr);
        } finally {
            isSyncingCloud = false;
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('cloud_data_synced'));
            }
        }
    }

    async function syncLocalToSupabase() {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client is not configured. Please paste your anon key in db.js.');
        }
        const articles = getCustomArticles().filter(a => !isDummyItem(a)).map(articleToRow);
        const projects = getProjects().filter(p => !isDummyItem(p)).map(projectToRow);
        const users = getAllUsers().map(u => profileToRow(u, u));

        let res = { articles: 0, projects: 0, profiles: 0 };
        if (articles.length > 0) {
            await client.from('articles').upsert(articles, { onConflict: 'id' });
            res.articles = articles.length;
        }
        if (projects.length > 0) {
            await client.from('projects').upsert(projects, { onConflict: 'id' });
            res.projects = projects.length;
        }
        if (users.length > 0) {
            await client.from('profiles').upsert(users, { onConflict: 'id' });
            res.profiles = users.length;
        }
        return { success: true, ...res };
    }

    // Seed default admin account if not already present & purge stale 'Google Editor' dummy data
    function init() {
        // 1. Proactively cleanse any stale 'Google Editor' session
        try {
            const rawSession = localStorage.getItem(SESSION_KEY);
            if (rawSession) {
                const session = JSON.parse(rawSession);
                if (session?.user?.name === 'Google Editor' || session?.user?.email === 'google.editor@articlewebsite.com') {
                    localStorage.removeItem(SESSION_KEY);
                }
            }
        } catch (e) {
            localStorage.removeItem(SESSION_KEY);
        }

        let users = [];
        try {
            const raw = localStorage.getItem(USERS_KEY);
            if (raw) {
                users = JSON.parse(raw);
            }
        } catch (e) {
            users = [];
        }

        // Cleanse any 'Google Editor' user from user list
        users = users.filter(u => u.name !== 'Google Editor' && u.email !== 'google.editor@articlewebsite.com');
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        } catch (e) {}

        // Proactively cleanse any stale dummy articles or projects from localStorage
        try {
            const rawProj = localStorage.getItem(PROJECTS_KEY);
            if (rawProj) {
                const parsed = JSON.parse(rawProj);
                if (Array.isArray(parsed)) {
                    const clean = parsed.filter(p => !isDummyItem(p));
                    localStorage.setItem(PROJECTS_KEY, JSON.stringify(clean));
                }
            }
            const rawArts = localStorage.getItem(ARTICLES_KEY);
            if (rawArts) {
                const parsed = JSON.parse(rawArts);
                if (Array.isArray(parsed)) {
                    const clean = parsed.filter(a => !isDummyItem(a));
                    localStorage.setItem(ARTICLES_KEY, JSON.stringify(clean));
                }
            }
        } catch (e) {}

        const seedEmail = 'editor@articlewebsite.com';
        const userObj = users.find(u => u.email.toLowerCase() === seedEmail.toLowerCase());
        if (userObj) {
            userObj.password = 'Draxlers';
            userObj.role = 'admin';
        } else {
            users.push({
                id: 'user-editor-01',
                name: 'Ali Mert Bayar',
                email: seedEmail,
                password: 'Draxlers',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
        }

        const personalEmail = 'mert.bayar.200807@gmail.com';
        const personalUser = users.find(u => u.email.toLowerCase() === personalEmail.toLowerCase());
        if (personalUser) {
            personalUser.password = 'Draxlers.07';
            personalUser.role = 'admin';
        } else {
            users.push({
                id: 'user-editor-personal',
                name: 'Ali Mert Bayar',
                email: personalEmail,
                password: 'Draxlers.07',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
        }

        const cerenEmail = 'ceren@articlewebsite.com';
        const cerenUser = users.find(u => (u.email && u.email.toLowerCase() === cerenEmail.toLowerCase()) || (u.name && u.name.trim().toLowerCase() === 'ceren onursal'));
        if (!cerenUser) {
            users.push({
                id: 'user-ceren-02',
                name: 'Ceren Onursal',
                email: cerenEmail,
                password: 'Draxlers.ceren',
                role: 'co-founder',
                avatar: null,
                createdAt: new Date().toISOString()
            });
        } else {
            // Guarantee co-founder role and clean avatar
            if (cerenUser.avatar && (cerenUser.avatar.includes('orthaxis.jpg') || cerenUser.avatar.includes('orthaxis.png'))) {
                cerenUser.avatar = null;
            }
            if (!cerenUser.role || cerenUser.role.toLowerCase() === 'editor') cerenUser.role = 'co-founder';
        }

        // Sanitize any existing user avatars pointing to orthaxis
        users.forEach(u => {
            if (u.avatar && (u.avatar.includes('orthaxis.jpg') || u.avatar.includes('orthaxis.png'))) {
                u.avatar = null;
            }
        });

        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        } catch (e) {
            console.error('Failed to seed default users:', e);
        }
    }

    function getAllUsers() {
        init();
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function registerUser({ name, email, password }) {
        init();
        const cleanName = (name || '').trim();
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPassword = (password || '').trim();

        if (!cleanName || !cleanEmail || !cleanPassword) {
            return { success: false, error: 'All fields are required.' };
        }

        const users = getAllUsers();
        if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
            return { success: false, error: 'An account with this email address already exists.' };
        }

        const newUser = {
            id: 'user-' + Date.now(),
            name: cleanName,
            email: cleanEmail,
            password: cleanPassword,
            role: 'editor',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        // Automatically create active session for new user
        createSession(newUser);
        return { success: true, user: newUser };
    }

    function loginUser({ email, password }) {
        init();
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPassword = password || '';

        const users = getAllUsers();
        const found = users.find(u => {
            const userEmail = (u.email || '').toLowerCase();
            const isCeren = (u.name || '').trim().toLowerCase() === 'ceren onursal';
            const isCerenEmail = isCeren && [
                'ceren@articlewebsite.com',
                'cerenonursal2008@gmail.com'
            ].includes(cleanEmail);
            return (userEmail === cleanEmail || isCerenEmail) && u.password === cleanPassword;
        });

        if (!found) {
            return { success: false, error: 'Invalid email address or password.' };
        }

        createSession(found);
        return { success: true, user: found };
    }

    function createSession(user) {
        const sessionData = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || null,
                bio: user.bio || null
            },
            token: 'sess-' + Math.random().toString(36).substring(2) + Date.now().toString(36),
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }

    function getCurrentUser() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (raw) {
                const session = JSON.parse(raw);
                const sessionUser = session.user || null;
                if (!sessionUser) return null;

                const users = getAllUsers();
                const fresh = users.find(u => String(u.id) === String(sessionUser.id));
                if (fresh) {
                    const roleChanged = (fresh.role || '') !== (sessionUser.role || '');
                    const profileChanged = (fresh.avatar || null) !== (sessionUser.avatar || null) || (fresh.bio || null) !== (sessionUser.bio || null);
                    if (roleChanged || profileChanged) {
                        createSession(fresh);
                    }
                    return {
                        ...sessionUser,
                        role: fresh.role,
                        avatar: fresh.avatar || null,
                        bio: fresh.bio || null
                    };
                }
                return sessionUser;
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    function isAuthenticated() {
        return getCurrentUser() !== null;
    }

    function logoutUser() {
        localStorage.removeItem(SESSION_KEY);
        return { success: true };
    }

    function getCustomArticles() {
        try {
            const raw = localStorage.getItem(ARTICLES_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const sanitized = parsed.filter(a => !isDummyItem(a));
                    if (sanitized.length !== parsed.length) {
                        localStorage.setItem(ARTICLES_KEY, JSON.stringify(sanitized));
                    }
                    if (sanitized.length > 0) return sanitized;
                }
            }
        } catch (e) {}

        // Fallback to static articles database (e.g. from articles-data.js)
        if (typeof window !== 'undefined' && Array.isArray(window.ARTICLES_DATABASE) && window.ARTICLES_DATABASE.length > 0) {
            const valid = window.ARTICLES_DATABASE.filter(a => !isDummyItem(a));
            try {
                localStorage.setItem(ARTICLES_KEY, JSON.stringify(valid));
            } catch (e) {}
            return valid;
        }
        return [];
    }

    function saveArticle(articleData) {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Authentication required: You must be signed in to publish an article.');
        }

        const articles = getCustomArticles();
        let sanitizedKeywords = articleData.keywords;
        if (Array.isArray(sanitizedKeywords) && sanitizedKeywords.length > 2) {
            sanitizedKeywords = sanitizedKeywords.slice(0, 2);
        }

        const newArticle = {
            ...articleData,
            keywords: sanitizedKeywords || articleData.keywords,
            authorId: user.id,
            author: articleData.author || user.name,
            projectId: articleData.projectId || null,
            createdAt: new Date().toISOString()
        };

        if (newArticle.projectId) {
            try {
                const partData = {
                    id: 'part-' + Date.now(),
                    title: newArticle.title,
                    subtitle: newArticle.description || '',
                    readTime: newArticle.readTime || 5,
                    image: newArticle.image || null,
                    body: newArticle.body || '',
                    bibliography: newArticle.bibliography || '',
                    linkedArticleId: newArticle.id
                };
                addProjectPart(newArticle.projectId, partData);
            } catch (e) {
                console.warn('Could not link article to project:', e);
            }
        }

        articles.unshift(newArticle);
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));

        // Asynchronously sync to Supabase cloud
        const client = getSupabaseClient();
        if (client) {
            client.from('articles')
                .upsert([articleToRow(newArticle)], { onConflict: 'id' })
                .then(({ error }) => {
                    if (error) console.error('Supabase cloud insert article error:', error);
                    else console.log('Article saved to Supabase cloud!');
                })
                .catch(err => console.error('Supabase network error saving article:', err));
        }

        return newArticle;
    }

    function canEditArticle(article) {
        const user = getCurrentUser();
        if (!user || !article) return false;
        // Full Administrator (Ali Mert Bayar) can edit ANY article
        if (isAdmin()) return true;
        // Non-admin writers can ONLY edit their own articles
        if (article.authorId && String(article.authorId) === String(user.id)) return true;
        if (article.author && user.name && article.author.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
        return false;
    }

    function getArticleById(id) {
        if (id === null || id === undefined) return null;
        const strId = String(id);
        const custom = getCustomArticles();
        return custom.find(a => String(a.id) === strId) || null;
    }

    function updateArticle(id, updatedData) {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Authentication required: You must be signed in to edit an article.');
        }

        const strId = String(id);
        const articles = getCustomArticles();
        const existingIndex = articles.findIndex(a => String(a.id) === strId);

        if (updatedData.keywords && Array.isArray(updatedData.keywords) && updatedData.keywords.length > 2) {
            updatedData = { ...updatedData, keywords: updatedData.keywords.slice(0, 2) };
        }

        updatedData.projectId = updatedData.projectId !== undefined ? updatedData.projectId : ((existingIndex !== -1 && articles[existingIndex].projectId) || null);

        let savedArticle = null;
        if (existingIndex === -1) {
            // Seed article being customized or created with specific ID
            const target = { id: id, ...updatedData };
            if (!canEditArticle(target)) {
                throw new Error('Permission denied: You do not have permission to edit this article.');
            }
            const now = new Date();
            const fallbackDate = `${now.getFullYear()}-${now.getDate()}-${now.getMonth() + 1}`;
            const newCustom = {
                date: updatedData.date || fallbackDate,
                ...updatedData,
                id: id,
                authorId: target.authorId || user.id,
                author: updatedData.author || user.name,
                updatedAt: new Date().toISOString()
            };
            articles.unshift(newCustom);
            localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
            savedArticle = newCustom;
        } else {
            const existingArticle = articles[existingIndex];
            if (!canEditArticle(existingArticle)) {
                throw new Error('Permission denied: You do not have permission to edit this article.');
            }

            const updated = {
                ...existingArticle,
                ...updatedData,
                id: existingArticle.id,
                authorId: existingArticle.authorId || user.id,
                author: updatedData.author || existingArticle.author || user.name,
                updatedAt: new Date().toISOString()
            };

            articles[existingIndex] = updated;
            localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
            savedArticle = updated;
        }

        // Asynchronously sync update to Supabase cloud
        const client = getSupabaseClient();
        if (client && savedArticle) {
            client.from('articles')
                .upsert([articleToRow(savedArticle)], { onConflict: 'id' })
                .then(({ error }) => {
                    if (error) console.error('Supabase cloud update article error:', error);
                    else console.log('Article updated in Supabase cloud!');
                })
                .catch(err => console.error('Supabase network error updating article:', err));
        }

        return savedArticle;
    }

    // ==========================================================================
    // Editorial Projects & Multi-Part Series Engine
    // ==========================================================================
    function getSeedProjects() {
        return [];
    }

    function getProjects() {
        try {
            const raw = localStorage.getItem(PROJECTS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const sanitized = parsed.filter(p => !isDummyItem(p));
                    if (sanitized.length !== parsed.length) {
                        localStorage.setItem(PROJECTS_KEY, JSON.stringify(sanitized));
                    }
                    if (sanitized.length > 0) return sanitized;
                }
            }
        } catch (e) {
            console.error('Error reading projects:', e);
        }

        // Fallback to static projects database (e.g. from projects-data.js)
        if (typeof window !== 'undefined' && Array.isArray(window.PROJECTS_DATABASE) && window.PROJECTS_DATABASE.length > 0) {
            const valid = window.PROJECTS_DATABASE.filter(p => !isDummyItem(p));
            try {
                localStorage.setItem(PROJECTS_KEY, JSON.stringify(valid));
            } catch (e) {}
            return valid;
        }
        return [];
    }

    function getProjectsForUser() {
        const user = getCurrentUser();
        if (!user) return [];
        const projects = getProjects();
        return projects.filter(p => {
            if (isAdmin()) return true;
            if (p.authorId && String(p.authorId) === String(user.id)) return true;
            if (p.author && user.name && p.author.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
            if (p.collaboratorId && String(p.collaboratorId) === String(user.id)) return true;
            if (p.collaboratorName && user.name && p.collaboratorName.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
            return false;
        });
    }

    function getProjectById(id) {
        if (!id) return null;
        const strId = String(id);
        const projects = getProjects();
        return projects.find(p => String(p.id) === strId) || null;
    }

    function canEditProject(project) {
        const user = getCurrentUser();
        if (!user || !project) return false;
        if (isAdmin()) return true;
        // Creator
        if (project.authorId && String(project.authorId) === String(user.id)) return true;
        if (project.author && user.name && project.author.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
        // Collaborator (Co-Author)
        if (project.collaboratorId && String(project.collaboratorId) === String(user.id)) return true;
        if (project.collaboratorName && user.name && project.collaboratorName.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
        return false;
    }

    function saveProject(projectData) {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Authentication required: You must be signed in to create a project.');
        }

        if (!Array.isArray(projectData.parts) || projectData.parts.length === 0) {
            throw new Error('Validation Error: A project must include at least one essay/article to be created.');
        }

        const projects = getProjects();
        const now = new Date().toISOString();
        const newProject = {
            id: projectData.id || ('proj-' + Date.now()),
            title: (projectData.title || 'Untitled Project').trim(),
            subtitle: (projectData.subtitle || '').trim(),
            description: (projectData.description || '').trim(),
            author: projectData.author || user.name,
            authorId: user.id,
            authorRole: user.role === 'admin' ? 'Founder & Editor-in-Chief' : (isCoFounder(user) ? 'Co-Founder & Contributing Editor' : 'Author & Contributor'),
            collaboratorId: projectData.collaboratorId || null,
            collaboratorName: projectData.collaboratorName || null,
            collaboratorRole: projectData.collaboratorRole || (projectData.collaboratorName ? 'Co-Author & Contributor' : null),
            cover: projectData.cover || 'images/spanish colonisation.png',
            categories: (Array.isArray(projectData.categories) && projectData.categories.length > 0 ? projectData.categories : ['General']).slice(0, 2),
            createdAt: now,
            updatedAt: now,
            parts: projectData.parts
        };

        projects.unshift(newProject);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

        // Asynchronously sync project to Supabase cloud
        const client = getSupabaseClient();
        if (client) {
            client.from('projects')
                .upsert([projectToRow(newProject)], { onConflict: 'id' })
                .then(({ error }) => {
                    if (error) console.error('Supabase cloud save project error:', error);
                    else console.log('Project saved to Supabase cloud!');
                })
                .catch(err => console.error('Supabase network error saving project:', err));
        }

        return newProject;
    }

    function updateProject(id, updatedData) {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Authentication required: You must be signed in to edit a project.');
        }

        const strId = String(id);
        const projects = getProjects();
        const index = projects.findIndex(p => String(p.id) === strId);
        if (index === -1) {
            throw new Error('Project not found.');
        }

        const existing = projects[index];
        if (!canEditProject(existing)) {
            throw new Error('Permission denied: You do not have permission to edit this project.');
        }

        let updatedCategories = updatedData.categories !== undefined ? updatedData.categories : existing.categories;
        if (Array.isArray(updatedCategories) && updatedCategories.length > 2) {
            updatedCategories = updatedCategories.slice(0, 2);
        }

        const updated = {
            ...existing,
            ...updatedData,
            categories: updatedCategories,
            id: existing.id,
            authorId: existing.authorId || user.id,
            author: updatedData.author || existing.author || user.name,
            collaboratorId: updatedData.collaboratorId !== undefined ? updatedData.collaboratorId : existing.collaboratorId,
            collaboratorName: updatedData.collaboratorName !== undefined ? updatedData.collaboratorName : existing.collaboratorName,
            collaboratorRole: updatedData.collaboratorRole !== undefined ? updatedData.collaboratorRole : existing.collaboratorRole,
            updatedAt: new Date().toISOString()
        };

        projects[index] = updated;
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

        // Asynchronously sync updated project to Supabase cloud
        const client = getSupabaseClient();
        if (client) {
            client.from('projects')
                .upsert([projectToRow(updated)], { onConflict: 'id' })
                .then(({ error }) => {
                    if (error) console.error('Supabase cloud update project error:', error);
                    else console.log('Project updated in Supabase cloud!');
                })
                .catch(err => console.error('Supabase network error updating project:', err));
        }

        return updated;
    }

    function deleteProject(id) {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Authentication required: You must be signed in to delete a project.');
        }

        const strId = String(id);
        const projects = getProjects();
        const existing = projects.find(p => String(p.id) === strId);
        if (!existing) {
            return { success: false, error: 'Project not found.' };
        }

        if (!canEditProject(existing)) {
            throw new Error('Permission denied: You do not have permission to delete this project.');
        }

        const filtered = projects.filter(p => String(p.id) !== strId);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));

        // Asynchronously sync project delete to Supabase cloud
        const client = getSupabaseClient();
        if (client) {
            client.from('projects')
                .delete()
                .eq('id', strId)
                .then(({ error }) => {
                    if (error) console.error('Supabase cloud delete project error:', error);
                    else console.log('Project deleted from Supabase cloud!');
                })
                .catch(err => console.error('Supabase network error deleting project:', err));
        }

        return { success: true };
    }

    function addProjectPart(projectId, partData) {
        const project = getProjectById(projectId);
        if (!project) throw new Error('Project not found.');
        if (!canEditProject(project)) throw new Error('Permission denied.');

        if (!Array.isArray(project.parts)) project.parts = [];
        const partNumber = project.parts.length + 1;
        const newPart = {
            id: partData.id || ('part-' + Date.now()),
            title: (partData.title || `Part ${partNumber}: Untitled Essay`).trim(),
            subtitle: (partData.subtitle || '').trim(),
            readTime: parseInt(partData.readTime, 10) || 4,
            image: partData.image || null,
            linkedArticleId: partData.linkedArticleId || null,
            body: (partData.body || '').trim(),
            bibliography: (partData.bibliography || '').trim()
        };

        project.parts.push(newPart);
        return updateProject(projectId, { parts: project.parts });
    }

    function updateProjectPart(projectId, partIndexOrId, partData) {
        const project = getProjectById(projectId);
        if (!project) throw new Error('Project not found.');
        if (!canEditProject(project)) throw new Error('Permission denied.');

        if (!Array.isArray(project.parts)) project.parts = [];
        let idx = -1;
        if (typeof partIndexOrId === 'number') {
            idx = partIndexOrId;
        } else {
            idx = project.parts.findIndex(pt => String(pt.id) === String(partIndexOrId));
        }

        if (idx === -1 || !project.parts[idx]) {
            throw new Error('Part not found.');
        }

        project.parts[idx] = {
            ...project.parts[idx],
            ...partData,
            image: partData.image !== undefined ? partData.image : (project.parts[idx].image || null),
            linkedArticleId: partData.linkedArticleId !== undefined ? partData.linkedArticleId : (project.parts[idx].linkedArticleId || null),
            id: project.parts[idx].id
        };

        return updateProject(projectId, { parts: project.parts });
    }

    function deleteProjectPart(projectId, partIndexOrId) {
        const project = getProjectById(projectId);
        if (!project) throw new Error('Project not found.');
        if (!canEditProject(project)) throw new Error('Permission denied.');

        if (!Array.isArray(project.parts)) project.parts = [];
        let idx = -1;
        if (typeof partIndexOrId === 'number') {
            idx = partIndexOrId;
        } else {
            idx = project.parts.findIndex(pt => String(pt.id) === String(partIndexOrId));
        }

        if (idx === -1) throw new Error('Part not found.');
        project.parts.splice(idx, 1);
        return updateProject(projectId, { parts: project.parts });
    }

    function getDeletedArticleIds() {
        const defaultDeleted = ['0', '1', '2', '3', 'proj-atlantic-world', 'proj-colonial-culture'];
        try {
            const raw = localStorage.getItem(DELETED_KEY);
            const userDeleted = raw ? JSON.parse(raw) : [];
            return new Set([...defaultDeleted, ...userDeleted]);
        } catch (e) {
            return new Set(defaultDeleted);
        }
    }

    function isAdmin() {
        const user = getCurrentUser();
        if (!user) return false;
        const r = (user.role || '').toLowerCase().trim();
        if (r === 'admin' || r === 'co-founder' || r === 'admin & co-founder' || r === 'co-founder & admin' || r === 'cofounder') return true;
        if (user.name) {
            const n = user.name.trim().toLowerCase();
            if (n === 'ali mert bayar' || n === 'ceren onursal') return true;
        }
        if (user.email) {
            const e = user.email.trim().toLowerCase();
            if (e === 'editor@articlewebsite.com' || e === 'mert.bayar.200807@gmail.com' || e === 'alimertbayar@gmail.com' || e === 'cerenonursal2008@gmail.com' || e === 'ceren@articlewebsite.com') return true;
        }
        return false;
    }

    function isCoFounder(targetUser) {
        const user = targetUser || getCurrentUser();
        if (!user) return false;
        const r = (user.role || '').toLowerCase().trim();
        if (r === 'co-founder' || r === 'admin' || r === 'admin & co-founder' || r === 'co-founder & admin' || r === 'cofounder') return true;
        if (user.name) {
            const n = user.name.trim().toLowerCase();
            if (n === 'ali mert bayar' || n === 'ceren onursal') return true;
        }
        if (user.email) {
            const e = user.email.trim().toLowerCase();
            if (e === 'editor@articlewebsite.com' || e === 'mert.bayar.200807@gmail.com' || e === 'alimertbayar@gmail.com' || e === 'cerenonursal2008@gmail.com' || e === 'ceren@articlewebsite.com') return true;
        }
        return false;
    }

    function canDeleteArticle(article) {
        const user = getCurrentUser();
        if (!user || !article) return false;
        // Only Ali Mert Bayar can delete any article.
        if (isAdmin()) return true;
        // Non-admin writers can ONLY delete their own articles
        if (article.authorId && String(article.authorId) === String(user.id)) return true;
        if (article.author && user.name && article.author.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
        return false;
    }

    function deleteArticle(id) {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Authentication required: You must be signed in to delete an article.');
        }

        const strId = String(id);
        const custom = getCustomArticles();
        const existingCustom = custom.find(a => String(a.id) === strId);

        // Check permission
        const target = existingCustom || { id: strId };
        if (!canDeleteArticle(target) && !isAdmin()) {
            throw new Error('Permission denied: You can only delete articles that you have written.');
        }

        // 1. Remove from custom_articles if present
        const filtered = custom.filter(a => String(a.id) !== strId);
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(filtered));

        // 2. Add to deleted blacklist to hide seed or custom articles permanently
        const deleted = getDeletedArticleIds();
        deleted.add(strId);
        localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted)));

        // Asynchronously sync delete to Supabase cloud
        const client = getSupabaseClient();
        if (client) {
            client.from('articles')
                .delete()
                .eq('id', strId)
                .then(({ error }) => {
                    if (error) console.error('Supabase cloud delete article error:', error);
                    else console.log('Article deleted from Supabase cloud!');
                })
                .catch(err => console.error('Supabase network error deleting article:', err));
        }

        return { success: true, id: strId };
    }

    function restoreDeletedArticles() {
        if (!isAdmin()) {
            throw new Error('Permission denied: Only administrators can restore articles.');
        }
        localStorage.removeItem(DELETED_KEY);
        return { success: true };
    }

    function assignUserRole(userId, newRole) {
        if (!isAdmin()) {
            throw new Error('Permission denied: Only admins can assign roles.');
        }
        const ALLOWED_ROLES = ['editor', 'writer', 'co-founder', 'admin'];
        if (!ALLOWED_ROLES.includes(newRole)) {
            return { success: false, error: 'Invalid role: ' + newRole };
        }
        let users = getAllUsers();
        const idx = users.findIndex(u => u.id === userId || u.email === userId);
        if (idx === -1) return { success: false, error: 'User not found.' };
        // Prevent changing Ali Mert Bayar's own role
        if (users[idx].email) {
            const e = users[idx].email.trim().toLowerCase();
            if (e === 'editor@articlewebsite.com' || e === 'mert.bayar.200807@gmail.com') {
                return { success: false, error: 'Cannot change the primary founder account role.' };
            }
        }
        users[idx].role = newRole;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        const targetUser = users[idx];

        // Keep custom profile role in sync
        let customProfiles = {};
        try {
            customProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
        } catch (e) {
            customProfiles = {};
        }
        const profileKey = (targetUser.name || '').trim().toLowerCase();
        if (profileKey) {
            if (!customProfiles[profileKey]) customProfiles[profileKey] = {};
            customProfiles[profileKey].name = targetUser.name;
            customProfiles[profileKey].role = newRole === 'co-founder' ? 'Co-Founder' : (newRole === 'admin' ? 'Admin' : (newRole === 'writer' ? 'Writer' : 'Editor'));
            localStorage.setItem(PROFILES_KEY, JSON.stringify(customProfiles));
        }

        // Sync role update to Supabase profiles
        const client = getSupabaseClient();
        if (client) {
            const authorProf = getAuthorProfile(targetUser.name) || targetUser;
            const row = profileToRow(authorProf, targetUser);
            row.role = newRole;

            // Upsert by primary ID
            client.from('profiles')
                .upsert([row], { onConflict: 'id' })
                .catch(err => console.error('Supabase role sync network error:', err));

            // Also update any matching records by email or name to prevent ID mismatches across devices
            if (targetUser.email) {
                client.from('profiles').update({ role: newRole }).ilike('email', targetUser.email.trim()).then(() => {});
            }
            if (targetUser.name) {
                client.from('profiles').update({ role: newRole }).ilike('name', targetUser.name.trim()).then(() => {});
            }
        }

        // If this user is currently logged in, refresh their session
        const current = getCurrentUser();
        if (current && (current.id === users[idx].id || (current.email && current.email.toLowerCase() === (users[idx].email || '').toLowerCase()))) {
            createSession(users[idx]);
        }
        return { success: true };
    }

    function deleteUser(userId) {
        if (!isAdmin()) {
            throw new Error('Permission denied: Only administrators can delete users.');
        }
        let users = getAllUsers();
        const target = users.find(u => u.id === userId || u.email === userId);
        if (!target) {
            return { success: false, error: 'User not found.' };
        }
        if (target.role === 'admin') {
            return { success: false, error: 'Cannot delete the administrator account.' };
        }
        users = users.filter(u => u.id !== target.id);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return { success: true };
    }

    function googleAuthUser({ name, email, avatar }) {
        init();
        const cleanName = (name || '').trim();
        const cleanEmail = (email || '').trim().toLowerCase();

        if (!cleanName || !cleanEmail) {
            return { success: false, error: 'Name and email are required for Google authentication.' };
        }

        const users = getAllUsers();
        let user = users.find(u => u.email.toLowerCase() === cleanEmail);

        if (!user) {
            user = {
                id: 'google-user-' + Date.now(),
                name: cleanName,
                email: cleanEmail,
                provider: 'google',
                avatar: avatar || null,
                role: 'editor',
                createdAt: new Date().toISOString()
            };
            users.push(user);
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        } else {
            user.name = cleanName;
            if (avatar) user.avatar = avatar;
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }

        createSession(user);
        return { success: true, user: user };
    }

    function renderHeaderAuth(containerId = 'headerRight', options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const user = getCurrentUser();

        // Safety check: if user session still has 'Google Editor', wipe it immediately!
        if (user && (user.name === 'Google Editor' || user.email === 'google.editor@articlewebsite.com')) {
            logoutUser();
            return renderHeaderAuth(containerId, options);
        }

        const hideWriteBtn = options.hideWriteBtn || containerId === 'studioAccountDropdownSlot';
        const hideAdminPill = options.hideAdminPill || containerId === 'studioAccountDropdownSlot';

        if (user) {
            const isFounder = isCoFounder(user);
            const unreadInquiries = isFounder ? getUnreadContactMessageCount(user.id || user.email) : 0;

            const writeBtn = !hideWriteBtn ? `
                <a href="add-essay.html" id="publishNavBtn" class="publishNavBtn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span>Add Article</span>
                </a>
            ` : '';

            // Unhide companion edit button if co-founder/editor on homepage
            const epBtn = document.getElementById('editPicksBtn');
            if (epBtn && isFounder) {
                epBtn.style.display = 'inline-flex';
            }

            container.innerHTML = `
                ${writeBtn}
                <div class="userDropdownContainer" id="userDropdownContainer">
                    <div class="userHeaderPill" id="userAccountPill" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false" title="Account Menu">
                        ${user.avatar ? `<img src="${user.avatar}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; margin-right: 2px;" alt="">` : `<span class="userStatusDot" style="${isFounder ? 'background-color: #f59e0b;' : ''}"></span>`}
                        <span class="userNameText">${user.name}</span>
                        ${unreadInquiries > 0 ? `<span class="userNotificationBadge" title="${unreadInquiries} unread inquiry message${unreadInquiries > 1 ? 's' : ''}">${unreadInquiries}</span>` : ''}
                        <svg class="userDropdownChevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                    <div class="userDropdownMenu" id="userDropdownMenu">
                        <a href="profile.html" class="dropdownUserHeader" title="View Writer Profile">
                            <div class="dropdownAvatar ${isFounder ? 'coFounderAvatar' : (user.role === 'admin' ? 'adminAvatar' : '')}">
                                ${user.avatar ? `<img src="${user.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="">` : user.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="dropdownUserDetails">
                                <div class="dropdownUserName">${user.name}</div>
                                <div class="dropdownUserEmail">${user.email}</div>
                                <span class="dropdownUserRoleBadge ${isFounder ? 'roleCoFounder' : (user.role === 'admin' ? 'roleAdmin' : 'roleWriter')}">
                                    ${isFounder ? 'Co-Founder' : (user.role === 'admin' ? 'Administrator' : 'Writer')}
                                </span>
                            </div>
                        </a>

                        <div class="dropdownDivider"></div>

                        <div class="dropdownItemsGroup">
                            <a href="profile.html" class="dropdownItem">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <span>Writer Profile</span>
                            </a>

                            <button type="button" class="dropdownItem" onclick="DB.openMyArticlesModal()">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                <span>My Articles</span>
                            </button>

                            <a href="add-essay.html" class="dropdownItem">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                <span>Write an Article</span>
                            </a>

                            <a href="projects.html" class="dropdownItem">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                <span>Projects &amp; Series</span>
                            </a>

                            ${isFounder ? `
                            <button type="button" class="dropdownItem dropdownItemInquiries" onclick="DB.openContactInquiriesModal()">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                <span>Contact Inquiries</span>
                                ${unreadInquiries > 0 ? `<span class="inquiriesCountPill">${unreadInquiries}</span>` : ''}
                            </button>

                            <button type="button" class="dropdownItem" onclick="DB.openEditorialPicksModal()">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                <span>Editorial Picks</span>
                            </button>
                            ` : ''}

                            <button type="button" class="dropdownItem" onclick="DB.openAccountSettingsModal()">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                <span>Account Settings</span>
                            </button>

                            ${isFounder ? `
                            <button type="button" class="dropdownItem dropdownItemAdmin" onclick="DB.openAdminModal()">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                <span>Admin Console</span>
                            </button>
                            ` : ''}
                        </div>

                        <div class="dropdownDivider"></div>

                        <button type="button" class="dropdownItem dropdownItemDanger" onclick="DB.logoutUser(); window.location.href='index.html';">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            <span>Log Out</span>
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                ${!hideWriteBtn ? `<a href="add-essay.html" id="publishNavBtn" class="publishNavBtn" onclick="return DB.handleWriteClick(event)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span>Add Article</span>
                </a>` : ''}
                <a href="auth.html" id="signInButton">Sign In</a>
            `;
        }
    }

    function handleWriteClick(e) {
        if (!isAuthenticated()) {
            if (e) e.preventDefault();
            window.location.href = 'auth.html?redirect=add-essay.html&reason=auth_required';
            return false;
        }
        return true;
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ======================================================================
    // Custom In-App Modal Overlay for Alerts & Approvals
    // (Decide inside the application, not in browser/explorer popups)
    // ======================================================================
    function showAppDialog(options) {
        return new Promise((resolve) => {
            const {
                title = 'Point of View',
                message = '',
                type = 'info', // 'info', 'warning', 'danger', 'success'
                confirmText = 'Approve',
                cancelText = 'Cancel',
                showCancel = false,
                eyebrow = 'Notification'
            } = (typeof options === 'string' ? { message: options } : (options || {}));

            let backdrop = document.getElementById('appDialogBackdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'appDialogBackdrop';
                backdrop.className = 'appDialogBackdrop';
                backdrop.innerHTML = `
                    <div class="appDialogCard" role="dialog" aria-modal="true" aria-labelledby="appDialogTitle" aria-describedby="appDialogMessage">
                        <div class="appDialogHeader">
                            <div class="appDialogIconWrapper" id="appDialogIconSlot"></div>
                            <div class="appDialogHeaderTexts">
                                <span class="appDialogEyebrow" id="appDialogEyebrow">Point of View</span>
                                <h3 class="appDialogTitle" id="appDialogTitle">Notice</h3>
                            </div>
                            <button type="button" class="appDialogCloseX" id="appDialogCloseX" aria-label="Close modal">&times;</button>
                        </div>
                        <div class="appDialogBody">
                            <div class="appDialogMessage" id="appDialogMessage"></div>
                        </div>
                        <div class="appDialogActions">
                            <button type="button" class="appDialogCancelBtn" id="appDialogCancelBtn">Cancel</button>
                            <button type="button" class="appDialogConfirmBtn" id="appDialogConfirmBtn">Approve</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(backdrop);
            }

            const titleEl = document.getElementById('appDialogTitle');
            const eyebrowEl = document.getElementById('appDialogEyebrow');
            const msgEl = document.getElementById('appDialogMessage');
            const iconSlot = document.getElementById('appDialogIconSlot');
            const cancelBtn = document.getElementById('appDialogCancelBtn');
            const confirmBtn = document.getElementById('appDialogConfirmBtn');
            const closeX = document.getElementById('appDialogCloseX');

            titleEl.textContent = title;
            eyebrowEl.textContent = eyebrow || (showCancel ? 'Action Confirmation' : 'Notification');

            const rawMsg = String(message || '');
            if (rawMsg.includes('\n')) {
                msgEl.innerHTML = rawMsg.split(/\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('');
            } else {
                msgEl.textContent = rawMsg;
            }

            // Styling icon
            iconSlot.className = `appDialogIconWrapper ${type}`;
            if (type === 'danger') {
                iconSlot.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
            } else if (type === 'success') {
                iconSlot.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
            } else if (type === 'warning') {
                iconSlot.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
            } else {
                iconSlot.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
            }

            confirmBtn.textContent = confirmText || 'Approve';
            if (showCancel) {
                cancelBtn.style.display = 'inline-block';
                cancelBtn.textContent = cancelText || 'Cancel';
            } else {
                cancelBtn.style.display = 'none';
            }

            let resolved = false;
            function cleanup(result) {
                if (resolved) return;
                resolved = true;
                backdrop.classList.remove('visible');
                document.removeEventListener('keydown', handleKeydown);
                cancelBtn.onclick = null;
                confirmBtn.onclick = null;
                closeX.onclick = null;
                backdrop.onclick = null;
                resolve(result);
            }

            function handleKeydown(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cleanup(false);
                } else if (e.key === 'Enter') {
                    if (document.activeElement === cancelBtn) {
                        e.preventDefault();
                        cleanup(false);
                    } else {
                        e.preventDefault();
                        cleanup(true);
                    }
                }
            }

            confirmBtn.onclick = () => cleanup(true);
            cancelBtn.onclick = () => cleanup(false);
            closeX.onclick = () => cleanup(false);
            backdrop.onclick = (e) => {
                if (e.target === backdrop) cleanup(false);
            };

            document.addEventListener('keydown', handleKeydown);
            backdrop.classList.add('visible');
            setTimeout(() => {
                confirmBtn.focus();
            }, 60);
        });
    }

    function showAlert(message, optionsOrCallback) {
        let opts = { message: String(message || ''), type: 'info', confirmText: 'Approve', eyebrow: 'Notice', title: 'Point of View' };
        let callback = null;

        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        } else if (typeof optionsOrCallback === 'string') {
            opts.title = optionsOrCallback;
        } else if (optionsOrCallback && typeof optionsOrCallback === 'object') {
            opts = { ...opts, ...optionsOrCallback };
            if (typeof opts.onConfirm === 'function') callback = opts.onConfirm;
        }

        const lower = opts.message.toLowerCase();
        if (lower.includes('error') || lower.includes('failed') || lower.includes('denied') || lower.includes('cannot')) {
            opts.type = 'danger';
            if (opts.title === 'Point of View') opts.title = 'Attention Required';
            opts.eyebrow = 'Error Alert';
        } else if (lower.includes('success') || lower.includes('saved') || lower.includes('restored')) {
            opts.type = 'success';
            if (opts.title === 'Point of View') opts.title = 'Success';
            opts.eyebrow = 'Completed';
        } else if (lower.includes('please') || lower.includes('required') || lower.includes('must') || lower.includes('validation')) {
            opts.type = 'warning';
            if (opts.title === 'Point of View') opts.title = 'Notice';
            opts.eyebrow = 'Action Required';
        }

        return showAppDialog({
            ...opts,
            showCancel: false
        }).then(result => {
            if (callback) callback(result);
            return result;
        });
    }

    function showConfirm(message, optionsOrCallback) {
        let opts = {
            message: String(message || ''),
            title: 'Please Confirm',
            eyebrow: 'Approve Action',
            type: 'warning',
            confirmText: 'Approve',
            cancelText: 'Cancel'
        };
        let callback = null;

        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        } else if (typeof optionsOrCallback === 'string') {
            opts.title = optionsOrCallback;
        } else if (optionsOrCallback && typeof optionsOrCallback === 'object') {
            opts = { ...opts, ...optionsOrCallback };
            if (typeof opts.onConfirm === 'function') callback = opts.onConfirm;
        }

        const lower = opts.message.toLowerCase();
        if (lower.includes('delete') || lower.includes('remove') || lower.includes('undone')) {
            opts.type = 'danger';
            opts.confirmText = 'Delete';
            opts.title = 'Confirm Deletion';
            opts.eyebrow = 'Permanent Action';
        }

        return showAppDialog({
            ...opts,
            showCancel: true
        }).then(result => {
            if (callback) callback(result);
            return result;
        });
    }

    // Globally route native window.alert and window.confirm to in-app approve overlay
    if (typeof window !== 'undefined') {
        window.alert = function(msg, optionsOrCallback) {
            return showAlert(msg, optionsOrCallback);
        };
        window.confirmAsync = function(msg, optionsOrCallback) {
            return showConfirm(msg, optionsOrCallback);
        };
    }

    async function openAdminModal() {
        if (!isAdmin()) {
            showAlert('Access denied: Administrator privileges required.');
            return;
        }

        let modal = document.getElementById('adminConsoleModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'adminConsoleModal';
            modal.className = 'adminModalBackdrop';
            document.body.appendChild(modal);
        }

        const custom = getCustomArticles();
        const deletedIds = getDeletedArticleIds();
        const allArticles = custom.filter(a => !deletedIds.has(String(a.id)));
        const users = getAllUsers();
        const currentUser = getCurrentUser();

        modal.innerHTML = `
            <div class="adminModalCard">
                <div class="adminModalHeader">
                    <div>
                        <div class="adminBadgeRow">
                            <span class="adminCrownBadge">👑 Administrator</span>
                            <span class="adminUserTag">${currentUser.name} (${currentUser.email})</span>
                        </div>
                        <h2>Platform Admin Console</h2>
                    </div>
                    <button type="button" class="adminCloseBtn" onclick="DB.closeAdminModal()">&times;</button>
                </div>

                <div class="adminModalTabs">
                    <button type="button" class="adminTabBtn active" onclick="DB.switchAdminTab('articles')">Articles (${allArticles.length})</button>
                    <button type="button" class="adminTabBtn" onclick="DB.switchAdminTab('users')">Writers & Users (${users.length})</button>
                    <button type="button" class="adminTabBtn" onclick="DB.switchAdminTab('tools')">Database Tools</button>
                </div>

                <div class="adminTabContent" id="adminTabArticles">
                    <div class="adminTableHeaderRow">
                        <span class="adminSectionLabel">Manage All Published Articles</span>
                        <a href="add-essay.html" class="adminAddBtn">+ Write New</a>
                    </div>
                    <div class="adminTableWrap">
                        <table class="adminTable">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Author</th>
                                    <th>Topics</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allArticles.map(art => `
                                    <tr>
                                        <td>
                                            <a href="article.html?id=${encodeURIComponent(art.id)}" target="_blank" class="adminArticleTitleLink">${art.title}</a>
                                        </td>
                                        <td>${art.author || 'Staff'}</td>
                                        <td>
                                            <span class="adminTopicBadge">${(art.keywords || []).filter(k => k.toLowerCase() !== 'published').join(', ') || 'Article'}</span>
                                        </td>
                                        <td class="adminActionsCell">
                                            <a href="add-essay.html?edit=${encodeURIComponent(art.id)}" class="adminEditLink">Edit</a>
                                            <button type="button" class="adminDeleteBtn" onclick="DB.adminDeleteArticlePrompt('${art.id}', '${escapeQuotes(art.title)}')">Delete</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="adminTabContent hidden" id="adminTabUsers">
                    <span class="adminSectionLabel">Registered Platform Writers & Accounts</span>
                    <div class="adminTableWrap">
                        <table class="adminTable">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(u => {
                                    const uEmail = (u.email || '').trim().toLowerCase();
                                    const isFounder = uEmail === 'editor@articlewebsite.com' || uEmail === 'mert.bayar.200807@gmail.com';
                                    const roleBadgeClass = u.role === 'admin' || u.role === 'co-founder' ? 'admin' : 'writer';
                                    return `
                                    <tr>
                                        <td><strong>${u.name}</strong></td>
                                        <td>${u.email}</td>
                                        <td>
                                            ${isFounder
                                                ? `<span class="adminRoleBadge admin">co-founder</span>`
                                                : `<select class="adminRoleSelect" onchange="DB.adminAssignRolePrompt('${u.id}', this.value, '${escapeQuotes(u.name)}', this)" style="font-size:12px;padding:4px 8px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-surface);color:var(--text-primary);cursor:pointer;">
                                                    <option value="writer" ${u.role === 'writer' || u.role === 'editor' ? 'selected' : ''}>Writer</option>
                                                    <option value="co-founder" ${u.role === 'co-founder' ? 'selected' : ''}>Co-Founder</option>
                                                   </select>`
                                            }
                                        </td>
                                        <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                                        <td>
                                            ${isFounder
                                                ? '<span class="adminProtectedTag">Protected</span>'
                                                : `<button type="button" class="adminDeleteBtn" onclick="DB.adminDeleteUserPrompt('${u.id}', '${escapeQuotes(u.name)}')">Remove</button>`
                                            }
                                        </td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="adminTabContent hidden" id="adminTabTools">
                    <div class="adminToolsGrid">
                        <div class="adminToolCard">
                            <h4>Deleted Articles Blacklist</h4>
                            <p>Currently ${deletedIds.size} article(s) are blacklisted/deleted from the public feed.</p>
                            <button type="button" class="adminOutlineBtn" onclick="DB.adminRestoreArticlesPrompt()">Restore All Deleted Articles</button>
                        </div>
                        <div class="adminToolCard">
                            <h4>Database Backup</h4>
                            <p>Download a complete JSON export of all custom articles, registered accounts, and site state.</p>
                            <button type="button" class="adminOutlineBtn" onclick="DB.exportBackupJSON()">Download Backup JSON</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        modal.classList.add('visible');
    }

    function closeAdminModal() {
        const modal = document.getElementById('adminConsoleModal');
        if (modal) {
            modal.classList.remove('visible');
        }
    }

    function switchAdminTab(tabName) {
        const tabs = ['articles', 'users', 'tools'];
        tabs.forEach(t => {
            const btn = document.querySelector(`.adminTabBtn[onclick*="${t}"]`);
            const content = document.getElementById(`adminTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
            if (btn) btn.classList.toggle('active', t === tabName);
            if (content) content.classList.toggle('hidden', t !== tabName);
        });
    }

    function escapeQuotes(str) {
        return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    async function adminDeleteArticlePrompt(id, title) {
        const ok = await showConfirm(`Are you sure you want to permanently delete "${title}"?`);
        if (ok) {
            try {
                deleteArticle(id);
                // Refresh modal view
                openAdminModal();
                if (typeof renderLatestArticles === 'function' && typeof articlesData !== 'undefined') {
                    articlesData = articlesData.filter(a => String(a.id) !== String(id));
                    renderLatestArticles(articlesData);
                }
            } catch (e) {
                showAlert(e.message);
            }
        }
    }

    async function adminDeleteUserPrompt(id, name) {
        const ok = await showConfirm(`Remove user account for "${name}"?`);
        if (ok) {
            const res = deleteUser(id);
            if (res.success) {
                openAdminModal();
            } else {
                showAlert(res.error || 'Failed to remove user.');
            }
        }
    }

    async function adminAssignRolePrompt(id, newRole, name, selectEl) {
        const roleLabel = newRole === 'co-founder' ? 'Co-Founder' : 'Writer';
        const ok = await showConfirm(`Assign the role "${roleLabel}" to ${name}?\n\nNote: Co-Founder accounts can edit and delete any article and access editorial features.`);
        if (!ok) {
            // Revert the select back to its previous value
            if (selectEl) openAdminModal();
            return;
        }
        const res = assignUserRole(id, newRole);
        if (!res.success) {
            showAlert(res.error || 'Failed to assign role.');
        }
        openAdminModal();
    }

    async function adminRestoreArticlesPrompt() {
        const ok = await showConfirm('Restore all previously deleted default seed articles?');
        if (ok) {
            restoreDeletedArticles();
            await showAlert('All seed articles have been restored.');
            window.location.reload();
        }
    }

    async function openMyArticlesModal() {
        const user = getCurrentUser();
        if (!user) {
            await showAlert('Please sign in to view your articles.');
            window.location.href = 'auth.html?redirect=add-essay.html';
            return;
        }

        let modal = document.getElementById('myArticlesModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'myArticlesModal';
            modal.className = 'adminModalBackdrop';
            document.body.appendChild(modal);
        }

        const custom = getCustomArticles();
        const deletedIds = getDeletedArticleIds();
        const allArticles = custom.filter(a => !deletedIds.has(String(a.id)));

        // Find articles authored by this user
        const myArticles = allArticles.filter(a => {
            if (a.authorId && String(a.authorId) === String(user.id)) return true;
            if (a.author && user.name && a.author.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
            return false;
        });

        modal.innerHTML = `
            <div class="adminModalCard">
                <div class="adminModalHeader">
                    <div>
                        <div class="adminBadgeRow">
                            <span class="companionPulseDot" style="background-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.2);"></span>
                            <span class="adminUserTag">${user.name}</span>
                            <span class="adminRoleBadge roleWriter">${myArticles.length} Published</span>
                        </div>
                        <h2>My Published Articles</h2>
                    </div>
                    <button type="button" class="adminCloseBtn" onclick="DB.closeMyArticlesModal()">&times;</button>
                </div>

                <div class="myArticlesBody" style="display: flex; flex-direction: column; gap: 16px;">
                    ${myArticles.length === 0 ? `
                        <div style="text-align: center; padding: 48px 20px; background-color: var(--bg-surface-secondary); border-radius: 18px;">
                            <div style="font-size: 38px; margin-bottom: 12px;">✍️</div>
                            <h3 style="margin: 0 0 8px 0; font-size: 1.25rem;">No Articles Published Yet</h3>
                            <p style="margin: 0 auto 16px auto; color: var(--text-muted); max-width: 440px; font-size: 14px; line-height: 1.5;">
                                You haven't published any articles yet. Share your historical insights, economic analyses, or cultural dispatches with readers worldwide.
                            </p>
                            <a href="add-essay.html" class="adminAddBtn" style="display: inline-block; padding: 10px 22px; font-size: 14px; text-decoration: none;">+ Write Your First Article</a>
                        </div>
                    ` : `
                        <div class="adminTableHeaderRow">
                            <span class="adminSectionLabel">Articles Authored by You</span>
                            <a href="add-essay.html" class="adminAddBtn">+ Write New</a>
                        </div>
                        <div class="adminTableWrap">
                            <table class="adminTable">
                                <thead>
                                    <tr>
                                        <th>Article</th>
                                        <th>Topics</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${myArticles.map(art => `
                                        <tr>
                                            <td>
                                                <div style="display: flex; align-items: center; gap: 12px;">
                                                    <img src="${art.image || 'images/spanish colonisation.png'}" style="width: 48px; height: 32px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" alt="">
                                                    <a href="article.html?id=${encodeURIComponent(art.id)}" class="adminArticleTitleLink">${art.title}</a>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="adminTopicBadge">${(art.keywords || []).filter(k => k.toLowerCase() !== 'published').join(', ') || 'Article'}</span>
                                            </td>
                                            <td style="font-size: 12px; color: var(--text-muted);">${art.date || 'Recent'}</td>
                                            <td class="adminActionsCell">
                                                <a href="article.html?id=${encodeURIComponent(art.id)}" class="adminEditLink" style="color: var(--text-primary); border-color: var(--border-subtle);">Read</a>
                                                <a href="add-essay.html?edit=${encodeURIComponent(art.id)}" class="adminEditLink">Edit</a>
                                                <button type="button" class="adminDeleteBtn" onclick="DB.myArticlesDeletePrompt('${art.id}', '${escapeQuotes(art.title)}')">Delete</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;

        modal.classList.add('visible');
        modal.onclick = (e) => {
            if (e.target === modal) closeMyArticlesModal();
        };
    }

    function closeMyArticlesModal() {
        const modal = document.getElementById('myArticlesModal');
        if (modal) {
            modal.classList.remove('visible');
        }
    }

    async function myArticlesDeletePrompt(id, title) {
        const ok = await showConfirm(`Are you sure you want to permanently delete "${title}"? This action cannot be undone.`);
        if (ok) {
            try {
                deleteArticle(id);
                openMyArticlesModal();
                if (typeof articlesData !== 'undefined' && typeof updateDOM === 'function') {
                    articlesData = articlesData.filter(a => String(a.id) !== String(id));
                    if (typeof currentIndex !== 'undefined' && currentIndex >= articlesData.length) {
                        currentIndex = Math.max(0, articlesData.length - 1);
                    }
                    if (articlesData.length > 0) {
                        updateDOM(currentIndex);
                        if (typeof renderHeroCompanion === 'function') renderHeroCompanion(articlesData);
                        if (typeof renderLatestArticles === 'function') renderLatestArticles(articlesData);
                    } else {
                        window.location.reload();
                    }
                }
            } catch (e) {
                showAlert(e.message || 'Error deleting article.');
            }
        }
    }

    function openAccountProfileModal() {
        const user = getCurrentUser();
        if (!user) return;

        let modal = document.getElementById('accountProfileModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'accountProfileModal';
            modal.className = 'adminModalBackdrop';
            document.body.appendChild(modal);
        }

        const custom = getCustomArticles();
        const authoredCount = custom.filter(a => a.authorId === user.id || (a.author && a.author.toLowerCase() === user.name.toLowerCase())).length;

        modal.innerHTML = `
            <div class="adminModalCard" style="max-width: 520px;">
                <div class="adminModalHeader">
                    <div>
                        <span class="companionBadge">Author Profile</span>
                        <h2 style="margin-top: 4px;">Account Details</h2>
                    </div>
                    <button type="button" class="adminCloseBtn" onclick="DB.closeAccountProfileModal()">&times;</button>
                </div>

                <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div class="dropdownAvatar ${user.role === 'admin' ? 'adminAvatar' : ''}" style="width: 54px; height: 54px; font-size: 22px;">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style="margin: 0 0 4px 0; font-size: 1.15rem;">${user.name}</h3>
                            <p style="margin: 0; color: var(--text-muted); font-size: 13px;">${user.email}</p>
                            <span class="dropdownUserRoleBadge ${user.role === 'admin' ? 'roleAdmin' : 'roleWriter'}" style="margin-top: 6px;">
                                ${user.role === 'admin' ? '👑 Platform Administrator' : '✍️ Contributor & Writer'}
                            </span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background-color: var(--bg-surface-secondary); padding: 16px; border-radius: 14px;">
                        <div>
                            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Role Status</span>
                            <p style="margin: 4px 0 0 0; font-weight: 600; font-size: 13.5px;">${user.role === 'admin' ? 'Full Platform Admin' : 'Writer / Author'}</p>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Articles Authored</span>
                            <p style="margin: 4px 0 0 0; font-weight: 600; font-size: 13.5px;">${authoredCount} custom</p>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                        <button type="button" class="adminOutlineBtn" onclick="DB.closeAccountProfileModal()">Close</button>
                        <a href="add-essay.html" class="adminAddBtn" style="padding: 8px 18px; text-decoration: none;">+ Write Essay</a>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('visible');
        modal.onclick = (e) => {
            if (e.target === modal) closeAccountProfileModal();
        };
    }

    function closeAccountProfileModal() {
        const modal = document.getElementById('accountProfileModal');
        if (modal) {
            modal.classList.remove('visible');
        }
    }

    async function openReadingStatsModal() {
        let modal = document.getElementById('readingStatsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'readingStatsModal';
            modal.className = 'adminModalBackdrop';
            document.body.appendChild(modal);
        }

        const custom = getCustomArticles();
        const deletedIds = getDeletedArticleIds();
        const allArticles = custom.filter(a => !deletedIds.has(String(a.id)));

        modal.innerHTML = `
            <div class="adminModalCard" style="max-width: 520px;">
                <div class="adminModalHeader">
                    <div>
                        <span class="companionBadge">Dispatches Library</span>
                        <h2 style="margin-top: 4px;">Reading Dispatches</h2>
                    </div>
                    <button type="button" class="adminCloseBtn" onclick="DB.closeReadingStatsModal()">&times;</button>
                </div>

                <div style="padding: 24px; display: flex; flex-direction: column; gap: 18px;">
                    <p style="margin: 0; color: var(--text-secondary); line-height: 1.5; font-size: 14px;">
                        Explore our curated collection of deep investigative pieces spanning World History, Global Economics, Colonial Societal Stratification, and Technological Advancements.
                    </p>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                        <div style="background-color: var(--bg-surface-secondary); padding: 14px; border-radius: 12px; text-align: center;">
                            <span style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary); display: block;">${allArticles.length}</span>
                            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Active Pieces</span>
                        </div>
                        <div style="background-color: var(--bg-surface-secondary); padding: 14px; border-radius: 12px; text-align: center;">
                            <span style="font-size: 1.4rem; font-weight: 800; color: var(--accent-primary); display: block;">6</span>
                            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Topic Streams</span>
                        </div>
                        <div style="background-color: var(--bg-surface-secondary); padding: 14px; border-radius: 12px; text-align: center;">
                            <span style="font-size: 1.4rem; font-weight: 800; color: #10b981; display: block;">Free</span>
                            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Open Access</span>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                        <button type="button" class="adminOutlineBtn" onclick="DB.closeReadingStatsModal()">Close</button>
                        <a href="index.html#content" class="adminAddBtn" style="padding: 8px 18px; text-decoration: none;" onclick="DB.closeReadingStatsModal()">Browse Articles &rarr;</a>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('visible');
        modal.onclick = (e) => {
            if (e.target === modal) closeReadingStatsModal();
        };
    }

    function closeReadingStatsModal() {
        const modal = document.getElementById('readingStatsModal');
        if (modal) {
            modal.classList.remove('visible');
        }
    }

    function updateUserProfile(updates) {
        const currentUser = getCurrentUser();
        if (!currentUser) throw new Error('Not authenticated');

        const users = getAllUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);

        const updatedUser = {
            ...currentUser,
            ...updates,
            id: currentUser.id,
            email: currentUser.email,
            role: currentUser.role
        };

        if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }

        createSession(updatedUser);
        return updatedUser;
    }

    function changePassword({ currentPassword, newPassword }) {
        const currentUser = getCurrentUser();
        if (!currentUser) return { success: false, error: 'Not authenticated.' };

        const users = getAllUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex === -1) return { success: false, error: 'User account not found.' };

        const user = users[userIndex];
        if (user.password !== currentPassword) {
            return { success: false, error: 'Current password is incorrect.' };
        }

        if (!newPassword || newPassword.length < 6) {
            return { success: false, error: 'New password must be at least 6 characters long.' };
        }

        user.password = newPassword;
        users[userIndex] = user;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        return { success: true };
    }

    async function openAccountSettingsModal() {
        const user = getCurrentUser();
        if (!user) {
            await showAlert('Please sign in to access account settings.');
            window.location.href = 'auth.html';
            return;
        }

        let modal = document.getElementById('accountSettingsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'accountSettingsModal';
            modal.className = 'adminModalBackdrop';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="adminModalCard" style="max-width: 500px;">
                <div class="adminModalHeader">
                    <div>
                        <span class="companionBadge">Security & Profile</span>
                        <h2 style="margin-top: 4px;">Account Settings</h2>
                    </div>
                    <button type="button" class="adminCloseBtn" onclick="DB.closeAccountSettingsModal()">&times;</button>
                </div>

                <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                    <div id="settingsAlertBox" class="hidden" style="padding: 10px 14px; border-radius: 8px; font-size: 13px;"></div>

                    <!-- Profile Info Section -->
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <h4 style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Profile Information &amp; Socials</h4>
                        
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 12.5px; font-weight: 600;">Display Name</label>
                            <input type="text" id="settingsDisplayName" value="${escapeQuotes(user.name)}" style="padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 13.5px; outline: none; background: var(--bg-surface); color: var(--text-primary);">
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 12.5px; font-weight: 600;">Account Email (Login)</label>
                            <input type="email" id="settingsEmail" value="${escapeQuotes(user.email)}" disabled style="padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 13.5px; outline: none; background: var(--bg-surface-secondary); color: var(--text-muted); cursor: not-allowed;">
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 12.5px; font-weight: 600;">Public Contact Email (Visible on Profile)</label>
                            <input type="email" id="settingsPublicEmail" value="${escapeQuotes(user.publicEmail || user.email || '')}" placeholder="contact@example.com" style="padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 13.5px; outline: none; background: var(--bg-surface); color: var(--text-primary);">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 12.5px; font-weight: 600;">Instagram</label>
                                <input type="text" id="settingsInstagram" value="${escapeQuotes(user.instagram || '')}" placeholder="@username or URL" style="padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 13.5px; outline: none; background: var(--bg-surface); color: var(--text-primary);">
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 12.5px; font-weight: 600;">LinkedIn</label>
                                <input type="text" id="settingsLinkedin" value="${escapeQuotes(user.linkedin || '')}" placeholder="linkedin.com/in/username" style="padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 13.5px; outline: none; background: var(--bg-surface); color: var(--text-primary);">
                            </div>
                        </div>
                    </div>

                    <div class="dropdownDivider" style="margin: 4px 0;"></div>

                    <!-- Change Password Section -->
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <h4 style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Change Password</h4>

                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 12.5px; font-weight: 600;">Current Password</label>
                            <div class="passwordInputWrap">
                                <input type="password" id="settingsCurrentPass" placeholder="Enter your current password" style="padding: 9px 38px 9px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 13.5px; outline: none; background: var(--bg-surface); color: var(--text-primary); width: 100%; box-sizing: border-box;">
                                <button type="button" class="togglePasswordBtn" onclick="togglePasswordVis('settingsCurrentPass', this)" aria-label="Show password" title="Show password" tabindex="-1">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 12.5px; font-weight: 600;">New Password</label>
                                <div class="passwordInputWrap">
                                    <input type="password" id="settingsNewPass" placeholder="Min. 6 chars" style="padding: 9px 38px 9px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 13.5px; outline: none; background: var(--bg-surface); color: var(--text-primary); width: 100%; box-sizing: border-box;">
                                    <button type="button" class="togglePasswordBtn" onclick="togglePasswordVis('settingsNewPass', this)" aria-label="Show password" title="Show password" tabindex="-1">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 12.5px; font-weight: 600;">Confirm Password</label>
                                <div class="passwordInputWrap">
                                    <input type="password" id="settingsConfirmPass" placeholder="Repeat new password" style="padding: 9px 38px 9px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 13.5px; outline: none; background: var(--bg-surface); color: var(--text-primary); width: 100%; box-sizing: border-box;">
                                    <button type="button" class="togglePasswordBtn" onclick="togglePasswordVis('settingsConfirmPass', this)" aria-label="Show password" title="Show password" tabindex="-1">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="accountSettingsBtnRow">
                        <button type="button" class="settingsCancelBtn" onclick="DB.closeAccountSettingsModal()">Cancel</button>
                        <button type="button" class="settingsSaveBtn" onclick="DB.saveAccountSettings()">Save Settings</button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('visible');
        modal.onclick = (e) => {
            if (e.target === modal) closeAccountSettingsModal();
        };
    }

    function closeAccountSettingsModal() {
        const modal = document.getElementById('accountSettingsModal');
        if (modal) {
            modal.classList.remove('visible');
        }
    }

    if (typeof window !== 'undefined' && !window.togglePasswordVis) {
        window.togglePasswordVis = function(inputId, btn) {
            const input = document.getElementById(inputId);
            if (!input) return;
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            if (btn) {
                btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
                btn.setAttribute('title', isHidden ? 'Hide password' : 'Show password');
                btn.innerHTML = isHidden
                    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
                    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
            }
        };
    }

    function saveAccountSettings() {
        const alertBox = document.getElementById('settingsAlertBox');
        const displayName = (document.getElementById('settingsDisplayName')?.value || '').trim();
        const currentPass = document.getElementById('settingsCurrentPass')?.value || '';
        const newPass = document.getElementById('settingsNewPass')?.value || '';
        const confirmPass = document.getElementById('settingsConfirmPass')?.value || '';

        const showAlert = (msg, isError = true) => {
            if (!alertBox) return;
            alertBox.className = '';
            alertBox.style.display = 'block';
            alertBox.style.backgroundColor = isError ? '#fef2f2' : '#f0fdf4';
            alertBox.style.color = isError ? '#dc2626' : '#16a34a';
            alertBox.style.border = `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`;
            alertBox.textContent = msg;
        };

        if (!displayName) {
            showAlert('Display name cannot be empty.');
            return;
        }

        const currentUser = getCurrentUser();
        const instagram = (document.getElementById('settingsInstagram')?.value || '').trim();
        const linkedin = (document.getElementById('settingsLinkedin')?.value || '').trim();
        const publicEmail = (document.getElementById('settingsPublicEmail')?.value || '').trim();

        const profileUpdates = {
            name: displayName,
            instagram: instagram,
            linkedin: linkedin,
            publicEmail: publicEmail
        };

        updateUserProfile(profileUpdates);
        saveAuthorProfile(displayName, {
            name: displayName,
            instagram: instagram,
            linkedin: linkedin,
            publicEmail: publicEmail
        });

        if (currentPass || newPass || confirmPass) {
            if (!currentPass) {
                showAlert('Please enter your current password to set a new password.');
                return;
            }
            if (!newPass) {
                showAlert('Please enter your new password.');
                return;
            }
            if (newPass.length < 6) {
                showAlert('New password must be at least 6 characters long.');
                return;
            }
            if (newPass !== confirmPass) {
                showAlert('New password and confirmation password do not match.');
                return;
            }

            const passResult = changePassword({ currentPassword: currentPass, newPassword: newPass });
            if (!passResult.success) {
                showAlert(passResult.error || 'Failed to update password.');
                return;
            }
        }

        showAlert('Account settings updated successfully!', false);

        setTimeout(() => {
            closeAccountSettingsModal();
            window.location.reload();
        }, 900);
    }

    function getAuthorProfile(authorName) {
        if (!authorName) {
            const current = getCurrentUser();
            if (current) authorName = current.name;
            else return null;
        }
        const cleanName = authorName.trim();
        const users = getAllUsers();
        const userMatch = users.find(u => u.name && u.name.trim().toLowerCase() === cleanName.toLowerCase());

        let customProfiles = {};
        try {
            customProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
        } catch (e) {
            customProfiles = {};
        }

        const saved = customProfiles[cleanName.toLowerCase()] || {};

        let defaultBio = 'Contributing writer and researcher sharing dispatches, essays, and critical insights.';
        let defaultRole = 'Writer';
        let defaultAvatar = null;

        if (cleanName.toLowerCase() === 'ali mert bayar') {
            defaultBio = 'Lead Editor and Founder of Article Website. Writing on global histories, maritime empires, and cultural cartographies.';
            defaultRole = 'Co-Founder';
            defaultAvatar = 'images/mert_img.png';
        } else if (cleanName.toLowerCase() === 'ceren onursal') {
            defaultBio = 'Senior Research Fellow and Historian specializing in colonial institutions, cultural diplomacy, and trans-Atlantic interactions.';
            defaultRole = 'Co-Founder';
            defaultAvatar = null;
        }

        const currentUser = getCurrentUser();
        const isCurrentUser = !!(currentUser && currentUser.name && currentUser.name.trim().toLowerCase() === cleanName.toLowerCase());
        const canEdit = isCurrentUser || isAdmin();

        // Standardized generalized roles: Co-Founder, Admin, Writer
        let role = 'Writer';
        if (cleanName.toLowerCase() === 'ali mert bayar') {
            role = 'Co-Founder';
        } else if (userMatch) {
            const r = (userMatch.role || '').toLowerCase();
            role = (r === 'co-founder') ? 'Co-Founder' : (r === 'admin' ? 'Admin' : 'Writer');
        } else if (saved.role) {
            const r = String(saved.role).toLowerCase();
            role = (r === 'co-founder') ? 'Co-Founder' : (r === 'admin' ? 'Admin' : 'Writer');
        } else {
            role = defaultRole;
        }

        return {
            id: userMatch ? userMatch.id : ('prof-' + cleanName.toLowerCase().replace(/\s+/g, '-')),
            name: userMatch ? userMatch.name : cleanName,
            email: userMatch ? userMatch.email : (saved.email || ''),
            publicEmail: (saved.publicEmail !== undefined) ? saved.publicEmail : (userMatch?.publicEmail || userMatch?.email || saved.email || ''),
            instagram: (saved.instagram !== undefined) ? saved.instagram : (userMatch?.instagram || ''),
            linkedin: (saved.linkedin !== undefined) ? saved.linkedin : (userMatch?.linkedin || ''),
            avatar: (userMatch && userMatch.avatar) ? userMatch.avatar : (saved.avatar || defaultAvatar),
            bio: (userMatch && userMatch.bio) ? userMatch.bio : (saved.bio || defaultBio),
            role: role,
            joinedDate: userMatch?.createdAt ? new Date(userMatch.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : (saved.joinedDate || 'September 2024'),
            isCurrentUser,
            canEdit
        };
    }

    function assignAuthorRole(authorName, newRole) {
        if (!isAdmin()) {
            throw new Error('Permission denied: Only Co-Founders and Administrators can assign roles.');
        }
        const cleanName = (authorName || '').trim();
        if (!cleanName) return { success: false, error: 'Author name required.' };

        // Normalize role to: 'co-founder', 'admin', 'writer'
        const lowerRole = (newRole || '').toLowerCase().trim();
        const validRoles = ['co-founder', 'admin', 'writer'];
        if (!validRoles.includes(lowerRole)) {
            return { success: false, error: 'Invalid role. Allowed: Co-Founder, Admin, Writer' };
        }

        // Ali Mert Bayar is always protected
        if (cleanName.toLowerCase() === 'ali mert bayar') {
            return { success: false, error: 'Cannot change the primary founder account role.' };
        }

        // 1. Update in USERS_KEY if user account exists
        let users = getAllUsers();
        const userIdx = users.findIndex(u => 
            (u.name && u.name.trim().toLowerCase() === cleanName.toLowerCase()) ||
            (u.id && String(u.id) === cleanName) ||
            (u.email && u.email.trim().toLowerCase() === cleanName.toLowerCase())
        );

        if (userIdx !== -1) {
            users[userIdx].role = lowerRole;
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            const current = getCurrentUser();
            if (current && current.id === users[userIdx].id) {
                createSession(users[userIdx]);
            }
        }

        // 2. Persist in PROFILES_KEY
        let customProfiles = {};
        try {
            customProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
        } catch (e) {
            customProfiles = {};
        }
        const key = cleanName.toLowerCase();
        if (!customProfiles[key]) customProfiles[key] = {};
        const displayRole = (lowerRole === 'co-founder') ? 'Co-Founder' : (lowerRole === 'admin' ? 'Admin' : 'Writer');
        customProfiles[key].role = displayRole;
        localStorage.setItem(PROFILES_KEY, JSON.stringify(customProfiles));

        // 3. Sync role update to Supabase profiles
        const client = getSupabaseClient();
        if (client) {
            const authorProf = getAuthorProfile(cleanName) || {};
            const profileRow = profileToRow(authorProf, userIdx !== -1 ? users[userIdx] : { name: cleanName, role: lowerRole });
            profileRow.role = lowerRole;
            client.from('profiles')
                .upsert([profileRow], { onConflict: 'id' })
                .then(({ error }) => {
                    if (error) console.error('Supabase assignAuthorRole error:', error);
                    else console.log('⚡ Role updated in Supabase cloud for:', cleanName, lowerRole);
                })
                .catch(err => console.error('Supabase assignAuthorRole network error:', err));

            if (cleanName) {
                client.from('profiles').update({ role: lowerRole }).ilike('name', cleanName).then(() => {});
            }
            if (userIdx !== -1 && users[userIdx].email) {
                client.from('profiles').update({ role: lowerRole }).ilike('email', users[userIdx].email.trim()).then(() => {});
            }
        }

        if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
            document.dispatchEvent(new CustomEvent('coFoundersUpdated', { detail: { authorName: cleanName, role: displayRole } }));
        }

        return { success: true, role: displayRole };
    }

    function getCoFounders() {
        init();
        const list = [];
        const seen = new Set();

        // 1. Primary Co-Founder: Ali Mert Bayar
        const primary = getAuthorProfile('Ali Mert Bayar');
        primary.role = 'Co-Founder';
        list.push(primary);
        seen.add('ali mert bayar');

        // 2. Query registered users with role 'co-founder'
        const users = getAllUsers();
        users.forEach(u => {
            if (!u.name) return;
            const key = u.name.trim().toLowerCase();
            if (seen.has(key)) return;
            if ((u.role || '').toLowerCase() === 'co-founder') {
                const prof = getAuthorProfile(u.name);
                prof.role = 'Co-Founder';
                if (u.avatar) {
                    prof.avatar = u.avatar;
                }
                list.push(prof);
                seen.add(key);
            }
        });

        // Ensure baseline Co-Founder Ceren Onursal is always present
        if (!seen.has('ceren onursal')) {
            const cerenProf = getAuthorProfile('Ceren Onursal');
            cerenProf.role = 'Co-Founder';
            if (cerenProf.avatar && (cerenProf.avatar.includes('orthaxis.jpg') || cerenProf.avatar.includes('orthaxis.png'))) {
                cerenProf.avatar = null;
            }
            list.push(cerenProf);
            seen.add('ceren onursal');
        }

        // 3. Query custom profiles in PROFILES_KEY
        try {
            const customProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
            Object.keys(customProfiles).forEach(k => {
                const p = customProfiles[k];
                if (p && (p.role || '').toLowerCase() === 'co-founder') {
                    const authorName = p.name || k;
                    const key = authorName.trim().toLowerCase();
                    if (!seen.has(key)) {
                        const prof = getAuthorProfile(authorName);
                        prof.role = 'Co-Founder';
                        list.push(prof);
                        seen.add(key);
                    }
                }
            });
        } catch (e) {}

        return list;
    }

    function getContactMessages() {
        try {
            const raw = localStorage.getItem(CONTACT_MESSAGES_KEY);
            if (!raw) return [];
            const list = JSON.parse(raw);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function submitContactMessage({ name, email, subject, message }) {
        const cleanName = (name || '').trim();
        const cleanEmail = (email || '').trim();
        const cleanSubject = (subject || 'General Inquiry').trim();
        const cleanMessage = (message || '').trim();

        if (!cleanName || !cleanEmail || !cleanMessage) {
            return { success: false, error: 'Please provide your name, email, and message.' };
        }

        const messages = getContactMessages();
        const newMsg = {
            id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            name: cleanName,
            email: cleanEmail,
            subject: cleanSubject,
            message: cleanMessage,
            timestamp: new Date().toISOString(),
            read: false,
            readBy: []
        };

        messages.unshift(newMsg);
        localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(messages));

        // Asynchronously sync contact inquiry to Supabase cloud
        const client = getSupabaseClient();
        if (client) {
            client.from('contact_messages')
                .insert([messageToRow(newMsg)])
                .then(({ error }) => {
                    if (error) console.error('Supabase cloud insert contact message error:', error);
                    else console.log('Contact inquiry pushed to Supabase cloud!');
                })
                .catch(err => console.error('Supabase network error saving message:', err));
        }

        if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
            document.dispatchEvent(new CustomEvent('contactMessagesUpdated', { detail: { count: messages.length } }));
        }

        renderHeaderAuth();
        return { success: true, message: 'Your message has been sent to our leadership team!' };
    }

    function getUnreadContactMessageCount(userIdOrEmail) {
        const messages = getContactMessages();
        const user = getCurrentUser();
        const idKey = (userIdOrEmail || (user ? (user.id || user.email) : '') || '').toLowerCase();
        if (!idKey) {
            return messages.filter(m => !m.read).length;
        }
        return messages.filter(m => {
            if (!m.readBy) return !m.read;
            return !m.readBy.some(x => String(x).toLowerCase() === idKey);
        }).length;
    }

    function markContactMessageRead(msgId) {
        const messages = getContactMessages();
        const user = getCurrentUser();
        const userKey = user ? (user.id || user.email || '').toLowerCase() : 'anonymous';

        let found = false;
        messages.forEach(m => {
            if (m.id === msgId) {
                m.read = true;
                if (!m.readBy) m.readBy = [];
                if (!m.readBy.includes(userKey)) {
                    m.readBy.push(userKey);
                }
                found = true;
            }
        });

        if (found) {
            localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(messages));
            renderHeaderAuth();
            if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
                document.dispatchEvent(new CustomEvent('contactMessagesUpdated'));
            }

            const client = getSupabaseClient();
            if (client) {
                const updatedMsg = messages.find(m => m.id === msgId);
                if (updatedMsg) {
                    client.from('contact_messages')
                        .update({ read: true, read_by: updatedMsg.readBy || [] })
                        .eq('id', String(msgId))
                        .catch(err => console.error('Supabase mark read error:', err));
                }
            }
        }
        return { success: found };
    }

    function markAllContactMessagesRead() {
        const messages = getContactMessages();
        const user = getCurrentUser();
        const userKey = user ? (user.id || user.email || '').toLowerCase() : 'anonymous';

        messages.forEach(m => {
            m.read = true;
            if (!m.readBy) m.readBy = [];
            if (!m.readBy.includes(userKey)) {
                m.readBy.push(userKey);
            }
        });

        localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(messages));
        renderHeaderAuth();
        if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
            document.dispatchEvent(new CustomEvent('contactMessagesUpdated'));
        }

        const client = getSupabaseClient();
        if (client) {
            client.from('contact_messages')
                .update({ read: true })
                .neq('id', '___none___')
                .catch(err => console.error('Supabase mark all read error:', err));
        }

        return { success: true };
    }

    function deleteContactMessage(msgId) {
        if (!isAdmin() && !isCoFounder()) {
            throw new Error('Permission denied: Only Co-Founders and Administrators can delete messages.');
        }
        let messages = getContactMessages();
        messages = messages.filter(m => m.id !== msgId);
        localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(messages));
        renderHeaderAuth();
        if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
            document.dispatchEvent(new CustomEvent('contactMessagesUpdated'));
        }

        // Asynchronously delete message in Supabase cloud
        const client = getSupabaseClient();
        if (client) {
            client.from('contact_messages')
                .delete()
                .eq('id', String(msgId))
                .then(({ error }) => {
                    if (error) console.error('Supabase cloud delete contact message error:', error);
                    else console.log('Contact message deleted from Supabase cloud!');
                })
                .catch(err => console.error('Supabase network error deleting message:', err));
        }

        return { success: true };
    }

    async function confirmDeleteContactMessage(msgId) {
        const ok = await showConfirm('Are you sure you want to delete this message?');
        if (ok) {
            deleteContactMessage(msgId);
            openContactInquiriesModal();
        }
    }

    function openContactInquiriesModal() {
        const user = getCurrentUser();
        if (!user || (!isAdmin() && !isCoFounder(user))) {
            showAlert('Access restricted to Co-Founders and Platform Administrators.');
            return;
        }

        let modal = document.getElementById('contactInquiriesModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'contactInquiriesModal';
            modal.className = 'inquiriesModalBackdrop';
            document.body.appendChild(modal);
        }

        const messages = getContactMessages();
        const userKey = (user.id || user.email || '').toLowerCase();
        const unreadCount = getUnreadContactMessageCount(userKey);

        const listHtml = messages.length === 0 ? `
            <div class="inquiriesEmptyState">
                <h3>No Inquiries Yet</h3>
                <p>Messages submitted through the contact form will appear here for Co-Founders.</p>
            </div>
        ` : messages.map(msg => {
            const isRead = msg.read || (msg.readBy && msg.readBy.includes(userKey));
            const dateStr = new Date(msg.timestamp).toLocaleString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const safeSubject = (msg.subject || 'General Inquiry').replace(/"/g, '&quot;');
            const safeName = (msg.name || 'Anonymous').replace(/</g, '&lt;');
            const safeEmail = (msg.email || '').replace(/"/g, '&quot;');
            const safeBody = (msg.message || '').replace(/</g, '&lt;');

            return `
                <div class="inquiryCard ${isRead ? 'isRead' : 'isUnread'}" id="inquiry-${msg.id}">
                    <div class="inquiryCardHeader">
                        <div class="inquirySenderMeta">
                            <span class="inquirySenderName">${safeName}</span>
                            <a href="mailto:${safeEmail}?subject=Re: ${encodeURIComponent(msg.subject || 'Inquiry')}" class="inquirySenderEmail" title="Reply to ${safeEmail}">
                                &lt;${safeEmail}&gt;
                            </a>
                            <span class="inquiryDate">${dateStr}</span>
                        </div>
                        <div class="inquiryCardActions">
                            ${!isRead ? `
                                <button type="button" class="inquiryActionBtn markReadBtn" onclick="DB.markContactMessageRead('${msg.id}'); DB.openContactInquiriesModal();" title="Mark as read">
                                    Mark Read
                                </button>
                            ` : ''}
                            <a href="mailto:${safeEmail}?subject=Re: ${encodeURIComponent(msg.subject || 'Inquiry')}" class="inquiryActionBtn replyBtn" title="Send email response">
                                Reply
                            </a>
                            <button type="button" class="inquiryActionBtn deleteBtn" onclick="DB.confirmDeleteContactMessage('${msg.id}')" title="Delete message">
                                Delete
                            </button>
                        </div>
                    </div>
                    <div class="inquirySubjectRow">
                        <span class="inquirySubjectTag">${safeSubject}</span>
                    </div>
                    <div class="inquiryMessageBody">
                        ${safeBody}
                    </div>
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="inquiriesModalContent" role="dialog" aria-labelledby="inquiriesModalTitle" onclick="event.stopPropagation()">
                <div class="inquiriesModalHeader">
                    <div class="inquiriesHeaderLeft">
                        <span class="inquiriesHeaderBadge">Inquiries</span>
                        <h2 id="inquiriesModalTitle">Contact Inquiries</h2>
                        <span class="inquiriesHeaderCount">${messages.length} total ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}</span>
                    </div>
                    <div class="inquiriesHeaderActions">
                        ${unreadCount > 0 ? `
                            <button type="button" class="inquiriesMarkAllBtn" onclick="DB.markAllContactMessagesRead(); DB.openContactInquiriesModal();">
                                Mark All as Read
                            </button>
                        ` : ''}
                        <button type="button" class="inquiriesCloseBtn" onclick="DB.closeContactInquiriesModal()" aria-label="Close modal">✕</button>
                    </div>
                </div>
                <div class="inquiriesModalList">
                    ${listHtml}
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        modal.onclick = (e) => {
            if (e.target === modal) closeContactInquiriesModal();
        };
    }

    function closeContactInquiriesModal() {
        const modal = document.getElementById('contactInquiriesModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function saveAuthorProfile(authorName, data) {
        if (!authorName) return;
        const cleanName = authorName.trim();
        const currentUser = getCurrentUser();

        // If currentUser is this author, update their user session too
        if (currentUser && currentUser.name && currentUser.name.trim().toLowerCase() === cleanName.toLowerCase()) {
            updateUserProfile({
                ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
                ...(data.bio !== undefined ? { bio: data.bio } : {}),
                ...(data.instagram !== undefined ? { instagram: data.instagram } : {}),
                ...(data.linkedin !== undefined ? { linkedin: data.linkedin } : {}),
                ...(data.publicEmail !== undefined ? { publicEmail: data.publicEmail } : {})
            });
        }

        let customProfiles = {};
        try {
            customProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
        } catch (e) {
            customProfiles = {};
        }

        customProfiles[cleanName.toLowerCase()] = {
            ...(customProfiles[cleanName.toLowerCase()] || {}),
            ...data
        };

        try {
            localStorage.setItem(PROFILES_KEY, JSON.stringify(customProfiles));
        } catch (e) {
            console.error('Error saving author profile:', e);
        }

        // Asynchronously sync author profile to Supabase cloud
        const client = getSupabaseClient();
        if (client) {
            const merged = getAuthorProfile(cleanName);
            if (merged) {
                client.from('profiles')
                    .upsert([profileToRow(merged, currentUser)], { onConflict: 'id' })
                    .then(({ error }) => {
                        if (error) console.error('Supabase cloud profile upsert error:', error);
                        else console.log('Author profile saved to Supabase cloud!');
                    })
                    .catch(err => console.error('Supabase network error saving author profile:', err));
            }
        }
    }

    function compressImage(file, maxWidth = 1200, quality = 0.82) {
        return new Promise((resolve, reject) => {
            if (!file) return reject(new Error('No file provided'));
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }

    function exportBackupJSON() {
        const data = {
            exportedAt: new Date().toISOString(),
            users: getAllUsers(),
            customArticles: getCustomArticles(),
            deletedArticleIds: Array.from(getDeletedArticleIds())
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `article_website_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function getAuthorAvatar(authorName) {
        if (!authorName) return null;
        const profile = getAuthorProfile(authorName);
        if (profile && profile.avatar) return profile.avatar;
        const clean = authorName.trim().toLowerCase();
        if (clean === 'ali mert bayar') return 'images/mert_img.png';
        return null;
    }

    // Run initialization
    init();

    // =========================================================================
    //  Editorial Picks
    // =========================================================================
    function getEditorialPicks() {
        try {
            const raw = localStorage.getItem(EDITORIAL_PICKS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    async function pullEditorialPicksFromCloud() {
        const client = getSupabaseClient();
        if (!client) return { success: false, reason: 'no_client' };
        try {
            // 1. Try dedicated table first if available
            const { data, error } = await client
                .from(EDITORIAL_PICKS_CLOUD_TABLE)
                .select('slot, article_id')
                .order('slot', { ascending: true });
            if (!error && Array.isArray(data) && data.length > 0) {
                const picks = data
                    .sort((a, b) => (a.slot || 0) - (b.slot || 0))
                    .map(row => String(row.article_id || '').trim())
                    .filter(Boolean)
                    .slice(0, 3);
                localStorage.setItem(EDITORIAL_PICKS_KEY, JSON.stringify(picks));
                return { success: true, picks };
            }

            // 2. Fallback to profiles metadata storage (id: 'editorial_picks')
            const { data: profData, error: profErr } = await client
                .from('profiles')
                .select('bio')
                .eq('id', 'editorial_picks')
                .maybeSingle();

            if (!profErr && profData && profData.bio) {
                try {
                    const parsed = JSON.parse(profData.bio);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const picks = parsed.map(String).filter(Boolean).slice(0, 3);
                        localStorage.setItem(EDITORIAL_PICKS_KEY, JSON.stringify(picks));
                        return { success: true, picks };
                    }
                } catch (e) {}
            }
            return { success: false, reason: 'no_data' };
        } catch (err) {
            console.warn('Supabase editorial picks pull network error:', err);
            return { success: false, reason: 'network_error' };
        }
    }

    async function pushEditorialPicksToCloud(pickIds) {
        const client = getSupabaseClient();
        if (!client) return { success: false, reason: 'no_client' };
        const sanitized = (Array.isArray(pickIds) ? pickIds : []).map(String).filter(Boolean).slice(0, 3);

        // Always save to profiles metadata table row for 100% reliable cross-device persistence
        try {
            await client.from('profiles').upsert([{
                id: 'editorial_picks',
                name: '[SYSTEM] Editorial Picks',
                email: 'system@articlewebsite.com',
                role: 'system',
                bio: JSON.stringify(sanitized)
            }], { onConflict: 'id' });
        } catch (metaErr) {
            console.warn('Failed saving editorial picks to profiles metadata:', metaErr);
        }

        // Also attempt dedicated table if present
        try {
            const payload = sanitized.map((id, index) => ({
                slot: index + 1,
                article_id: id
            }));
            if (payload.length > 0) {
                await client.from(EDITORIAL_PICKS_CLOUD_TABLE).upsert(payload, { onConflict: 'slot' });
            }
            await client.from(EDITORIAL_PICKS_CLOUD_TABLE).delete().gt('slot', sanitized.length);
        } catch (tableErr) {
            // Optional table may not exist; metadata row above succeeds
        }

        return { success: true, picks: sanitized };
    }

    function saveEditorialPicks(pickIds) {
        if (!isAdmin() && !isCoFounder()) {
            throw new Error('Permission denied: Only editors and co-founders can curate picks.');
        }
        const normalized = (Array.isArray(pickIds) ? pickIds : []).map(String).filter(Boolean).slice(0, 3);
        localStorage.setItem(EDITORIAL_PICKS_KEY, JSON.stringify(normalized));

        // Async cloud sync for cross-device consistency
        pushEditorialPicksToCloud(normalized).then((res) => {
            if (!res.success) {
                console.warn('Editorial picks cloud sync skipped/failed:', res.reason || 'unknown');
            }
        });

        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent('editorialPicksUpdated', { detail: { picks: normalized } }));
        }
        return { success: true };
    }

    function openEditorialPicksModal() {
        if (!isAdmin() && !isCoFounder()) {
            showAlert('Access denied: Editor or Co-Founder privileges required.');
            return;
        }

        let modal = document.getElementById('editorialPicksModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'editorialPicksModal';
            modal.className = 'adminModalBackdrop';
            document.body.appendChild(modal);
        }

        // Gather all available custom articles (excluding deleted)
        const customArticles = getCustomArticles();
        const deletedIds = getDeletedArticleIds();
        const allArticles = customArticles.filter(a => !deletedIds.has(String(a.id)));

        const currentPicks = getEditorialPicks();

        function buildPickSlotHTML(picks) {
            return picks.map((id, idx) => {
                const art = allArticles.find(a => String(a.id) === String(id));
                const title = art ? art.title : 'Unknown Article';
                const author = art ? (art.author || 'Unknown') : '—';
                const cat = art && art.keywords && art.keywords[0] ? art.keywords[0] : 'Article';
                const rank = String(idx + 1).padStart(2, '0');
                return `
                    <div class="epSlotRow" data-pick-id="${id}" data-idx="${idx}">
                        <div class="epRankBadge">${rank}</div>
                        <div class="epSlotInfo">
                            <span class="epSlotTag">${cat}</span>
                            <span class="epSlotTitle">${title}</span>
                            <span class="epSlotAuthor">By ${author}</span>
                        </div>
                        <div class="epSlotActions">
                            ${idx > 0 ? `<button type="button" class="epMoveBtn" onclick="DB._epMoveUp(${idx})" title="Move Up">↑</button>` : '<span class="epMovePlaceholder"></span>'}
                            ${idx < picks.length - 1 ? `<button type="button" class="epMoveBtn" onclick="DB._epMoveDown(${idx})" title="Move Down">↓</button>` : '<span class="epMovePlaceholder"></span>'}
                            <button type="button" class="epRemoveBtn" onclick="DB._epRemove(${idx})" title="Remove">✕</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function buildArticleListHTML(picks) {
            const pickedIds = picks.map(String);
            return allArticles.map(art => {
                const isPicked = pickedIds.includes(String(art.id));
                const cat = art.keywords && art.keywords[0] ? art.keywords[0] : 'Article';
                return `
                    <div class="epArticleRow ${isPicked ? 'epArticleRowPicked' : ''}" data-art-id="${art.id}">
                        <div class="epArticleInfo">
                            <span class="epSlotTag">${cat}</span>
                            <span class="epArticleTitle">${art.title}</span>
                            <span class="epSlotAuthor">By ${art.author || 'Unknown'}</span>
                        </div>
                        <button type="button" class="epAddBtn" onclick="DB._epAdd('${art.id}')" ${isPicked || pickedIds.length >= 3 ? 'disabled' : ''}>
                            ${isPicked ? '✓ Selected' : '+ Pick'}
                        </button>
                    </div>
                `;
            }).join('');
        }

        // Store working picks in modal state
        window._epWorkingPicks = [...currentPicks];

        function render() {
            const slotsEl = document.getElementById('epSlotsContainer');
            const listEl = document.getElementById('epArticleListContainer');
            if (slotsEl) slotsEl.innerHTML = window._epWorkingPicks.length
                ? buildPickSlotHTML(window._epWorkingPicks)
                : '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px 0;">No picks selected yet. Choose up to 3 articles below.</p>';
            if (listEl) {
                const q = (document.getElementById('epSearchInput')?.value || '').toLowerCase();
                const filtered = q ? allArticles.filter(a => a.title.toLowerCase().includes(q) || (a.author && a.author.toLowerCase().includes(q))) : allArticles;
                listEl.innerHTML = filtered.length ? filtered.map(art => {
                    const isPicked = window._epWorkingPicks.map(String).includes(String(art.id));
                    const cat = art.keywords && art.keywords[0] ? art.keywords[0] : 'Article';
                    return `
                        <div class="epArticleRow ${isPicked ? 'epArticleRowPicked' : ''}" data-art-id="${art.id}">
                            <div class="epArticleInfo">
                                <span class="epSlotTag">${cat}</span>
                                <span class="epArticleTitle">${art.title}</span>
                                <span class="epSlotAuthor">By ${art.author || 'Unknown'}</span>
                            </div>
                            <button type="button" class="epAddBtn" onclick="DB._epAdd('${art.id}')" ${isPicked ? 'disabled style="opacity:0.45"' : window._epWorkingPicks.length >= 3 ? 'disabled style="opacity:0.45"' : ''}>
                                ${isPicked ? 'Selected' : '+ Pick'}
                            </button>
                        </div>
                    `;
                }).join('') : '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px 0;">No articles found.</p>';
            }
        }
        window._epRender = render;

        modal.innerHTML = `
            <div class="adminModalCard" style="max-width:680px;">
                <div class="adminModalHeader">
                    <div>
                        <span class="companionBadge" style="color:var(--accent-primary);background:var(--accent-subtle);padding:3px 10px;border-radius:999px;font-size:11px;letter-spacing:0.06em;">Editorial</span>
                        <h2 style="margin-top:6px;">Edit Editor's Picks</h2>
                    </div>
                    <button type="button" class="adminCloseBtn" onclick="DB.closeEditorialPicksModal()">×</button>
                </div>

                <div style="padding:0 4px 4px;">
                    <p style="font-size:13px;color:var(--text-muted);margin:0 0 18px 0;">Select up to 3 articles to feature in the Editor's Picks section. Drag the order using ↑ ↓ buttons.</p>

                    <h4 style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);">Active Picks</h4>
                    <div id="epSlotsContainer" style="display:flex;flex-direction:column;gap:8px;margin-bottom:22px;min-height:48px;"></div>

                    <div style="border-top:1px solid var(--border-subtle);padding-top:20px;">
                        <h4 style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);">All Articles</h4>
                        <input id="epSearchInput" type="text" placeholder="Search articles…" oninput="window._epRender && window._epRender()" style="width:100%;padding:9px 14px;border-radius:10px;border:1px solid var(--border-subtle);font-size:13.5px;background:var(--bg-surface);color:var(--text-primary);outline:none;box-sizing:border-box;margin-bottom:12px;">
                        <div id="epArticleListContainer" style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto;padding-right:4px;"></div>
                    </div>

                    <div class="accountSettingsBtnRow" style="margin-top:20px;">
                        <button type="button" class="settingsCancelBtn" onclick="DB.closeEditorialPicksModal()">Cancel</button>
                        <button type="button" class="settingsSaveBtn" onclick="DB.saveEditorialPicksFromModal()">Save Picks</button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('visible');
        modal.onclick = (e) => { if (e.target === modal) closeEditorialPicksModal(); };

        // Attach internal helpers
        DB._epMoveUp = function(idx) {
            if (idx <= 0) return;
            const p = [...window._epWorkingPicks];
            [p[idx-1], p[idx]] = [p[idx], p[idx-1]];
            window._epWorkingPicks = p;
            render();
        };
        DB._epMoveDown = function(idx) {
            if (idx >= window._epWorkingPicks.length - 1) return;
            const p = [...window._epWorkingPicks];
            [p[idx], p[idx+1]] = [p[idx+1], p[idx]];
            window._epWorkingPicks = p;
            render();
        };
        DB._epRemove = function(idx) {
            window._epWorkingPicks.splice(idx, 1);
            render();
        };
        DB._epAdd = function(artId) {
            if (window._epWorkingPicks.length >= 3) return;
            if (!window._epWorkingPicks.map(String).includes(String(artId))) {
                window._epWorkingPicks.push(String(artId));
            }
            render();
        };

        render();
    }

    function closeEditorialPicksModal() {
        const modal = document.getElementById('editorialPicksModal');
        if (modal) modal.classList.remove('visible');
        window._epWorkingPicks = null;
    }

    function saveEditorialPicksFromModal() {
        const picks = window._epWorkingPicks || [];
        try {
            saveEditorialPicks(picks);
        } catch (e) {
            showAlert(e.message);
            return;
        }
        closeEditorialPicksModal();
        // Live-refresh the companion list
        if (typeof renderHeroCompanion === 'function' && typeof articlesData !== 'undefined') {
            renderHeroCompanion(articlesData);
        } else {
            // Try to trigger a refresh via custom event
            document.dispatchEvent(new Event('editorialPicksUpdated'));
        }
    }

    return {
        init,
        getAllUsers,
        registerUser,
        loginUser,
        googleAuthUser,
        logoutUser,
        getCurrentUser,
        isAuthenticated,
        isAdmin,
        getCustomArticles,
        saveArticle,
        updateArticle,
        deleteArticle,
        getDeletedArticleIds,
        restoreDeletedArticles,
        deleteUser,
        assignUserRole,
        assignAuthorRole,
        getArticleById,
        canEditArticle,
        canDeleteArticle,
        renderHeaderAuth,
        handleWriteClick,
        openAdminModal,
        closeAdminModal,
        switchAdminTab,
        adminDeleteArticlePrompt,
        adminDeleteUserPrompt,
        adminAssignRolePrompt,
        adminRestoreArticlesPrompt,
        exportBackupJSON,
        openMyArticlesModal,
        closeMyArticlesModal,
        myArticlesDeletePrompt,
        openAccountProfileModal,
        closeAccountProfileModal,
        openReadingStatsModal,
        closeReadingStatsModal,
        updateUserProfile,
        compressImage,
        getAuthorProfile,
        getAuthorAvatar,
        saveAuthorProfile,
        changePassword,
        openAccountSettingsModal,
        closeAccountSettingsModal,
        saveAccountSettings,
        getEditorialPicks,
        saveEditorialPicks,
        openEditorialPicksModal,
        closeEditorialPicksModal,
        saveEditorialPicksFromModal,
        isCoFounder,
        getCoFounders,
        getContactMessages,
        submitContactMessage,
        getUnreadContactMessageCount,
        markContactMessageRead,
        markAllContactMessagesRead,
        deleteContactMessage,
        openContactInquiriesModal,
        closeContactInquiriesModal,
        getProjects,
        getProjectsForUser,
        getProjectById,
        canEditProject,
        saveProject,
        updateProject,
        deleteProject,
        addProjectPart,
        updateProjectPart,
        deleteProjectPart,
        showAppDialog,
        dialog: showAppDialog,
        showAlert,
        showConfirm,
        confirmDeleteContactMessage,
        isDummyItem,
        // Supabase Cloud Database Methods
        isSupabaseConfigured,
        getSupabaseClient,
        syncCloudData,
        syncLocalToSupabase,
        pullEditorialPicksFromCloud,
        pushEditorialPicksToCloud,
        SUPABASE_URL
    };
})();

if (typeof window !== 'undefined') {
    window.DB = DB;
}

// Auto-render header auth once DOM is ready if header exists
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('studioAccountDropdownSlot')) {
        DB.renderHeaderAuth('studioAccountDropdownSlot', { hideWriteBtn: true });
    }
    if (document.getElementById('authHeaderSlot')) {
        DB.renderHeaderAuth('authHeaderSlot');
    } else if (document.getElementById('headerRight')) {
        DB.renderHeaderAuth('headerRight');
    }

    // Auto-sync cloud database in background if Supabase is configured
    if (typeof DB !== 'undefined' && DB.isSupabaseConfigured && DB.isSupabaseConfigured()) {
        DB.syncCloudData();
        if (!window.__dbCloudAutoSyncStarted) {
            window.__dbCloudAutoSyncStarted = true;
            window.setInterval(() => {
                DB.syncCloudData();
            }, 45000);
            window.addEventListener('focus', () => DB.syncCloudData());
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) DB.syncCloudData();
            });
        }
    }
});
