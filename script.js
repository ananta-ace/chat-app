// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA2vQSMUNMtmrGN1zFbJK-xUnwL9FS4Cz8",
    authDomain: "chat-app-6ab40.firebaseapp.com",
    projectId: "chat-app-6ab40",
    storageBucket: "chat-app-6ab40.firebasestorage.app",
    messagingSenderId: "296989520480",
    appId: "1:296989520480:web:020aa53edc8d17b7080905",
    measurementId: "G-34MGHYF4L5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Valid credentials
const validCredentials = {
    'ace': 'atnainbta',
    'you': 'asdfghjkl',
    'mee': 'lkjhgfdsa',
    'tnz': 'qwertyuiop'
};

// User profile data
const userProfiles = {
    'ace': { initial: 'A', color: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    'you': { initial: 'Y', color: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
    'mee': { initial: 'M', color: 'linear-gradient(135deg, #10b981, #059669)' },
    'tnz': { initial: 'T', color: 'linear-gradient(135deg, #f59e0b, #d97706)' }
};

// Storage for all messages between users
let allMessages = {};

// Storage for user activity (last login time)
let userActivity = {};

// Load data from Firebase on startup
function loadFirebaseData() {
    // Load messages from Firebase
    database.ref('messages').once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            allMessages = data;
        }
        initializeMessageStorage();
    }).catch((error) => {
        console.error('Error loading messages:', error);
        initializeMessageStorage();
    });

    // Load user activity from Firebase
    database.ref('userActivity').once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            userActivity = data;
        }
        initializeUserActivity();
    }).catch((error) => {
        console.error('Error loading user activity:', error);
        initializeUserActivity();
    });
}

// Initialize message storage for all users if not exists
function initializeMessageStorage() {
    const users = Object.keys(userProfiles);
    let needsUpdate = false;
    
    users.forEach(sender => {
        if (!allMessages[sender]) {
            allMessages[sender] = {};
            needsUpdate = true;
        }
        users.forEach(receiver => {
            if (sender !== receiver && !allMessages[sender][receiver]) {
                allMessages[sender][receiver] = [];
                needsUpdate = true;
            }
        });
    });
    
    if (needsUpdate) {
        saveMessagesToFirebase();
    }
}

// Initialize user activity for all users if not exists
function initializeUserActivity() {
    const users = Object.keys(userProfiles);
    let needsUpdate = false;
    
    users.forEach(user => {
        if (!userActivity[user]) {
            userActivity[user] = {
                lastActive: new Date().toISOString(),
                isOnline: false
            };
            needsUpdate = true;
        }
    });
    
    if (needsUpdate) {
        saveActivityToFirebase();
    }
}

// Save messages to Firebase
function saveMessagesToFirebase() {
    database.ref('messages').set(allMessages).catch((error) => {
        console.error('Error saving messages to Firebase:', error);
    });
}

// Save activity to Firebase
function saveActivityToFirebase() {
    database.ref('userActivity').set(userActivity).catch((error) => {
        console.error('Error saving activity to Firebase:', error);
    });
}

// Update user activity (when user logs in)
function updateUserActivity(username) {
    userActivity[username] = {
        lastActive: new Date().toISOString(),
        isOnline: true
    };
    saveActivityToFirebase();
}

