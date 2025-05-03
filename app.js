// Add these at the VERY TOP of your app.js
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Then continue with your app configuration
const app = express();
const port = 3000;

// Database connection
const pool = mysql.createPool({
    // Essential Connection Details (from Environment Variables)
    host: process.env.AZURE_MYSQL_HOST,
    user: process.env.AZURE_MYSQL_USER,
    password: process.env.AZURE_MYSQL_PASSWORD,
    database: process.env.AZURE_MYSQL_DBNAME,

    // Azure Specific SSL Requirement
    ssl: {
        // Use this setting for Azure MySQL Flexible Server default SSL
        // It requires SSL but doesn't validate the server's certificate chain strictly.
        // For production with higher security needs, you might configure specific CA certs.
        rejectUnauthorized: false
    },

    // Common Pool Management Options
    waitForConnections: true,   // Wait for available connection if pool is full (default)
    connectionLimit: 10,        // Max number of connections in pool (default)
    queueLimit: 0               // Unlimited queue requests when pool is full (default)

}).on('error', (err) => {
    // Log pool errors globally for monitoring
    console.error('[mysql Pool Error]', err.code, err.message);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: 'your_secret_key', // Use a strong, environment-variable-based secret
    resave: false,
    saveUninitialized: true, // Set to false if you only want sessions saved when modified
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true, // Helps prevent XSS
        maxAge: 24 * 60 * 60 * 1000 // Example: 1 day session
     }
}));

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/images/uploads';
        // Ensure the directory exists
        fs.mkdir(uploadDir, { recursive: true }, (err) => {
            if (err) {
                console.error("Failed to create upload directory:", err);
                return cb(err);
            }
            cb(null, uploadDir);
        });
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Error: Images only! (JPEG, JPG, PNG, GIF)')); // Pass error object
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- User Authentication Routes ---

// Register route
app.post('/register', async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;
        // Add input validation here (e.g., check password length, email format)
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, full_name]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        // Check for specific DB errors like duplicate entry
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ error: 'Username or email already exists.' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
         if (!username || !password) {
             return res.status(400).json({ error: 'Username and password are required.' });
         }

        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?', // Allow login with email too
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Regenerate session to prevent fixation attacks
        req.session.regenerate((err) => {
             if (err) {
                console.error('Session regeneration error:', err);
                return res.status(500).json({ error: 'Login failed (session error).' });
             }
             // Store user ID in session
            req.session.userId = user.id;
            console.log('Login successful, session set:', req.session); // For debugging
            res.json({ message: 'Login successful', user: { id: user.id, username: user.username } });
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: 'Logged out successfully' });
    });
});

// Check auth status
app.get('/check-auth', async (req, res) => {
    console.log('Check Auth - Session:', req.session);
    console.log('Check Auth - Session User ID:', req.session.userId);
    if (!req.session.userId) {
        console.log('Check Auth - Failing with 401');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const [users] = await pool.execute(
            'SELECT id, username, profile_pic FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
             // User ID in session doesn't match a user in DB (edge case)
             req.session.destroy(); // Clean up invalid session
             res.clearCookie('connect.sid');
            return res.status(404).json({ error: 'User associated with session not found' });
        }

        res.json({ user: users[0] });
    } catch (error) {
        console.error('Check auth status error:', error);
        res.status(500).json({ error: 'Failed to check auth status' });
    }
});


// --- Post Routes ---

// Enhanced post creation with image validation
// Use a middleware function to handle multer errors specifically
const handleUpload = upload.single('image');

