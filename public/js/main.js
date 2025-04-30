document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired for main.js."); // <<< ADDED LOG
    // DOM elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authPage = document.getElementById('auth-page');
    const appContent = document.getElementById('app-content'); // Container for logged-in view

    // Form containers and switch links
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');
    const switchToLoginLink = document.getElementById('switch-to-login');
    const switchToSignupLink = document.getElementById('switch-to-signup');
    const loginSwitchBox = document.getElementById('login-switch-box');
    const signupSwitchBox = document.getElementById('signup-switch-box');

    // App content elements
    const feed = document.getElementById('feed'); // Ensure this is inside #app-content
    const postForm = document.getElementById('post-form');
    const postsContainer = document.getElementById('posts-container');
    const logoutLink = document.getElementById('logout-link');
    const homeLink = document.getElementById('home-link');
    const profileLink = document.getElementById('profile-link');

    // Add selection for profile elements
    const profileSection = document.getElementById('profile-section');
    const profilePic = document.getElementById('profile-pic');
    const profileUsername = document.getElementById('profile-username');
    const profilePostCount = document.getElementById('profile-post-count');
    const profileFollowerCount = document.getElementById('profile-follower-count');
    const profileFollowingCount = document.getElementById('profile-following-count');
    const profileFullname = document.getElementById('profile-fullname');
    const profilePostsGrid = document.getElementById('profile-posts-grid');
    const profilePicUploadInput = document.getElementById('profile-pic-upload'); // <<< ADDED SELECTOR

    // Check authentication status on page load (uses function defined in index.html)
    // checkAuthStatusInitial() is called in HTML after DOMContentLoaded

    // --- Form Switching ---
    if (switchToLoginLink) {
        switchToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (signupFormContainer) signupFormContainer.style.display = 'none';
            if (signupSwitchBox) signupSwitchBox.style.display = 'none';
            if (loginFormContainer) loginFormContainer.style.display = 'block';
            if (loginSwitchBox) loginSwitchBox.style.display = 'block';
        });
    }
    if (switchToSignupLink) {
        switchToSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginFormContainer) loginFormContainer.style.display = 'none';
            if (loginSwitchBox) loginSwitchBox.style.display = 'none';
            if (signupFormContainer) signupFormContainer.style.display = 'block';
            if (signupSwitchBox) signupSwitchBox.style.display = 'block';
        });
    }

    // --- Auth Functions ---

    // Updated Check authentication status function (used AFTER login/logout actions)
    async function checkAuthStatus() {
        try {
             await checkAuthStatusInitial(); // Use the global one defined in HTML
        } catch (error) {
            console.error('Auth check error:', error);
             if(authPage) authPage.style.display = 'flex';
             if(appContent) appContent.style.display = 'none';
        }
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            if (!usernameInput || !passwordInput) return;
            const username = usernameInput.value;
            const password = passwordInput.value;
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (response.ok) {
                    await checkAuthStatus(); // Update UI
                } else {
                    alert(data.error || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed. Please try again.');
            }
        });
    }

    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('register-username');
            const emailInput = document.getElementById('register-email');
            const fullNameInput = document.getElementById('register-fullname');
            const passwordInput = document.getElementById('register-password');
             if (!usernameInput || !emailInput || !fullNameInput || !passwordInput) return;
            const username = usernameInput.value;
            const email = emailInput.value;
            const fullName = fullNameInput.value;
            const password = passwordInput.value;
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, full_name: fullName, password })
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Registration successful. Please log in.');
                    if (switchToLoginLink) switchToLoginLink.click();
                } else {
                    alert(data.error || 'Registration failed');
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('Registration failed. Please try again.');
            }
        });
    }

    // Logout
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/logout', { method: 'POST' });
                const data = await response.json();
                if (response.ok) {
                     await checkAuthStatus();
                     if(loginForm) loginForm.reset();
                     if(registerForm) registerForm.reset();
                } else {
                    alert(data.error || 'Logout failed');
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('Logout failed. Please try again.');
            }
        });
    }

    // --- Navigation Event Listeners ---

    if (homeLink && feed && profileSection) {
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(profileSection) profileSection.style.display = 'none';
            if(feed) feed.style.display = 'block'; // Or 'flex' if feed uses flex
            // Optionally reload posts if returning home
            if (currentUserId && typeof loadPosts === 'function') {
                loadPosts();
            }
        });
    }

    if (profileLink && feed && profileSection) {
        profileLink.addEventListener('click', async (e) => {
            e.preventDefault();
            if(feed) feed.style.display = 'none';
            if(profileSection) profileSection.style.display = 'block'; // Or 'flex' if profile uses flex
            await loadProfileData(); // Fetch and display profile info
        });
    }


    // --- Profile Picture Upload Logic (<<< NEW LISTENERS ADDED HERE) ---

    // Add listener to PROFILE PICTURE to trigger file input
    if (profilePic && profilePicUploadInput) {
        profilePic.addEventListener('click', () => {
            if (currentUserId) { // Only allow click if logged in
                profilePicUploadInput.click(); // Trigger the hidden file input
            } else {
                console.log("Not logged in, cannot change picture.");
            }
        });
    } else {
         console.warn("Profile picture or upload input not found for click listener setup.");
    }

    // Add listener to FILE INPUT to handle selection and upload
    if (profilePicUploadInput) {
        profilePicUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file || !currentUserId) { // Also check user ID here
                event.target.value = null; // Reset input
                return;
            }

            // Optional: Show loading state (e.g., add a class to profilePic)
            if (profilePic) profilePic.style.opacity = '0.5'; // Simple loading indicator

            const formData = new FormData();
            formData.append('profilePicture', file); // Key must match backend upload.single()

            try {
                const response = await fetch('/profile/me/picture', {
                    method: 'POST',
                    body: formData
                    // No 'Content-Type' header needed for FormData with fetch
                });

                 // Always reset the input value after attempting upload
                event.target.value = null;

                const data = await response.json(); // Try to parse JSON regardless of status

                if (!response.ok) {
                    // Throw error using message from server response if available
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                }

                // Success: Update the profile picture image source immediately
                if (profilePic && data.newImageUrl) {
                    profilePic.src = data.newImageUrl + '?' + new Date().getTime(); // Add cache buster
                }

                alert(data.message || 'Profile picture updated!');

            } catch (error) {
                console.error('Profile picture upload error:', error);
                alert(`Error uploading profile picture: ${error.message}`);
                 // If the profile pic exists, maybe revert optimistic UI changes
                 // Example: Reload profile data if needed: await loadProfileData();
            } finally {
                 // Optional: Remove loading state
                 if (profilePic) profilePic.style.opacity = '1';
            }
        });
    } else {
         console.warn("Profile picture upload input element not found for change listener setup.");
    }


    // --- Post Form ---
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const captionInput = document.getElementById('post-caption');
            const imageInput = document.getElementById('post-image');
            const imagePreview = document.getElementById('image-preview');
            if (!captionInput || !imageInput || !imagePreview) return;
            const caption = captionInput.value;
            if (!imageInput.files.length) {
                alert('Please select an image'); return;
            }
            const submitButton = postForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true; submitButton.textContent = 'Uploading...';
            }
            const formData = new FormData();
            formData.append('caption', caption);
            formData.append('image', imageInput.files[0]);
            try {
                const response = await fetch('/posts', { method: 'POST', body: formData });
                const data = await response.json();
                if (response.ok) {
                    captionInput.value = ''; imageInput.value = '';
                    imagePreview.src = '#'; imagePreview.style.display = 'none';
                    if (feed && feed.style.display !== 'none') { // Only reload if feed is visible
                        loadPosts(); // Refresh the feed
                    }
                    // Optional success message
                    // ...
                } else {
                    alert(data.error || 'Failed to create post');
                }
            } catch (error) {
                console.error('Post creation error:', error);
                alert('Failed to create post. Please try again.');
            } finally {
                if (submitButton) {
                    submitButton.disabled = false; submitButton.textContent = 'Share';
                }
            }
        });
    }

    // --- Feed/Post Loading and Rendering ---

    // Load posts function definition (now globally accessible due to inline script call)
    window.loadPosts = async function() { // Assign to window to make it global
        console.log("loadPosts function execution started. currentUserId:", currentUserId); // <<< ADDED LOG
        if (!currentUserId) {
             console.warn("loadPosts: Aborting because currentUserId is not set."); // <<< MODIFIED LOG
             if(postsContainer) postsContainer.innerHTML = '<p>Please log in to see posts.</p>'; // More informative
             return;
        }
        if (!postsContainer) {
            console.error("loadPosts: Critical error - postsContainer element not found."); // <<< ADDED LOG
            return;
        }

        postsContainer.innerHTML = '<p>Loading posts...</p>'; // <<< ADDED Loading indicator

        try {
            console.log("loadPosts: Attempting to fetch /posts"); // <<< ADDED LOG
            const response = await fetch('/posts'); // Assumes GET /posts requires auth
            console.log("loadPosts: Fetch response status:", response.status); // <<< ADDED LOG

            // Try to read the response body for more clues, even if not ok
            let data;
            try {
                // Check if response is empty before trying to parse JSON
                const responseText = await response.text();
                if (!responseText) {
                    console.warn("loadPosts: Received empty response body.");
                     if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}, empty body`);
                     }
                    data = { posts: [] }; // Assume empty posts if body is empty and status is OK
                } else {
                    data = JSON.parse(responseText);
                }
                console.log("loadPosts: Fetched data:", data); // <<< ADDED LOG
            } catch (jsonError) {
                console.error("loadPosts: Failed to parse JSON response body:", jsonError);
                 if (!response.ok) {
                    console.error("loadPosts: Error response text:", responseText); // Log the text we already read
                    postsContainer.innerHTML = `<p>Could not load posts. Server returned non-JSON error (Status: ${response.status}).</p>`;
                 } else {
                     postsContainer.innerHTML = `<p>Could not load posts. Invalid data format received.</p>`;
                 }
                return; // Stop processing if data is invalid
            }


            if (response.ok) {
                 if (!data || !Array.isArray(data.posts)) { // Ensure data.posts is an array
                      console.warn("loadPosts: Response OK, but data.posts is missing or not an array.", data); // <<< ADDED LOG
                      postsContainer.innerHTML = '<p>Received invalid post data from server.</p>';
                      return;
                 }
                 console.log(`loadPosts: Response OK. Rendering ${data.posts.length} posts.`); // <<< ADDED LOG
                 renderPosts(data.posts);
            } else {
                console.error('loadPosts: Failed to load posts. Server Error:', data.error || `HTTP Status ${response.status}`); // <<< MODIFIED LOG
                 if (response.status === 401 && typeof checkAuthStatusInitial === 'function') {
                     console.log("loadPosts: Received 401 Unauthorized, re-running initial auth check."); // <<< ADDED LOG
                     await checkAuthStatusInitial(); // Force re-check which should show login page
                 } else {
                    // Show specific error if available
                     postsContainer.innerHTML = `<p>Could not load posts: ${data.error || 'An unknown server error occurred'}</p>`;
                 }
            }
        } catch (error) {
            console.error('loadPosts: Uncaught error during fetch/processing:', error); // <<< MODIFIED LOG
             postsContainer.innerHTML = `<p>Error loading posts. Check console for details.</p>`;
        }
    } // End loadPosts definition

    // Render posts
    function renderPosts(posts) {
        if (!postsContainer) {
            console.error("renderPosts: Aborting because postsContainer element not found."); // <<< ADDED LOG
            return;
        }
        console.log("renderPosts: Called with posts:", posts); // <<< ADDED LOG
        postsContainer.innerHTML = ''; // Clear loading/previous
        if (!posts || posts.length === 0) {
             console.log("renderPosts: No posts found to render."); // <<< ADDED LOG
             postsContainer.innerHTML = '<p>No posts yet. Follow someone or make your first post!</p>';
             return;
        }
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post';
            postElement.dataset.postId = post.id;
            // Provide fallback image if URL is missing or invalid
            const imageUrl = post.image_url && post.image_url.startsWith('/') ? post.image_url : '/images/placeholder.png'; // Ensure you have placeholder.png
            const profilePicUrl = post.profile_pic || '/images/default-profile.png'; // Ensure you have default-profile.png
            postElement.innerHTML = `
                <div class="post-header">
                    <img src="${profilePicUrl}" alt="${post.username}" class="post-user-avatar">
                    <span class="post-username">${post.username}</span>
                </div>
                <img src="${imageUrl}" alt="Post image by ${post.username}" class="post-image" onerror="this.onerror=null;this.src='/images/placeholder.png';"> <!-- <<< ADDED ONERROR FALLBACK -->
                <div class="post-actions">
                    <button class="post-action like-button" data-post-id="${post.id}" data-liked="${post.liked_by_me ? 'true' : 'false'}" aria-label="${post.liked_by_me ? 'Unlike' : 'Like'}">
                        ${post.liked_by_me ? '<svg aria-label="Unlike" color="#ed4956" fill="#ed4956" height="24" role="img" viewBox="0 0 48 48" width="24"><path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 1.9-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z"></path></svg>' : '<svg aria-label="Like" color="#262626" fill="#262626" height="24" role="img" viewBox="0 0 24 24" width="24"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.227-3.965 3.622-4.303 3.996-.338.374-.796.374-1.134 0-.338-.374-1.791-1.769-4.303-3.996C3.152 14.08 0 12.193 0 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.118-1.763a4.21 4.21 0 0 1 3.675-1.941z"></path></svg>'}
                    </button>
                    <button class="post-action comment-button" data-post-id="${post.id}" aria-label="Comment">
                         <svg aria-label="Comment" color="#262626" fill="#262626" height="24" role="img" viewBox="0 0 24 24" width="24"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path></svg>
                    </button>
                </div>
                <div class="post-likes">${post.like_count} like${post.like_count !== 1 ? 's' : ''}</div>
                <div class="post-caption">
                    <strong>${post.username}</strong> ${post.caption || ''}
                </div>
                <div class="post-comments">
                     ${post.comment_count > 0 ? `<a href="#" class="view-comments" data-post-id="${post.id}">View all ${post.comment_count} comment${post.comment_count !== 1 ? 's' : ''}</a>` : '<span class="no-comments">No comments yet</span>'}
                </div>
                <form class="comment-form" data-post-id="${post.id}">
                    <input type="text" class="comment-input" placeholder="Add a comment..." required>
                    <button type="submit" class="comment-submit" disabled>Post</button>
                </form>
            `;
            postsContainer.appendChild(postElement);
        });
        console.log("renderPosts: Finished appending posts. Initializing interactions."); // <<< ADDED LOG
        initializePostInteractions(); // Re-attach listeners
    }

    // Function to setup interactions for posts
    function initializePostInteractions() {
        // Remove previous listeners before adding new ones (alternative to cloning)
        document.querySelectorAll('.like-button').forEach(button => {
            button.removeEventListener('click', handleLikeToggle); // Remove existing
            button.addEventListener('click', handleLikeToggle); // Add new
        });
        document.querySelectorAll('.comment-button').forEach(button => {
             const commentButtonHandler = (e) => { // Define handler separately
                 const postId = e.currentTarget.dataset.postId;
                 const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
                 if (postElement) {
                     const commentInput = postElement.querySelector('.comment-input');
                     if(commentInput) commentInput.focus();
                 }
             };
            button.removeEventListener('click', commentButtonHandler);
            button.addEventListener('click', commentButtonHandler);
        });
        document.querySelectorAll('.comment-form').forEach(form => {
             const commentInput = form.querySelector('.comment-input');
             const submitButton = form.querySelector('.comment-submit');
             const inputHandler = () => { // Define handler
                 if (commentInput && submitButton) {
                    submitButton.disabled = commentInput.value.trim().length === 0;
                 }
             };
             if (commentInput) {
                commentInput.removeEventListener('input', inputHandler);
                commentInput.addEventListener('input', inputHandler);
             }
             form.removeEventListener('submit', handleCommentSubmit);
            form.addEventListener('submit', handleCommentSubmit);
        });
        document.querySelectorAll('.view-comments').forEach(link => {
            link.removeEventListener('click', handleViewComments);
            link.addEventListener('click', handleViewComments);
        });
    }

    // Handler for like/unlike
    async function handleLikeToggle(e) {
        const button = e.currentTarget;
        const postId = button.dataset.postId;
        if (!postId || !currentUserId) return; // Ensure postId and user exist
        const isLiked = button.dataset.liked === 'true';
        const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
        const likesCountElement = postElement ? postElement.querySelector('.post-likes') : null;
        let currentLikes = likesCountElement ? parseInt(likesCountElement.textContent.match(/\d+/)[0]) || 0 : 0;
        button.disabled = true;
        try {
            const endpoint = isLiked ? `/posts/${postId}/unlike` : `/posts/${postId}/like`;
            const response = await fetch(endpoint, { method: 'POST' });
            if (response.ok) {
                button.dataset.liked = isLiked ? 'false' : 'true';
                 const newLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
                if (likesCountElement) likesCountElement.textContent = `${newLikes} like${newLikes !== 1 ? 's' : ''}`;
                button.innerHTML = isLiked ? // Like SVG
                    '<svg aria-label="Like" color="#262626" fill="#262626" height="24" role="img" viewBox="0 0 24 24" width="24"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.227-3.965 3.622-4.303 3.996-.338.374-.796.374-1.134 0-.338-.374-1.791-1.769-4.303-3.996C3.152 14.08 0 12.193 0 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.118-1.763a4.21 4.21 0 0 1 3.675-1.941z"></path></svg>'
                  : // Unlike SVG
                  '<svg aria-label="Unlike" color="#ed4956" fill="#ed4956" height="24" role="img" viewBox="0 0 48 48" width="24"><path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 1.9-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z"></path></svg>';
                button.setAttribute('aria-label', isLiked ? 'Like' : 'Unlike');
            } else { console.error("Failed to update like status"); /* Consider reverting UI */ }
        } catch (error) { console.error('Like error:', error); /* Consider reverting UI */ }
        finally { button.disabled = false; }
    }

    // Handler for submitting a comment
    async function handleCommentSubmit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const postId = form.dataset.postId;
        const input = form.querySelector('.comment-input');
        const submitButton = form.querySelector('.comment-submit');
        const commentText = input.value.trim();
        if (!commentText || !postId || !currentUserId) return;
        submitButton.disabled = true;
        try {
            const response = await fetch(`/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_text: commentText })
            });
            const data = await response.json();
            if (response.ok && data.comment) { // Check if comment data is returned
                input.value = ''; submitButton.disabled = true;
                // Append comment directly instead of reloading all posts
                appendCommentToPost(postId, data.comment);
                // Update comment count display
                updateCommentCountDisplay(postId, 1); // Increment count by 1
            } else {
                alert(data.error || "Failed to add comment"); submitButton.disabled = false;
            }
        } catch (error) {
            console.error('Comment error:', error); alert("An error occurred while adding the comment."); submitButton.disabled = false;
        }
    }

    // Helper to append a new comment to the DOM (if comments are shown or modal is open)
    function appendCommentToPost(postId, comment) {
         // Check if comments modal is open for this post
         const modal = document.querySelector(`.comments-modal[data-post-id="${postId}"]`); // Add data-post-id to modal if using this
         if (modal) {
            const commentsList = modal.querySelector('.comments-list');
            if (commentsList) {
                 const noCommentsMsg = commentsList.querySelector('p'); // Check for "No comments" message
                 if (noCommentsMsg) noCommentsMsg.remove(); // Remove if it exists

                const commentElement = createCommentElement(comment, postId);
                commentsList.appendChild(commentElement);
            }
         }
         // Could also potentially add the first comment preview under the post directly in the feed
         // (More complex UI logic)
    }

    // Helper function to create a comment DOM element (used by modal and potentially appendCommentToPost)
     function createCommentElement(comment, postId) {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.dataset.commentId = comment.id;
        const profilePicUrl = comment.profile_pic || '/images/default-profile.png';
        commentItem.innerHTML = `
            <img src="${profilePicUrl}" alt="${comment.username}" class="comment-avatar">
            <div class="comment-content">
                <strong>${comment.username}</strong>
                <p>${comment.comment_text}</p>
                <small>${new Date(comment.created_at).toLocaleString()}</small>
                ${comment.user_id === currentUserId ?
                    `<button class="delete-comment" data-comment-id="${comment.id}" data-post-id="${postId}">Delete</button>` : ''}
            </div>`;
        // Attach delete listener if applicable
        const deleteButton = commentItem.querySelector('.delete-comment');
        if (deleteButton) {
            deleteButton.addEventListener('click', handleDeleteComment);
        }
        return commentItem;
    }

    // Helper to update the comment count display on the feed post
    function updateCommentCountDisplay(postId, change) { // change is +1 or -1
        const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
        if (!postElement) return;

        const commentsDiv = postElement.querySelector('.post-comments');
        if (!commentsDiv) return;

        const viewCommentsLink = commentsDiv.querySelector('.view-comments');
        const noCommentsSpan = commentsDiv.querySelector('.no-comments');
        let currentCount = 0;

        if (viewCommentsLink) {
            const countMatch = viewCommentsLink.textContent.match(/\d+/);
            currentCount = countMatch ? parseInt(countMatch[0], 10) : 0;
        } else if (!noCommentsSpan) {
             // If neither link nor span exists, assume 0? Or could be an issue.
             console.warn("Could not find comment count element for post", postId);
        }

        const newCount = Math.max(0, currentCount + change);

        if (newCount === 0) {
            commentsDiv.innerHTML = '<span class="no-comments">No comments yet</span>';
        } else {
            if (viewCommentsLink) {
                viewCommentsLink.textContent = `View all ${newCount} comment${newCount !== 1 ? 's' : ''}`;
            } else {
                // If switching from 0 comments to 1, create the link
                commentsDiv.innerHTML = `<a href="#" class="view-comments" data-post-id="${postId}">View all 1 comment</a>`;
                // Re-attach listener for the new link
                 const newLink = commentsDiv.querySelector('.view-comments');
                 if (newLink) {
                    newLink.removeEventListener('click', handleViewComments); // Just in case
                    newLink.addEventListener('click', handleViewComments);
                 }
            }
        }
    }


    // Handler for viewing comments
    async function handleViewComments(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const postId = link.dataset.postId;
        if(postId) await showComments(postId);
    }


    // Show comments modal with pagination
    async function showComments(postId, page = 1) {
        const existingModal = document.querySelector('.comments-modal');
        if (existingModal) existingModal.remove();
        try {
            const response = await fetch(`/posts/${postId}/comments?page=${page}&limit=5`);
            const data = await response.json();
            if (response.ok) {
                const comments = data.comments;
                const totalPages = data.totalPages;
                const modal = document.createElement('div');
                modal.className = 'comments-modal';
                modal.dataset.postId = postId; // Store postId on the modal itself
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Comments</h3>
                            <button class="close-modal" aria-label="Close comments">×</button>
                        </div>
                        <div class="comments-list">
                            ${comments.length > 0 ? comments.map(comment => createCommentElement(comment, postId).outerHTML).join('') : '<p>No comments to display.</p>'}
                        </div>
                        <div class="modal-footer">
                             <span>Page ${page} of ${totalPages}</span>
                             <div>
                                ${page > 1 ? `<button class="load-more prev" data-post-id="${postId}" data-page="${page - 1}">Previous</button>` : ''}
                                ${page < totalPages ? `<button class="load-more next" data-post-id="${postId}" data-page="${page + 1}">Next</button>` : ''}
                             </div>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
                modal.addEventListener('click', (e) => {
                     if (e.target === modal || e.target.classList.contains('close-modal')) modal.remove();
                });
                // Listeners for delete/load-more are added within createCommentElement or below
                modal.querySelectorAll('.load-more').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const postId = e.target.dataset.postId;
                        const newPage = parseInt(e.target.dataset.page);
                        if(postId && newPage) showComments(postId, newPage);
                    });
                });
            } else { alert(data.error || "Failed to load comments"); }
        } catch (error) { console.error('Comments modal error:', error); alert("An error occurred while loading comments."); }
    }

    // Handler for deleting a comment
    async function handleDeleteComment(e) {
        const button = e.currentTarget;
        const commentId = button.dataset.commentId;
        const postId = button.dataset.postId;
        if (!commentId || !postId || !currentUserId || !confirm("Are you sure you want to delete this comment?")) return;
        button.disabled = true;
        try {
            const response = await fetch(`/comments/${commentId}`, { method: 'DELETE' });
            if (response.ok) {
                 const commentItem = button.closest('.comment-item'); if (commentItem) commentItem.remove();
                 // Update comment count on the feed post
                 updateCommentCountDisplay(postId, -1); // Decrement count by 1

                 // Check if modal comment list is now empty
                 const modalCommentsList = document.querySelector('.comments-modal .comments-list');
                 if (modalCommentsList && !modalCommentsList.querySelector('.comment-item')) {
                     modalCommentsList.innerHTML = '<p>No comments to display.</p>';
                 }
            } else {
                 const data = await response.json(); alert(data.error || "Failed to delete comment"); button.disabled = false;
            }
        } catch (error) { console.error('Delete comment error:', error); alert("An error occurred while deleting the comment."); button.disabled = false; }
    }


    // --- Profile Loading Functions ---

    async function loadProfileData() {
        if (!currentUserId) return;

        // Clear previous data and show loading state
        if (profilePostsGrid) profilePostsGrid.innerHTML = '<p>Loading...</p>';
        if (profilePic) profilePic.src = '/images/default-profile.png';
        if (profileUsername) profileUsername.textContent = ' ';
        if (profileFullname) profileFullname.textContent = ' ';
        if (profilePostCount) profilePostCount.textContent = '-';
        if (profileFollowerCount) profileFollowerCount.textContent = '-';
        if (profileFollowingCount) profileFollowingCount.textContent = '-';

        try {
            // Fetch profile info
            const infoResponse = await fetch('/profile/me');
            if (!infoResponse.ok) throw new Error(`HTTP error! status: ${infoResponse.status}`);
            const infoData = await infoResponse.json();
            const user = infoData.user;
            if(!user) throw new Error("User data not found in response.");

            // Update profile header elements
            // Add cache buster to profile pic URL to force reload after upload
            if (profilePic) profilePic.src = (user.profile_pic || '/images/default-profile.png') + '?' + new Date().getTime();
            if (profileUsername) profileUsername.textContent = user.username;
            if (profileFullname) profileFullname.textContent = user.full_name || '';
            if (profilePostCount) profilePostCount.textContent = user.post_count ?? 0;
            if (profileFollowerCount) profileFollowerCount.textContent = user.follower_count ?? 0;
            if (profileFollowingCount) profileFollowingCount.textContent = user.following_count ?? 0;

            // Fetch profile posts
            const postsResponse = await fetch('/profile/me/posts');
             if (!postsResponse.ok) throw new Error(`HTTP error! status: ${postsResponse.status}`);
            const postsData = await postsResponse.json();
            renderProfilePosts(postsData.posts);

        } catch (error) {
            console.error('Failed to load profile data:', error);
            if (profilePostsGrid) profilePostsGrid.innerHTML = `<p>Could not load profile data. ${error.message}</p>`;
        }
    } // End loadProfileData

    function renderProfilePosts(posts) {
        if (!profilePostsGrid) return;
        profilePostsGrid.innerHTML = ''; // Clear loading/previous
        if (!posts || posts.length === 0) {
            profilePostsGrid.innerHTML = '<p>No posts yet.</p>';
            return;
        }
        posts.forEach(post => {
            const postItem = document.createElement('div');
            postItem.className = 'profile-post-item';
            // TODO: Add click listener to open post detail modal
            // postItem.dataset.postId = post.id;
            const img = document.createElement('img');
             // Add fallback for profile grid images too
            img.src = post.image_url || '/images/placeholder.png';
            img.alt = 'User post';
            img.loading = 'lazy';
            img.onerror = function() { this.onerror=null; this.src='/images/placeholder.png'; }; // <<< ADDED ONERROR FALLBACK
            postItem.appendChild(img);
            profilePostsGrid.appendChild(postItem);
        });
    } // End renderProfilePosts


}); // End DOMContentLoaded