// Get user status text
function getUserStatus(user) {
    if (!userActivity[user]) return "Last seen recently";
    
    const lastActive = new Date(userActivity[user].lastActive);
    const now = new Date();
    const diffMs = now - lastActive;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (userActivity[user].isOnline) {
        return "Online";
    } else if (diffMins < 1) {
        return "Last seen just now";
    } else if (diffMins < 60) {
        return `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
        return `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
}

// Check if user is online (considered online if active within 2 minutes)
function isUserOnline(user) {
    if (!userActivity[user]) return false;
    
    const lastActive = new Date(userActivity[user].lastActive);
    const now = new Date();
    const diffMs = now - lastActive;
    const diffMins = Math.floor(diffMs / 60000);
    
    return diffMins < 2; // Online if active within 2 minutes
}

// DOM Elements
const loginPage = document.getElementById('loginPage');
const chatApp = document.getElementById('chatApp');
const chatInterface = document.getElementById('chatInterface');
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const navProfile = document.getElementById('navProfile');
const profilesList = document.getElementById('profilesList');
const emptyState = document.getElementById('emptyState');
const profilePopupOverlay = document.getElementById('profilePopupOverlay');
const profilePopup = document.getElementById('profilePopup');
const popupClose = document.getElementById('popupClose');
const logoutButton = document.getElementById('logoutButton');
const popupProfilePic = document.getElementById('popupProfilePic');
const popupUsername = document.getElementById('popupUsername');
const backButton = document.getElementById('backButton');
const chatRecipient = document.getElementById('chatRecipient');
const chatWithName = document.getElementById('chatWithName');
const chatStatus = document.getElementById('chatStatus');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const messagesContainer = document.getElementById('messagesContainer');
const noMessages = document.getElementById('noMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

let currentUser = null;
let currentChatRecipient = null;
let profileClickListener = null;
let activityInterval = null;
let messagesRef = null;
let activityRef = null;

// Initialize Firebase data
loadFirebaseData();

// Start activity tracking for current user
function startActivityTracking() {
    if (activityInterval) clearInterval(activityInterval);
    
    // Update activity every 30 seconds
    activityInterval = setInterval(() => {
        if (currentUser) {
            updateUserActivity(currentUser);
        }
    }, 30000);
}

// Listen for real-time message updates
function setupMessageListeners() {
    if (messagesRef) {
        messagesRef.off(); // Remove previous listeners
    }
    
    // Listen for message updates
    messagesRef = database.ref('messages');
    messagesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allMessages = data;
            
            // Update UI if we're in a chat
            if (currentChatRecipient) {
                loadChatMessages(currentChatRecipient);
            }
            
            // Update profile list for new message indicators
            if (currentUser) {
                updateOnlineStatus();
            }
        }
    });
}

// Listen for real-time activity updates
function setupActivityListeners() {
    if (activityRef) {
        activityRef.off(); // Remove previous listeners
    }
    
    // Listen for activity updates
    activityRef = database.ref('userActivity');
    activityRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            userActivity = data;
            
            // Update online status in UI
            if (currentUser) {
                updateOnlineStatus();
                
                // Update chat status if in chat interface
                if (currentChatRecipient) {
                    updateChatStatus(currentChatRecipient);
                }
            }
        }
    });
}

// Toggle password visibility
togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    const eyeIcon = togglePassword.querySelector('i');
    if (type === 'text') {
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
});

// Login form submission
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    // Reset error message
    errorMessage.style.display = 'none';
    
    // Validate credentials
    if (validCredentials[username] && validCredentials[username] === password) {
        // Successful login
        currentUser = username;
        
        // Update user activity
        updateUserActivity(username);
        
        // Show loading state
        const loginButton = loginForm.querySelector('.login-button');
        const originalText = loginButton.textContent;
        loginButton.textContent = 'Authenticating...';
        loginButton.disabled = true;
        
        // Simulate authentication delay
        setTimeout(() => {
            // Switch to chat app
            loginPage.style.display = 'none';
            chatApp.style.display = 'flex';
            chatInterface.style.display = 'none';
            
            // Start activity tracking
            startActivityTracking();
            
            // Setup real-time listeners
            setupMessageListeners();
            setupActivityListeners();
            
            // Update UI with current user
            updateUIForUser(username);
            
            // Reset login form
            loginButton.textContent = originalText;
            loginButton.disabled = false;
            loginForm.reset();
        }, 800);
    } else {
        // Failed login
        errorMessage.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
        
        // Shake animation for error
        loginForm.style.animation = 'none';
        setTimeout(() => {
            loginForm.style.animation = 'shake 0.5s ease-in-out';
        }, 10);
        
        // Remove shake animation after it completes
        setTimeout(() => {
            loginForm.style.animation = '';
        }, 500);
    }
});