app.post('/posts', (req, res, next) => {
    // Authentication check first
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    handleUpload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred (e.g., file size limit)
            console.error("Multer error:", err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size too large (max 5MB)' });
            }
            return res.status(400).json({ error: `File upload error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred (e.g., file type filter)
            console.error("Upload error:", err);
            return res.status(400).json({ error: err.message || 'Invalid file type or upload error.' });
        }
        // If no error, proceed to the route handler logic
        next();
    });
}, async (req, res) => {
    // Now handle the rest of the post creation logic
    try {
        if (!req.file) {
            // This check might be redundant if multer error handling is robust, but safe to keep
            return res.status(400).json({ error: 'Please upload an image' });
        }

        const { caption } = req.body;
        // Ensure image URL starts with a slash for web accessibility
        const imageUrl = `/images/uploads/${req.file.filename}`;

        const [result] = await pool.execute(
            'INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)',
            [req.session.userId, imageUrl, caption || ''] // Use empty string if caption is null/undefined
        );

        // Get the full post details to return
        const [posts] = await pool.execute(
            `SELECT p.*, u.username, u.profile_pic
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Post created successfully',
            post: posts[0] // Send back the newly created post object
        });
    } catch (error) {
        console.error('Post creation db/logic error:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});


// Get all posts (for feed) - Ensure user is authenticated
app.get('/posts', async (req, res) => {
    console.log(`GET /posts - Request received. Session ID: ${req.sessionID}, User ID in Session: ${req.session.userId}`); // <<< ADDED LOG
    if (!req.session.userId) {
        console.log("GET /posts - Failing with 401 (Not authenticated)"); // <<< ADDED LOG
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const currentUserId = req.session.userId;
        // Main query including follows
        const query = `
            SELECT p.*, u.username, u.profile_pic,
                   (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
                   EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS liked_by_me
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ? OR p.user_id IN (
                SELECT following_id FROM follows WHERE follower_id = ?
            )
            ORDER BY p.created_at DESC`;

        console.log(`GET /posts - Executing query for user ID: ${currentUserId}`); // <<< ADDED LOG
        let posts;
        try {
            // Attempt the main query
            [posts] = await pool.execute(query, [currentUserId, currentUserId, currentUserId]);
            console.log(`GET /posts - Main query successful, found ${posts.length} posts.`); // <<< ADDED LOG
        } catch (dbError) {
             console.error(`GET /posts - Database error during main query execution:`, dbError); // <<< ADDED LOG
             // Check if it's a missing table error specifically for 'follows'
             if (dbError.code === 'ER_NO_SUCH_TABLE' && dbError.message.includes("'follows'")) {
                 console.warn("GET /posts - 'follows' table not found. Falling back to fetching user's own posts only.");
                 // Fallback query without follows
                 const fallbackQuery = `
                     SELECT p.*, u.username, u.profile_pic,
                            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
                            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
                            EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS liked_by_me
                     FROM posts p
                     JOIN users u ON p.user_id = u.id
                     WHERE p.user_id = ?
                     ORDER BY p.created_at DESC`;
                 // Execute fallback query
                 [posts] = await pool.execute(fallbackQuery, [currentUserId, currentUserId]);
                 console.log(`GET /posts - Fallback query successful, found ${posts.length} posts.`); // <<< ADDED LOG
             } else {
                 // Re-throw other unexpected DB errors
                 throw dbError;
             }
        }

        res.json({ posts });
    } catch (error) {
        // Catch errors from the outer block OR re-thrown errors from the inner block
        console.error('GET /posts - Failed to fetch posts (Outer Catch):', error); // <<< MODIFIED LOG
        res.status(500).json({ error: 'Failed to fetch posts from server.' }); // More specific error
    }
});


// --- Like Routes ---

// Like a post
app.post('/posts/:id/like', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const postId = req.params.id;
        const userId = req.session.userId;

        // Use INSERT IGNORE to prevent errors if already liked
        await pool.execute(
            'INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)',
            [userId, postId]
        );

        res.json({ message: 'Post liked successfully' });
    } catch (error) {
        console.error('Failed to like post:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// Unlike a post
app.post('/posts/:id/unlike', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const postId = req.params.id;
        const userId = req.session.userId;

        await pool.execute(
            'DELETE FROM likes WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );

        res.json({ message: 'Post unliked successfully' });
    } catch (error) {
        console.error('Failed to unlike post:', error);
        res.status(500).json({ error: 'Failed to unlike post' });
    }
});

// --- Comment Routes ---

// Add comment
app.post('/posts/:id/comments', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const postId = req.params.id;
        const userId = req.session.userId;
        const { comment_text } = req.body;

        if (!comment_text || comment_text.trim() === '') {
             return res.status(400).json({ error: 'Comment text cannot be empty.' });
        }

        const [result] = await pool.execute(
            'INSERT INTO comments (user_id, post_id, comment_text) VALUES (?, ?, ?)',
            [userId, postId, comment_text]
        );

        // Get the newly created comment with user info
        const [comments] = await pool.execute(
            `SELECT c.*, u.username, u.profile_pic
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?`,
            [result.insertId]
        );

        if (comments.length === 0) {
             // Should not happen, but handle gracefully
             console.error(`Failed to retrieve comment with ID ${result.insertId} after insertion.`);
             return res.status(500).json({ error: 'Failed to retrieve comment after creation.' });
        }

        res.status(201).json({
            message: 'Comment added successfully',
            comment: comments[0] // Return the created comment
        });
    } catch (error) {
        console.error('Failed to add comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Get comments for a post (with pagination)
app.get('/posts/:id/comments', async (req, res) => {
    // No auth check needed here typically, comments are often public
    try {
        const postId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5; // Default limit
        const offset = (page - 1) * limit;

        const [comments] = await pool.execute(
            `SELECT c.*, u.username, u.profile_pic
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC  -- Often comments are shown oldest first
            LIMIT ? OFFSET ?`,
            [postId, limit, offset]
        );

        const [countRows] = await pool.execute(
            'SELECT COUNT(*) AS total FROM comments WHERE post_id = ?',
            [postId]
        );
        const totalComments = countRows[0].total;

        res.json({
            comments,
            total: totalComments,
            page,
            limit,
            totalPages: Math.ceil(totalComments / limit)
        });
    } catch (error) {
        console.error('Failed to fetch comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Delete comment
app.delete('/comments/:id', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const commentId = req.params.id;
        const userId = req.session.userId;

        // Verify the user owns the comment before deleting
        const [comments] = await pool.execute(
            'SELECT user_id FROM comments WHERE id = ?',
            [commentId]
        );

        if (comments.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comments[0].user_id !== userId) {
             // Add check if user is admin or post owner if needed later
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }

        await pool.execute(
            'DELETE FROM comments WHERE id = ?',
            [commentId]
        );

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Failed to delete comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});


// --- Profile Routes ---

// Get current user's profile information + stats
app.get('/profile/me', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const userId = req.session.userId;

        // Get user info
        const [users] = await pool.execute(
            'SELECT id, username, full_name, profile_pic FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = users[0];

        // Get post count
        const [postCountRows] = await pool.execute(
            'SELECT COUNT(*) AS post_count FROM posts WHERE user_id = ?',
            [userId]
        );
        user.post_count = postCountRows[0].post_count;

        // Get follower count (users following ME) - requires 'follows' table
        let followerCount = 0;
        try {
            const [followerCountRows] = await pool.execute(
                'SELECT COUNT(*) AS follower_count FROM follows WHERE following_id = ?',
                [userId]
            );
            followerCount = followerCountRows[0].follower_count;
        } catch (followError) {
             if (followError.code === 'ER_NO_SUCH_TABLE' && followError.message.includes("'follows'")) {
                console.warn("'/profile/me' - 'follows' table not found when fetching follower count. Defaulting to 0.");
                followerCount = 0;
             } else {
                 console.error("Error fetching follower count:", followError);
                 // Decide if you want to throw or just set count to 0
                 followerCount = 0; // Or throw followError;
             }
        }
        user.follower_count = followerCount;


        // Get following count (users I follow) - requires 'follows' table
        let followingCount = 0;
         try {
            const [followingCountRows] = await pool.execute(
                'SELECT COUNT(*) AS following_count FROM follows WHERE follower_id = ?',
                [userId]
            );
            followingCount = followingCountRows[0].following_count;
        } catch (followError) {
             if (followError.code === 'ER_NO_SUCH_TABLE' && followError.message.includes("'follows'")) {
                console.warn("'/profile/me' - 'follows' table not found when fetching following count. Defaulting to 0.");
                followingCount = 0;
             } else {
                 console.error("Error fetching following count:", followError);
                 followingCount = 0; // Or throw followError;
             }
        }
        user.following_count = followingCount;

        res.json({ user });

    } catch (error) {
        console.error('Failed to fetch profile info:', error);
        res.status(500).json({ error: 'Failed to fetch profile information' });
    }
});

// Get current user's posts for their profile grid
app.get('/profile/me/posts', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const userId = req.session.userId;
        const [posts] = await pool.execute(
            // Select fields needed for a grid thumbnail (id and image_url are essential)
            'SELECT id, image_url FROM posts WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        res.json({ posts });

    } catch (error) {
        console.error('Failed to fetch profile posts:', error);
        res.status(500).json({ error: 'Failed to fetch profile posts' });
    }
});

// Route to handle profile picture upload (<<< NEW ROUTE ADDED HERE)
app.post('/profile/me/picture', upload.single('profilePicture'), async (req, res) => {
    // Ensure user is logged in
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if a file was actually uploaded by multer
    if (!req.file) {
        // This might happen if fileFilter rejected the file
        // Check req.multerError if you need more specific reasons
        return res.status(400).json({ error: 'No valid file uploaded or file type not allowed.' });
    }

    try {
        const userId = req.session.userId;
        // Construct the web-accessible URL for the uploaded image
        const imageUrl = `/images/uploads/${req.file.filename}`;

        // Update the user's profile_pic path in the database
        const [result] = await pool.execute(
            'UPDATE users SET profile_pic = ? WHERE id = ?',
            [imageUrl, userId]
        );

        if (result.affectedRows === 0) {
            // Should not happen if userId is valid, but good practice to check
            return res.status(404).json({ error: 'User not found during update.' });
        }

        // Send back success response with the new image URL
        res.json({
            message: 'Profile picture updated successfully.',
            newImageUrl: imageUrl
        });

    } catch (error) {
        console.error('Failed to update profile picture:', error);
        // Handle potential file system or database errors
        res.status(500).json({ error: 'Failed to update profile picture on server.' });
    }
});


// Catch-all for serving index.html (optional, useful for SPA routing)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });


// Global error handler for multer (place after routes potentially using multer)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error("Global Multer error handler:", err);
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
        console.error("Global error handler:", err);
        // Handle errors passed from fileFilter
        if (err.message && err.message.includes('Images only')) {
             return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
    next();
});


// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});