// Update UI for logged in user
function updateUIForUser(username) {
    const profileData = userProfiles[username];
    
    // Clear previous profile data completely
    navProfile.innerHTML = '';
    
    // Update navigation profile with new user
    navProfile.innerHTML = `
        <div class="profile-pic" style="background: ${profileData.color}">
            ${profileData.initial}
        </div>
        <div class="profile-username">${username}</div>
    `;
    
    // Remove previous click event listener if exists
    if (profileClickListener) {
        navProfile.removeEventListener('click', profileClickListener);
    }
    
    // Add new click event to open profile popup
    profileClickListener = openProfilePopup;
    navProfile.addEventListener('click', profileClickListener);
    
    // Generate other profiles (excluding current user)
    const otherUsers = Object.keys(userProfiles).filter(user => user !== username);
    
    if (otherUsers.length > 0) {
        emptyState.style.display = 'none';
        profilesList.innerHTML = '';
        
        otherUsers.forEach((user, index) => {
            const userData = userProfiles[user];
            const profileCard = document.createElement('div');
            profileCard.className = 'profile-card';
            profileCard.style.animationDelay = `${(index + 1) * 0.1}s`;
            
            // Check if user has new messages
            const hasNewMessages = checkForNewMessages(user);
            
            // Get user status
            const userIsOnline = isUserOnline(user);
            const statusText = getUserStatus(user);
            
            // Create larger profile card with status
            profileCard.innerHTML = `
                <div class="card-profile-pic" style="background: ${userData.color}">
                    ${userData.initial}
                    <div class="online-status ${userIsOnline ? 'online' : 'offline'}"></div>
                </div>
                <div class="card-info">
                    <div class="card-username">${user}</div>
                    <div class="card-status">
                        <span class="last-active">${statusText}</span>
                        ${hasNewMessages ? '<span class="new-message-indicator">New Message</span>' : ''}
                    </div>
                </div>
            `;
            
            // Add click event to open chat with this profile
            profileCard.addEventListener('click', () => {
                openChatWithUser(user);
            });
            
            profilesList.appendChild(profileCard);
        });
    } else {
        emptyState.style.display = 'block';
        profilesList.innerHTML = '';
    }
}

// Check if there are new messages from a user
function checkForNewMessages(sender) {
    if (!currentUser || !allMessages[sender] || !allMessages[sender][currentUser]) {
        return false;
    }
    
    const messages = allMessages[sender][currentUser];
    // Check if any message hasn't been seen
    return messages.some(msg => !msg.seen);
}

// Update online status for all users
function updateOnlineStatus() {
    const profileCards = profilesList.querySelectorAll('.profile-card');
    profileCards.forEach(card => {
        const username = card.querySelector('.card-username').textContent;
        const onlineStatus = card.querySelector('.online-status');
        const statusSpan = card.querySelector('.last-active');
        
        if (username && onlineStatus && statusSpan) {
            const userIsOnline = isUserOnline(username);
            const statusText = getUserStatus(username);
            
            onlineStatus.className = `online-status ${userIsOnline ? 'online' : 'offline'}`;
            statusSpan.textContent = statusText;
            
            // Check for new messages indicator
            const hasNewMessages = checkForNewMessages(username);
            const newMsgIndicator = card.querySelector('.new-message-indicator');
            
            if (hasNewMessages && !newMsgIndicator) {
                const indicator = document.createElement('span');
                indicator.className = 'new-message-indicator';
                indicator.textContent = 'New Message';
                card.querySelector('.card-status').appendChild(indicator);
            } else if (!hasNewMessages && newMsgIndicator) {
                newMsgIndicator.remove();
            }
        }
    });
}

// Open chat with a user
function openChatWithUser(recipient) {
    currentChatRecipient = recipient;
    
    // Update chat interface with recipient info
    chatRecipient.textContent = recipient;
    chatWithName.textContent = recipient;
    
    // Update chat status
    updateChatStatus(recipient);
    
    // Switch to chat interface
    chatApp.style.display = 'none';
    chatInterface.style.display = 'flex';
    
    // Mark messages from this user as seen
    markMessagesAsSeen(recipient);
    
    // Load messages for this chat
    loadChatMessages(recipient);
    
    // Clear message input and focus
    messageInput.value = '';
    messageInput.focus();
}

// Update chat status for recipient
function updateChatStatus(recipient) {
    const isOnline = isUserOnline(recipient);
    const status = getUserStatus(recipient);
    
    statusDot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
    statusText.textContent = status;
}

// Mark messages from a user as seen
function markMessagesAsSeen(sender) {
    if (!currentUser || !allMessages[sender] || !allMessages[sender][currentUser]) {
        return;
    }
    
    const messages = allMessages[sender][currentUser];
    let updated = false;
    
    messages.forEach(msg => {
        if (!msg.seen) {
            msg.seen = true;
            msg.seenAt = new Date().toISOString();
            updated = true;
            
            // Notify the sender that their message was seen
            if (allMessages[currentUser] && allMessages[currentUser][sender]) {
                const sentMessages = allMessages[currentUser][sender];
                sentMessages.forEach(sentMsg => {
                    if (sentMsg.timestamp === msg.timestamp) {
                        sentMsg.seen = true;
                        sentMsg.seenAt = new Date().toISOString();
                    }
                });
            }
        }
    });
    
    if (updated) {
        saveMessagesToFirebase();
        updateOnlineStatus(); // Update UI to remove new message indicator
    }
}

// Load messages for current chat
function loadChatMessages(recipient) {
    // Clear messages container
    messagesContainer.innerHTML = '';
    
    // Get messages from both sides
    const messagesFromMe = allMessages[currentUser]?.[recipient] || [];
    const messagesToMe = allMessages[recipient]?.[currentUser] || [];
    
    // Combine and sort all messages by timestamp
    const allMessagesCombined = [
        ...messagesFromMe.map(msg => ({ 
            ...msg, 
            sender: currentUser, 
            type: 'sent',
            status: msg.seen ? 'seen' : (msg.delivered ? 'delivered' : 'sent')
        })),
        ...messagesToMe.map(msg => ({ 
            ...msg, 
            sender: recipient, 
            type: 'received',
            status: 'received'
        }))
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (allMessagesCombined.length === 0) {
        // Show no messages state
        const noMsgClone = noMessages.cloneNode(true);
        messagesContainer.appendChild(noMsgClone);
    } else {
        // Display all messages
        allMessagesCombined.forEach(msg => {
            displayMessage(msg.text, msg.sender, msg.type, msg.timestamp, msg.status);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Display a message in the chat
function displayMessage(text, sender, type, timestamp, status) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    // Format time
    const time = new Date(timestamp);
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Show sender name for received messages
    const senderDisplay = type === 'received' ? 
        `<div class="message-sender">${sender}</div>` : '';
    
    // Status indicator for sent messages - UPDATED FOR GREEN TICKS
    let statusIndicator = '';
    if (type === 'sent') {
        let statusClass = '';
        let statusIcon = '';
        
        if (status === 'sent') {
            statusClass = 'single-tick';
            statusIcon = '✓';
        } else if (status === 'delivered') {
            statusClass = 'double-tick';
            statusIcon = '✓✓';
        } else if (status === 'seen') {
            statusClass = 'double-tick-seen';
            statusIcon = '✓✓'; // Green ticks for seen
        }
        
        statusIndicator = `<span class="message-status ${statusClass}">${statusIcon}</span>`;
    }
    
    messageElement.innerHTML = `
        ${senderDisplay}
        ${text}
        <div class="message-time">
            ${timeString}
            ${statusIndicator}
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
}

// Back button functionality
backButton.addEventListener('click', function() {
    chatInterface.style.display = 'none';
    chatApp.style.display = 'flex';
    currentChatRecipient = null;
    updateUIForUser(currentUser);
});

// Send message functionality
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText || !currentChatRecipient || !currentUser) return;
    
    // Create message object
    const message = {
        text: messageText,
        timestamp: new Date().toISOString(),
        delivered: false,
        seen: false
    };
    
    // Add to messages storage
    if (!allMessages[currentUser]) allMessages[currentUser] = {};
    if (!allMessages[currentUser][currentChatRecipient]) {
        allMessages[currentUser][currentChatRecipient] = [];
    }
    allMessages[currentUser][currentChatRecipient].push(message);
    
    // Save to Firebase
    saveMessagesToFirebase();
    
    // Display the sent message
    displayMessage(messageText, currentUser, 'sent', message.timestamp, 'sent');
    
    // Clear input and focus
    messageInput.value = '';
    messageInput.focus();
    
    // Hide no messages state if it exists
    const noMessagesElement = messagesContainer.querySelector('.no-messages');
    if (noMessagesElement) {
        noMessagesElement.remove();
    }
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simulate delivery after 1 second
    setTimeout(() => {
        updateMessageStatus(currentUser, currentChatRecipient, message.timestamp, 'delivered');
    }, 1000);
}

// Update message status
function updateMessageStatus(sender, receiver, timestamp, status) {
    if (!allMessages[sender] || !allMessages[sender][receiver]) return;
    
    const messages = allMessages[sender][receiver];
    const messageIndex = messages.findIndex(msg => msg.timestamp === timestamp);
    
    if (messageIndex !== -1) {
        if (status === 'delivered') {
            messages[messageIndex].delivered = true;
        } else if (status === 'seen') {
            messages[messageIndex].seen = true;
            messages[messageIndex].seenAt = new Date().toISOString();
        }
        
        saveMessagesToFirebase();
        
        // Update UI if we're in the chat
        if (currentChatRecipient === receiver) {
            loadChatMessages(receiver);
        }
    }
}

// Send message on button click
sendButton.addEventListener('click', sendMessage);

// Send message on Enter key
messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Open profile popup (only available after login)
function openProfilePopup() {
    if (!currentUser) return;
    
    const profileData = userProfiles[currentUser];
    
    // Update popup content
    popupProfilePic.style.background = profileData.color;
    popupProfilePic.textContent = profileData.initial;
    popupUsername.textContent = currentUser;
    
    // Show popup and overlay
    profilePopupOverlay.style.display = 'block';
    profilePopup.style.display = 'flex';
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close profile popup
function closeProfilePopup() {
    profilePopupOverlay.style.display = 'none';
    profilePopup.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Logout function
function logout() {
    // Close popup first
    closeProfilePopup();
    
    // Show loading state on logout button
    logoutButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
    logoutButton.disabled = true;
    
    // Simulate logout delay
    setTimeout(() => {
        // Mark user as offline
        if (currentUser && userActivity[currentUser]) {
            userActivity[currentUser].isOnline = false;
            userActivity[currentUser].lastActive = new Date().toISOString();
            saveActivityToFirebase();
        }
        
        // Remove Firebase listeners
        if (messagesRef) messagesRef.off();
        if (activityRef) activityRef.off();
        
        // Switch back to login page
        chatApp.style.display = 'none';
        chatInterface.style.display = 'none';
        loginPage.style.display = 'flex';
        
        // Clear all user data
        resetUserData();
        
        // Reset logout button
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Log Out';
        logoutButton.disabled = false;
        
        // Auto-focus on username field
        document.getElementById('username').focus();
    }, 600);
}

// Reset all user data
function resetUserData() {
    // Clear current user
    currentUser = null;
    currentChatRecipient = null;
    
    // Clear navigation profile
    navProfile.innerHTML = '';
    
    // Clear profiles list
    profilesList.innerHTML = '';
    
    // Hide empty state
    emptyState.style.display = 'none';
    
    // Clear message input
    messageInput.value = '';
    
    // Stop activity tracking
    if (activityInterval) {
        clearInterval(activityInterval);
        activityInterval = null;
    }
    
    // Remove click event listener
    if (profileClickListener) {
        navProfile.removeEventListener('click', profileClickListener);
        profileClickListener = null;
    }
}

// Event listeners for popup (only set up after login)
popupClose.addEventListener('click', closeProfilePopup);
profilePopupOverlay.addEventListener('click', closeProfilePopup);
logoutButton.addEventListener('click', logout);

// Close popup with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && profilePopupOverlay.style.display === 'block') {
        closeProfilePopup();
    }
});

// Auto-focus on username field on page load
document.getElementById('username').focus();

// Add enter key support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.activeElement.id === 'password') {
        loginForm.dispatchEvent(new Event('submit'));
    }
});

// Clear form on page load to ensure fresh state
window.addEventListener('load', function() {
    loginForm.reset();
    resetUserData();
});

// Also, you need to update your HTML file to include Firebase SDK in the head section:
// Add this line to your HTML file's head section:
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>