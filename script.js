// Add this at the start of your script.js file
let notificationPermission = false;

// Request notification permission
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        notificationPermission = permission === 'granted';
        
        if (notificationPermission) {
            // Register service worker for background notifications
            registerServiceWorker();
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
    }
}

// Register service worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCDEKwc5KKZ5NFYHgNN4MRUdijPyMgo9dI",
    authDomain: "daily-routine-tracker-cfd37.firebaseapp.com",
    projectId: "daily-routine-tracker-cfd37",
    storageBucket: "daily-routine-tracker-cfd37.firebasestorage.app",
    messagingSenderId: "682212455416",
    appId: "1:682212455416:web:d3ecc1b3d608164fc0dc0d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let isOnline = navigator.onLine;
let pendingUploads = [];

document.addEventListener('DOMContentLoaded', function() {
    // Show splash screen and animate loading
    animateSplashScreen();
    
    // Initialize the application
    initApp();
    
    // Setup authentication listeners
    setupAuthListeners();
    
    // Setup online/offline detection
    setupConnectivityListeners();
});

function initApp() {
    // Display current date
    updateCurrentDate();
    
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
        registerServiceWorker();
    }
    
    // Setup UI event listeners
    setupUIListeners();
    
    // Check authentication state
    auth.onAuthStateChanged(handleAuthStateChange);
}

function setupAuthListeners() {
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const registerToggle = document.getElementById('register-toggle');
    const loginToggle = document.getElementById('login-toggle');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const loginProfileBtn = document.getElementById('login-profile-btn');
    const profileLogoutBtn = document.getElementById('profile-logout-btn');
    
    // Login button in profile dropdown
    if (loginProfileBtn) {
        loginProfileBtn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
            setTimeout(() => {
                loginModal.classList.add('active');
            }, 10);
            const profileDropdown = document.getElementById('profile-dropdown');
            profileDropdown.classList.remove('active');
        });
    }
    
    // Logout button in profile dropdown
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                clearDisplayedData();
                showToast('Logged out successfully');
                const profileDropdown = document.getElementById('profile-dropdown');
                profileDropdown.classList.remove('active');
                document.body.classList.remove('logged-in');
            }).catch(error => {
                showToast('Error logging out: ' + error.message, 'error');
            });
        });
    }
    
    // Close modal buttons
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        });
    });
    
    // Toggle between login and register forms
    registerToggle.addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });
    
    loginToggle.addEventListener('click', () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });
    
    // Login form submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent form submission
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Show loading indicator
        showToast('Logging in...', 'info');
        
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                loginModal.classList.remove('active');
                setTimeout(() => {
                    loginModal.style.display = 'none';
                }, 300);
                loginForm.reset();
                showToast('Logged in successfully');
                document.body.classList.add('logged-in');
            })
            .catch(error => {
                showToast('Login error: ' + error.message, 'error');
            });
    });
    
    // Register form submission
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent form submission
        
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        // Show loading indicator
        showToast('Creating account...', 'info');
        
        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                loginModal.classList.remove('active');
                setTimeout(() => {
                    loginModal.style.display = 'none';
                }, 300);
                registerForm.reset();
                showToast('Account created successfully');
                document.body.classList.add('logged-in');
            })
            .catch(error => {
                showToast('Registration error: ' + error.message, 'error');
            });
    });

    // Add edit routine button handler
    const editRoutineBtn = document.getElementById('edit-routine-btn');
    if (editRoutineBtn) {
        editRoutineBtn.addEventListener('click', () => {
            const profileDropdown = document.getElementById('profile-dropdown');
            profileDropdown.classList.remove('active');
            openEditRoutineModal();
        });
    }
}

function handleAuthStateChange(user) {
    const profileEmail = document.getElementById('profile-email');
    const profileBtn = document.getElementById('profile-btn');
    const loginProfileBtn = document.getElementById('login-profile-btn');
    const profileLogoutBtn = document.getElementById('profile-logout-btn');
    
    if (user) {
        // User is signed in
        currentUser = user;
        
        // Update UI
        profileEmail.textContent = user.email;
        profileBtn.style.display = 'flex';
        loginProfileBtn.style.display = 'none';
        profileLogoutBtn.style.display = 'block';
        document.body.classList.add('logged-in');
        
        // Load user data
        loadUserData();
        
        // Sync pending uploads
        syncPendingUploads();
    } else {
        // User is signed out
        currentUser = null;
        
        // Update UI
        profileEmail.textContent = 'Not logged in';
        profileBtn.style.display = 'flex'; // Always show profile button
        loginProfileBtn.style.display = 'block';
        profileLogoutBtn.style.display = 'none';
        document.body.classList.remove('logged-in');
        
        // Clear displayed data
        clearDisplayedData();
    }
}

function setupConnectivityListeners() {
    const offlineStatus = document.getElementById('offline-status');
    
    // Online event
    window.addEventListener('online', () => {
        isOnline = true;
        offlineStatus.style.display = 'none';
        
        // Sync pending uploads when back online
        if (currentUser) {
            syncPendingUploads();
        }
    });
    
    // Offline event
    window.addEventListener('offline', () => {
        isOnline = false;
        offlineStatus.style.display = 'block';
    });
    
    // Initial check
    if (!navigator.onLine) {
        isOnline = false;
        offlineStatus.style.display = 'block';
    }
}

function loadUserData() {
    if (!currentUser) return;
    
    // Check if user has a routine in Firestore
    db.collection('routines').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                // User has a routine, load it
                const routineData = doc.data();
                saveRoutineToLocalStorage(routineData.items);
                displayRoutine(routineData.items);
            } else {
                // User doesn't have a routine, show creation modal with import option
                const createRoutineModal = document.getElementById('create-routine-modal');
                createRoutineModal.style.display = 'flex';
                setTimeout(() => {
                    createRoutineModal.classList.add('active');
                }, 10);
                setupRoutineCreation();
            }
        })
        .catch(error => {
            console.error("Error loading routine:", error);
            // If error, try to load from local storage
            loadLocalData();
        });
    
    // Load study logs
    loadStudyLogs();
}

function loadLocalData() {
    // Load routine from local storage
    const savedRoutine = localStorage.getItem('dailyRoutine');
    if (savedRoutine) {
        displayRoutine(JSON.parse(savedRoutine));
    }
    
    // Load study logs from local storage
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    displayStudyLogs(studyLogs);
}

function setupRoutineCreation() {
    const routineForm = document.getElementById('routine-form');
    const addItemBtn = document.getElementById('add-routine-item');
    const routineItems = document.getElementById('routine-items');
    
    // Remove any existing event listeners
    addItemBtn.replaceWith(addItemBtn.cloneNode(true));
    
    // Get the new button reference and add the event listener
    const newAddItemBtn = document.getElementById('add-routine-item');
    newAddItemBtn.addEventListener('click', () => addRoutineItem());
    
    // Form submission
    routineForm.removeEventListener('submit', handleRoutineSubmit);
    routineForm.addEventListener('submit', handleRoutineSubmit);
}

// Helper function to format time string (HH:MM to h:MM AM/PM)
function formatTimeString(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Setup remove item buttons
function setupRemoveItemButtons() {
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.onclick = function() {
            const routineItems = document.getElementById('routine-items');
            
            // Don't remove if it's the last item
            if (routineItems.children.length > 1) {
                this.parentElement.remove();
            } else {
                showToast('You need at least one routine item', 'warning');
            }
        };
    });
}

// Save routine
function saveRoutine(items) {
    // Save to localStorage
    saveRoutineToLocalStorage(items);
    
    // Display routine
    displayRoutine(items);
    
    // If online and logged in, save to Firebase
    if (isOnline && currentUser) {
        db.collection('routines').doc(currentUser.uid).set({
            items: items,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            console.log('Routine saved to Firebase');
            showToast('Routine saved successfully');
        })
        .catch(error => {
            console.error('Error saving routine to Firebase:', error);
            showToast('Error saving routine to cloud', 'error');
            
            // Add to pending uploads
            addToPendingUploads('routine', items);
        });
    } else if (currentUser) {
        // Add to pending uploads
        addToPendingUploads('routine', items);
        showToast('Routine saved locally, will sync when online');
    } else {
        showToast('Routine saved locally');
    }
}

function saveRoutineToLocalStorage(routineData) {
    localStorage.setItem('dailyRoutine', JSON.stringify(routineData));
}

function displayRoutine(routineItems) {
    const container = document.querySelector('.routine-container');
    container.innerHTML = ''; // Clear existing items
    
    routineItems.forEach((item, index) => {
        const routineItem = document.createElement('div');
        routineItem.className = `routine-item ${item.type === 'study' ? 'study' : ''}`;
        routineItem.dataset.index = index;
        routineItem.dataset.time = item.time;
        routineItem.dataset.activity = item.description;
        routineItem.dataset.type = item.type;
        
        // Add confetti overlay for completion animation
        const confettiOverlay = document.createElement('div');
        confettiOverlay.className = 'confetti-overlay';
        routineItem.appendChild(confettiOverlay);
        
        routineItem.innerHTML += `
            <div class="routine-time">${item.time}</div>
            <div class="routine-description">${item.description}</div>
        `;
        
        // Add click event to mark as complete
        routineItem.addEventListener('click', function() {
            if (!this.classList.contains('completed')) {
                this.classList.add('completed');
                
                // If this is a study item, show the study log popup
                if (item.type === 'study') {
                    showStudyLogPopup(item.time, item.description);
                } else {
                    // For regular items, just save completion status
                    saveCompletionStatus(routineItems);
                }
            } else {
                this.classList.remove('completed');
                saveCompletionStatus(routineItems);
            }
        });
        
        container.appendChild(routineItem);
    });
    
    // Load completion status from local storage
    loadCompletionStatus(routineItems);
}

// Show study log popup
function showStudyLogPopup(time, activity) {
    const popupOverlay = document.getElementById('popup-overlay');
    const studyLogPopup = document.getElementById('study-log-popup');
    const popupNotes = document.getElementById('popup-study-notes');
    
    // Store the time and activity in the popup for reference
    studyLogPopup.dataset.time = time;
    studyLogPopup.dataset.activity = activity;
    
    // Show the popup
    popupOverlay.style.display = 'block';
    studyLogPopup.style.display = 'block';
    
    // Add active class for animation
    setTimeout(() => {
        popupOverlay.classList.add('active');
        studyLogPopup.classList.add('active');
    }, 10);
    
    // Clear previous input
    popupNotes.value = '';
    
    // Set up event listeners if not already set
    setupStudyLogPopupListeners();
}

// Set up study log popup event listeners
function setupStudyLogPopupListeners() {
    const popupOverlay = document.getElementById('popup-overlay');
    const studyLogPopup = document.getElementById('study-log-popup');
    const saveBtn = document.getElementById('save-popup-log');
    const cancelBtn = document.getElementById('cancel-log');
    
    // Save button click
    saveBtn.onclick = function() {
        const notes = document.getElementById('popup-study-notes').value.trim();
        if (!notes) {
            showToast('Please enter what you studied', 'warning');
            return;
        }
        
        const time = studyLogPopup.dataset.time;
        const activity = studyLogPopup.dataset.activity;
        
        // Save the study log
        saveStudyLog(time, activity, notes);
        
        // Close the popup
        closeStudyLogPopup();
    };
    
    // Cancel button click
    cancelBtn.onclick = closeStudyLogPopup;
    
    // Close when clicking on overlay
    popupOverlay.onclick = function(e) {
        if (e.target === popupOverlay) {
            closeStudyLogPopup();
        }
    };
}

// Close study log popup
function closeStudyLogPopup() {
    const popupOverlay = document.getElementById('popup-overlay');
    const studyLogPopup = document.getElementById('study-log-popup');
    
    popupOverlay.classList.remove('active');
    studyLogPopup.classList.remove('active');
    
    setTimeout(() => {
        popupOverlay.style.display = 'none';
        studyLogPopup.style.display = 'none';
    }, 300);
}

// Save study log
function saveStudyLog(time, activity, notes) {
    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Get existing study logs or initialize empty object
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    
    // Initialize today's logs if not exists
    if (!studyLogs[today]) {
        studyLogs[today] = [];
    }
    
    // Add new log with correct property names
    studyLogs[today].push({
        time: time,
        activity: activity,
        notes: notes,
        timestamp: new Date().toISOString()
    });
    
    // Save to localStorage
    localStorage.setItem('studyLogs', JSON.stringify(studyLogs));
    
    // If online and logged in, save to Firebase
    if (isOnline && currentUser) {
        const logData = {
            time: time,
            activity: activity,
            notes: notes,
            date: today,
            timestamp: new Date().toISOString()
        };
        
        db.collection('users').doc(currentUser.uid)
            .collection('studyLogs').add(logData)
            .then(() => {
                console.log('Study log saved to Firebase');
            })
            .catch(error => {
                console.error('Error saving study log to Firebase:', error);
                // Add to pending uploads for later sync
                addToPendingUploads('studyLog', logData);
            });
    } else if (currentUser) {
        // Add to pending uploads for later sync
        addToPendingUploads('studyLog', {
            time: time,
            activity: activity,
            notes: notes,
            date: today,
            timestamp: new Date().toISOString()
        });
    }
    
    // Update UI
    displayStudyLogs(studyLogs);
    
    // Show success message
    showToast('Study log saved successfully');
}

// Save completion status
function saveCompletionStatus(routineItems) {
    const completedItems = {};
    
    document.querySelectorAll('.routine-item').forEach((item, index) => {
        completedItems[index] = item.classList.contains('completed');
    });
    
    // Save to localStorage
    localStorage.setItem('completedItems', JSON.stringify(completedItems));
    
    // If online and logged in, save to Firebase
    if (isOnline && currentUser) {
        db.collection('users').doc(currentUser.uid)
            .collection('completions').doc(new Date().toISOString().split('T')[0])
            .set({
                items: completedItems,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .catch(error => {
                console.error('Error saving completion status to Firebase:', error);
            });
    }
}

// Load completion status
function loadCompletionStatus(routineItems) {
    const completedItems = JSON.parse(localStorage.getItem('completedItems') || '{}');
    
    document.querySelectorAll('.routine-item').forEach((item, index) => {
        if (completedItems[index]) {
            item.classList.add('completed');
        }
    });
}

function loadStudyLogs() {
    if (!currentUser) return;
    
    // Get logs from Firestore
    db.collection('users').doc(currentUser.uid)
        .collection('studyLogs')
        .orderBy('timestamp', 'desc')
        .get()
        .then(snapshot => {
            const studyLogs = {};
            
            snapshot.forEach(doc => {
                const log = doc.data();
                if (!studyLogs[log.date]) {
                    studyLogs[log.date] = [];
                }
                studyLogs[log.date].push(log);
            });
            
            // Save to local storage and display
            localStorage.setItem('studyLogs', JSON.stringify(studyLogs));
            displayStudyLogs(studyLogs);
        })
        .catch(error => {
            console.error("Error loading study logs:", error);
            // If error, try to load from local storage
            const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
            displayStudyLogs(studyLogs);
        });
}

function displayStudyLogs(studyLogs) {
    // Display today's logs
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = studyLogs[today] || [];
    
    const todaysLogContent = document.getElementById('todays-log-content');
    if (todayLogs.length > 0) {
        let logHTML = '';
        todayLogs.forEach((log, index) => {
            logHTML += `
            <div class="log-entry" data-index="${index}">
                <div class="log-time">${log.time} - ${log.activity}</div>
                <div class="log-content">${log.notes}</div>
                <div class="log-actions">
                    <button class="edit-log-btn" title="Edit log">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-log-btn" title="Delete log">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        });
        todaysLogContent.innerHTML = logHTML;
        
        // Add event listeners to the buttons
        const logEntries = document.querySelectorAll('.log-entry');
        logEntries.forEach((entry, index) => {
            const editBtn = entry.querySelector('.edit-log-btn');
            const deleteBtn = entry.querySelector('.delete-log-btn');
            const log = todayLogs[index];
            
            if (editBtn && deleteBtn) {
                const logId = `${today}_${log.time.replace(':', '')}`;
                
                editBtn.addEventListener('click', () => {
                    editStudyLog(logId, log.time, log.notes);
                });
                
                deleteBtn.addEventListener('click', () => {
                    deleteStudyLog(logId);
                });
            }
        });
    } else {
        todaysLogContent.innerHTML = '<div class="no-logs">No study logs for today yet.</div>';
    }
    
    // Update calendar with study days
    updateCalendar(studyLogs);
}

function updateCalendar(studyLogs) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    renderCalendar(currentMonth, currentYear, studyLogs);
    
    // Add event listeners for month navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        const currentMonthText = document.getElementById('current-month').textContent;
        const [month, year] = currentMonthText.split(' ');
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        const yearValue = parseInt(year);
        
        let newMonth = monthIndex - 1;
        let newYear = yearValue;
        
        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        
        renderCalendar(newMonth, newYear, studyLogs);
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        const currentMonthText = document.getElementById('current-month').textContent;
        const [month, year] = currentMonthText.split(' ');
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        const yearValue = parseInt(year);
        
        let newMonth = monthIndex + 1;
        let newYear = yearValue;
        
        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }
        
        renderCalendar(newMonth, newYear, studyLogs);
    });
}

function renderCalendar(month, year, studyLogs) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Update month display
    document.getElementById('current-month').textContent = `${monthNames[month]} ${year}`;
    
    // Generate calendar grid
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Check if this day has study logs
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (studyLogs[dateString] && studyLogs[dateString].length > 0) {
            dayElement.classList.add('has-study');
        }
        
        // Highlight today
        if (day === todayDate && month === todayMonth && year === todayYear) {
            dayElement.classList.add('today');
        }
        
        // Add click event to show study details for this day
        dayElement.addEventListener('click', () => {
            showStudyDetails(dateString, studyLogs);
        });
        
        calendarGrid.appendChild(dayElement);
    }
}

function showStudyDetails(date, studyLogs) {
    const studyDetailsContent = document.getElementById('study-details-content');
    const logs = studyLogs[date] || [];
    
    if (logs.length > 0) {
        let detailsHTML = '';
        logs.forEach(log => {
            detailsHTML += `
                <div class="session-entry">
                    <div class="session-time">${log.time} - ${log.activity}</div>
                    <div class="session-content">${log.notes}</div>
                </div>
            `;
        });
        studyDetailsContent.innerHTML = detailsHTML;
    } else {
        studyDetailsContent.innerHTML = 'No study logs for this date.';
    }
}

function addToPendingUploads(type, data) {
    // Get existing pending uploads
    pendingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
    
    // Add new upload
    pendingUploads.push({
        type: type,
        data: data,
        timestamp: new Date().toISOString()
    });
    
    // Save to local storage
    localStorage.setItem('pendingUploads', JSON.stringify(pendingUploads));
}

function syncPendingUploads() {
    if (!isOnline || !currentUser) return;
    
    // Get pending uploads
    pendingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
    
    if (pendingUploads.length === 0) return;
    
    // Process each pending upload
    const promises = pendingUploads.map(upload => {
        if (upload.type === 'routine') {
            return db.collection('routines').doc(currentUser.uid).set({
                items: upload.data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else if (upload.type === 'studyLog') {
            return db.collection('users').doc(currentUser.uid)
                .collection('studyLogs').add(upload.data);
        }
        return Promise.resolve();
    });
    
    // Wait for all uploads to complete
    Promise.all(promises)
        .then(() => {
            // Clear pending uploads
            localStorage.removeItem('pendingUploads');
            pendingUploads = [];
            showToast('All data synced to cloud');
        })
        .catch(error => {
            console.error("Error syncing data:", error);
            showToast('Error syncing some data', 'error');
        });
}

function saveActivityCompletion(time, activity) {
    // Implementation depends on your requirements
    // This is a placeholder for the activity completion function
    console.log(`Activity "${activity}" at ${time} completed`);
    
    // You might want to save this to Firestore as well
}

function formatTime(timeString) {
    // Convert 24h format to 12h format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString('en-US', options);
}

function setupUIListeners() {
    // Profile button click
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const loginProfileBtn = document.getElementById('login-profile-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const profileLogoutBtn = document.getElementById('profile-logout-btn');
    const importFileInput = document.getElementById('import-file-input');
    const importRoutineBtn = document.getElementById('import-routine-btn');
    const loginModal = document.getElementById('login-modal');
    
    // Toggle profile dropdown
    profileBtn.addEventListener('click', () => {
        profileDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('active');
        }
    });
    
    // Login button in profile dropdown
    if (loginProfileBtn) {
        loginProfileBtn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
            setTimeout(() => {
                loginModal.classList.add('active');
            }, 10);
            profileDropdown.classList.remove('active');
        });
    }
    
    // Import data button
    importDataBtn.addEventListener('click', () => {
        if (!currentUser) {
            showToast('Please log in to import data', 'warning');
            loginModal.style.display = 'flex';
            setTimeout(() => {
                loginModal.classList.add('active');
            }, 10);
        } else {
            importFileInput.click();
        }
        profileDropdown.classList.remove('active');
    });
    
    // Export data button
    exportDataBtn.addEventListener('click', () => {
        if (!currentUser) {
            showToast('Please log in to export data', 'warning');
            loginModal.style.display = 'flex';
            setTimeout(() => {
                loginModal.classList.add('active');
            }, 10);
        } else {
            exportUserData();
        }
        profileDropdown.classList.remove('active');
    });
    
    // Profile logout button
    profileLogoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            clearDisplayedData();
            showToast('Logged out successfully');
            profileDropdown.classList.remove('active');
        }).catch(error => {
            showToast('Error logging out: ' + error.message, 'error');
        });
    });
    
    // Import file change
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importUserData(file);
        }
    });
    
    // Import routine button in create routine modal
    if (importRoutineBtn) {
        importRoutineBtn.addEventListener('click', () => {
            importFileInput.click();
        });
    }
}

function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Update the addRoutineItem function for better alignment
function addRoutineItem(initialValues = null) {
    const routineItems = document.getElementById('routine-items');
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'routine-item-input';
    
    itemDiv.innerHTML = `
        <input type="time" class="routine-time start-time" required 
            value="${initialValues?.startTime || ''}"
        >
        <input type="time" class="routine-time end-time" required
            value="${initialValues?.endTime || ''}"
        >
        <input type="text" class="routine-activity" placeholder="Activity description" required
            value="${initialValues?.activity || ''}"
        >
        <select class="routine-type">
            <option value="regular" ${initialValues?.type === 'regular' ? 'selected' : ''}>Regular</option>
            <option value="study" ${initialValues?.type === 'study' ? 'selected' : ''}>Study</option>
        </select>
        <button type="button" class="remove-item">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    routineItems.appendChild(itemDiv);
    
    // Setup remove button
    setupRemoveItemButtons();
    
    // Focus on the activity input
    setTimeout(() => {
        itemDiv.querySelector('.routine-activity').focus();
    }, 100);
}

// Add this function to clear displayed data on logout
function clearDisplayedData() {
    // Clear routine container
    const routineContainer = document.querySelector('.routine-container');
    routineContainer.innerHTML = '<div class="no-routine">Please log in to view your routine</div>';
    
    // Clear study logs
    const todaysLogContent = document.getElementById('todays-log-content');
    todaysLogContent.innerHTML = '<div class="no-logs">Please log in to view your study logs</div>';
    
    // Clear study details
    const studyDetailsContent = document.getElementById('study-details-content');
    studyDetailsContent.innerHTML = 'Log in to view study details';
    
    // Clear calendar
    const calendarGrid = document.querySelector('.calendar-grid');
    if (calendarGrid) {
        calendarGrid.innerHTML = '';
    }
}

// Function to animate the splash screen
function animateSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    const loadingProgress = document.querySelector('.loading-progress');
    const loadingPercentage = document.querySelector('.loading-percentage');
    
    let progress = 0;
    const totalDuration = 3000; // 3 seconds for the entire loading animation
    const interval = 30; // Update every 30ms
    const increment = 100 / (totalDuration / interval);
    
    // Start the loading animation
    const loadingInterval = setInterval(() => {
        progress += increment;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // Hide splash screen after a short delay
    setTimeout(() => {
                splashScreen.style.opacity = '0';
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                }, 500);
            }, 500);
        }
        
        // Update the loading bar width
        const progressWidth = Math.min(progress, 100);
        loadingProgress.style.width = `${progressWidth}%`;
        
        // Update the percentage text and position it at the end of the progress bar
        loadingPercentage.textContent = `${Math.round(progress)}%`;
        
        // Position the percentage at the end of the progress bar
        // But keep it within the loading bar container
        const percentPosition = Math.max(Math.min(progressWidth, 97), 3);
        loadingPercentage.style.left = `${percentPosition}%`;
    }, interval);
}

// Updated function to export user data
function exportUserData() {
    if (!currentUser) {
        showToast('Please log in to export data', 'warning');
        return;
    }
    
    // First try to get data from Firestore, then fall back to local storage
    db.collection('routines').doc(currentUser.uid).get()
        .then(doc => {
            let routineItems = [];
            
            if (doc.exists) {
                // Get routine from Firestore
                routineItems = doc.data().items || [];
            } else {
                // Fall back to local storage
                routineItems = JSON.parse(localStorage.getItem('routineItems') || '[]');
            }
            
            // Get study logs from Firestore
            db.collection('studyLogs').doc(currentUser.uid).get()
                .then(logDoc => {
                    let studyLogs = {};
                    
                    if (logDoc.exists) {
                        // Get logs from Firestore
                        studyLogs = logDoc.data().logs || {};
                    } else {
                        // Fall back to local storage
                        studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
                    }
                    
                    // Create export data object with all available data
                    const exportData = {
                        routine: routineItems,
                        studyLogs: studyLogs,
                        exportDate: new Date().toISOString(),
                        userEmail: currentUser.email,
                        userData: {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName || '',
                            lastLogin: new Date().toISOString()
                        }
                    };
                    
                    // Convert to JSON string with pretty formatting
                    const jsonData = JSON.stringify(exportData, null, 2);
                    
                    // Create download link
                    const blob = new Blob([jsonData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `daily-routine-export-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    
                    // Clean up
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);
                    
                    showToast('Data exported successfully');
                })
                .catch(error => {
                    console.error("Error getting study logs:", error);
                    // If there's an error, still export what we have
                    exportFallback(routineItems);
                });
        })
        .catch(error => {
            console.error("Error getting routine data:", error);
            // If there's an error, fall back to local storage only
            exportFallback();
        });
}

// Fallback export function using only local storage
function exportFallback(routineItems = null) {
    // Get routine data from local storage if not provided
    if (routineItems === null) {
        routineItems = JSON.parse(localStorage.getItem('routineItems') || '[]');
    }
    
    // Get study logs from local storage
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    
    // Create export data object
    const exportData = {
        routine: routineItems,
        studyLogs: studyLogs,
        exportDate: new Date().toISOString(),
        userEmail: currentUser.email,
        userData: {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || '',
            lastLogin: new Date().toISOString()
        }
    };
    
    // Convert to JSON string
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-routine-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    showToast('Data exported successfully (local data only)');
}

// Updated function to import user data
function importUserData(file) {
    if (!currentUser) {
        showToast('Please log in to import data', 'warning');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            
            // Validate imported data
            if (!importedData.routine || !Array.isArray(importedData.routine)) {
                throw new Error('Invalid routine data format');
            }
            
            // Save routine to local storage
            localStorage.setItem('routineItems', JSON.stringify(importedData.routine));
            
            // Save to Firestore if online
            if (isOnline) {
                db.collection('routines').doc(currentUser.uid).set({
                    items: importedData.routine,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    showToast('Routine imported and saved to cloud');
                })
                .catch(error => {
                    console.error("Error saving routine to Firestore:", error);
                    showToast('Routine imported locally, will sync when online');
                    addToPendingUploads('routine', importedData.routine);
                });
            } else {
                addToPendingUploads('routine', importedData.routine);
                showToast('Routine imported locally, will sync when online');
            }
            
            // Display the imported routine
            displayRoutine(importedData.routine);
            
            // Import study logs if available
            if (importedData.studyLogs && typeof importedData.studyLogs === 'object') {
                localStorage.setItem('studyLogs', JSON.stringify(importedData.studyLogs));
                
                // Save study logs to Firestore if online
                if (isOnline) {
                    db.collection('studyLogs').doc(currentUser.uid).set({
                        logs: importedData.studyLogs,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        showToast('Study logs imported and saved to cloud');
                    })
                    .catch(error => {
                        console.error("Error saving study logs to Firestore:", error);
                        showToast('Study logs imported locally, will sync when online');
                        addToPendingUploads('studyLogs', importedData.studyLogs);
                    });
                } else {
                    addToPendingUploads('studyLogs', importedData.studyLogs);
                }
                
                // Update study logs display
                updateStudyLogsDisplay();
            }
            
            // Close the create routine modal if open
            const createRoutineModal = document.getElementById('create-routine-modal');
            if (createRoutineModal && createRoutineModal.style.display !== 'none') {
                createRoutineModal.classList.remove('active');
                setTimeout(() => {
                    createRoutineModal.style.display = 'none';
                }, 300);
            }
            
            showToast('Data imported successfully');
            
    } catch (error) {
            console.error("Error importing data:", error);
            showToast('Error importing data: ' + error.message, 'error');
        }
    };
    
    reader.onerror = () => {
        showToast('Error reading file', 'error');
    };
    
    reader.readAsText(file);
}

// Update loadUserData function to show import option for new users
function loadUserData() {
    if (!currentUser) return;
    
    // Check if user has a routine in Firestore
    db.collection('routines').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                // User has a routine, load it
                const routineData = doc.data();
                saveRoutineToLocalStorage(routineData.items);
                displayRoutine(routineData.items);
            } else {
                // User doesn't have a routine, show creation modal with import option
                const createRoutineModal = document.getElementById('create-routine-modal');
                createRoutineModal.style.display = 'flex';
                setTimeout(() => {
                    createRoutineModal.classList.add('active');
                }, 10);
                setupRoutineCreation();
            }
        })
        .catch(error => {
            console.error("Error loading routine:", error);
            // If error, try to load from local storage
            loadLocalData();
        });
    
    // Load study logs
    loadStudyLogs();
}

// Function to open the edit routine modal
function openEditRoutineModal() {
    const createRoutineModal = document.getElementById('create-routine-modal');
    const routineItems = document.getElementById('routine-items');
    
    // Clear existing items
    routineItems.innerHTML = '';
    
    // Load existing routine from localStorage
    const savedRoutine = localStorage.getItem('dailyRoutine');
    if (savedRoutine) {
        const routineData = JSON.parse(savedRoutine);
        
        // Create form inputs for each existing routine item
        routineData.forEach(item => {
            const [startTime, endTime] = item.time.split(' - ');
            addRoutineItem({
                startTime: convertTo24Hour(startTime),
                endTime: convertTo24Hour(endTime),
                activity: item.description,
                type: item.type || 'regular'
            });
        });
    } else {
        // Add one empty item if no routine exists
        addRoutineItem();
    }
    
    // Show the modal
    createRoutineModal.style.display = 'flex';
    setTimeout(() => {
        createRoutineModal.classList.add('active');
    }, 10);
    
    // Ensure add routine item button works
    setupRoutineCreation();
}

// Add helper function to convert time format
function convertTo24Hour(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    
    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }
    
    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

// Update the addRoutineItem function to accept initial values
function addRoutineItem(initialValues = null) {
    const routineItems = document.getElementById('routine-items');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'routine-item-input';
    
    itemDiv.innerHTML = `
        <input type="time" class="routine-time start-time" required 
            value="${initialValues?.startTime || ''}"
        >
        <input type="time" class="routine-time end-time" required
            value="${initialValues?.endTime || ''}"
        >
        <input type="text" class="routine-activity" placeholder="Activity description" required
            value="${initialValues?.activity || ''}"
        >
        <select class="routine-type">
            <option value="regular" ${initialValues?.type === 'regular' ? 'selected' : ''}>Regular</option>
            <option value="study" ${initialValues?.type === 'study' ? 'selected' : ''}>Study</option>
        </select>
        <button type="button" class="remove-item">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    routineItems.appendChild(itemDiv);
    setupRemoveItemButtons();
}

// Separate the form submission handler
function handleRoutineSubmit(e) {
    e.preventDefault();
    
    const items = [];
    const itemInputs = document.querySelectorAll('.routine-item-input');
    
    itemInputs.forEach(item => {
        const startTimeInput = item.querySelector('.start-time').value;
        const endTimeInput = item.querySelector('.end-time').value;
        const activityInput = item.querySelector('.routine-activity').value;
        const typeInput = item.querySelector('.routine-type').value;
        
        if (startTimeInput && endTimeInput && activityInput) {
            items.push({
                time: `${formatTimeString(startTimeInput)} - ${formatTimeString(endTimeInput)}`,
                description: activityInput,
                type: typeInput
            });
        }
    });
    
    // Sort items by start time
    items.sort((a, b) => {
        const timeA = a.time.split(' - ')[0];
        const timeB = b.time.split(' - ')[0];
        return timeA.localeCompare(timeB);
    });
    
    // Save the routine
    saveRoutine(items);
    
    // Close the modal
    const createRoutineModal = document.getElementById('create-routine-modal');
    createRoutineModal.classList.remove('active');
    setTimeout(() => {
        createRoutineModal.style.display = 'none';
    }, 300);
}

// Add this function after the displayStudyLogs function
function addEditDeleteButtons() {
    const today = new Date().toISOString().split('T')[0];
    const logEntries = document.querySelectorAll('.log-entry');
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    
    // Process each log entry
    logEntries.forEach((entry, index) => {
        // Get the log ID based on the index and today's date
        const todaysLogs = Object.entries(studyLogs)
            .filter(([id, log]) => id.startsWith(today))
            .sort(([idA], [idB]) => idA.localeCompare(idB));
        
        if (index < todaysLogs.length) {
            const [logId, log] = todaysLogs[index];
            const logTime = logId.split('_')[1]; // Extract time from ID
            const formattedTime = formatTimeString(logTime);
            
            // Create action buttons container
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'log-actions';
            actionsDiv.innerHTML = `
                <button class="edit-log-btn" title="Edit log">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-log-btn" title="Delete log">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            // Add event listeners
            const editBtn = actionsDiv.querySelector('.edit-log-btn');
            const deleteBtn = actionsDiv.querySelector('.delete-log-btn');
            
            editBtn.addEventListener('click', () => {
                editStudyLog(logId, formattedTime, log.notes);
            });
            
            deleteBtn.addEventListener('click', () => {
                deleteStudyLog(logId);
            });
            
            // Append to the log entry
            entry.appendChild(actionsDiv);
        }
    });
}

// Function to handle editing a study log
function editStudyLog(logId, logTime, logContent) {
    // Show the study log popup with existing content
    const popup = document.getElementById('study-log-popup');
    const overlay = document.getElementById('popup-overlay');
    const notesTextarea = document.getElementById('popup-study-notes');
    const saveBtn = document.getElementById('save-popup-log');
    const cancelBtn = document.getElementById('cancel-log');
    
    // Set the existing content in the textarea
    notesTextarea.value = logContent;
    
    // Store the logId in the popup for reference
    popup.dataset.logId = logId;
    
    // Show the popup
    overlay.style.display = 'block';
    popup.style.display = 'block';
    setTimeout(() => {
        overlay.classList.add('active');
        popup.classList.add('active');
    }, 10);
    
    // Update the save button to handle editing
    saveBtn.onclick = function() {
        const updatedNotes = notesTextarea.value.trim();
        
        if (updatedNotes) {
            // Get the study logs from local storage
            const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
            const today = new Date().toISOString().split('T')[0];
            
            // Find the log in the today's logs array
            const todayLogs = studyLogs[today] || [];
            const logIndex = todayLogs.findIndex(log => 
                `${today}_${log.time.replace(':', '')}` === logId
            );
            
            if (logIndex !== -1) {
                // Update the log content
                todayLogs[logIndex].notes = updatedNotes;
                
                // Save to local storage
                localStorage.setItem('studyLogs', JSON.stringify(studyLogs));
                
                // Update the display
                displayStudyLogs(studyLogs);
                
                // Save to Firestore if online
                if (isOnline && currentUser) {
                    db.collection('users').doc(currentUser.uid)
                        .collection('studyLogs')
                        .where('date', '==', today)
                        .where('time', '==', todayLogs[logIndex].time)
                        .get()
                        .then(snapshot => {
                            if (!snapshot.empty) {
                                snapshot.forEach(doc => {
                                    doc.ref.update({
                                        notes: updatedNotes
                                    });
                                });
                                showToast('Study log updated successfully');
                            }
                        })
                        .catch(error => {
                            console.error("Error updating study log:", error);
                            showToast('Study log updated locally, will sync when online');
                            addToPendingUploads('studyLog', {
                                time: todayLogs[logIndex].time,
                                activity: todayLogs[logIndex].activity,
                                notes: updatedNotes,
                                date: today,
                                timestamp: new Date().toISOString()
                            });
                        });
                } else if (currentUser) {
                    addToPendingUploads('studyLog', {
                        time: todayLogs[logIndex].time,
                        activity: todayLogs[logIndex].activity,
                        notes: updatedNotes,
                        date: today,
                        timestamp: new Date().toISOString()
                    });
                    showToast('Study log updated locally, will sync when online');
                } else {
                    showToast('Study log updated locally');
                }
            }
        }
        
        // Close the popup
        closeStudyLogPopup();
    };
    
    // Set up cancel button
    cancelBtn.onclick = closeStudyLogPopup;
    
    // Close when clicking on overlay
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            closeStudyLogPopup();
        }
    };
}

// Function to handle deleting a study log
function deleteStudyLog(logId) {
    // Show custom confirmation popup
    showConfirmationPopup(
        'Delete Study Log', 
        'Are you sure you want to delete this study log?',
        () => {
            // Get the study logs from local storage
            const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
            const today = new Date().toISOString().split('T')[0];
            
            // Find the log in the today's logs array
            const todayLogs = studyLogs[today] || [];
            const logIndex = todayLogs.findIndex(log => 
                `${today}_${log.time.replace(':', '')}` === logId
            );
            
            if (logIndex !== -1) {
                // Get the log details before removing
                const logToDelete = todayLogs[logIndex];
                
                // Remove the log
                todayLogs.splice(logIndex, 1);
                
                // Save to local storage
                localStorage.setItem('studyLogs', JSON.stringify(studyLogs));
                
                // Update the display
                displayStudyLogs(studyLogs);
                
                // Delete from Firestore if online
                if (isOnline && currentUser) {
                    db.collection('users').doc(currentUser.uid)
                        .collection('studyLogs')
                        .where('date', '==', today)
                        .where('time', '==', logToDelete.time)
                        .get()
                        .then(snapshot => {
                            if (!snapshot.empty) {
                                snapshot.forEach(doc => {
                                    doc.ref.delete();
                                });
                                showToast('Study log deleted successfully');
                            }
                        })
                        .catch(error => {
                            console.error("Error deleting study log:", error);
                            showToast('Study log deleted locally, will sync when online');
                        });
                } else if (currentUser) {
                    showToast('Study log deleted locally, will sync when online');
                } else {
                    showToast('Study log deleted locally');
                }
            }
        }
    );
}

// Function to show a custom confirmation popup
function showConfirmationPopup(title, message, confirmCallback) {
    // Create overlay if it doesn't exist
    let overlay = document.getElementById('confirmation-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'confirmation-overlay';
        overlay.className = 'popup-overlay';
        document.body.appendChild(overlay);
    }
    
    // Create popup if it doesn't exist
    let popup = document.getElementById('confirmation-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'confirmation-popup';
        popup.className = 'confirmation-popup';
        document.body.appendChild(popup);
    }
    
    // Set popup content
    popup.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="popup-actions">
            <button class="cancel-btn" id="confirm-cancel-btn">Cancel</button>
            <button class="delete-btn" id="confirm-delete-btn">Delete</button>
        </div>
    `;
    
    // Show the popup
    overlay.style.display = 'block';
    popup.style.display = 'block';
    setTimeout(() => {
        overlay.classList.add('active');
        popup.classList.add('active');
    }, 10);
    
    // Set up event listeners
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    // Close function
    const closePopup = () => {
        overlay.classList.remove('active');
        popup.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
            popup.style.display = 'none';
        }, 300);
    };
    
    // Cancel button
    cancelBtn.onclick = closePopup;
    
    // Confirm button
    confirmBtn.onclick = () => {
        closePopup();
        confirmCallback();
    };
    
    // Close when clicking on overlay
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            closePopup();
        }
    };
}

// Modify the updateStudyLogsDisplay function to add edit and delete buttons
function updateStudyLogsDisplay() {
    const todaysLogContent = document.getElementById('todays-log-content');
    const today = new Date().toISOString().split('T')[0];
    
    // Get study logs from local storage
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    
    // Filter logs for today
    const todaysLogs = Object.entries(studyLogs)
        .filter(([id, log]) => id.startsWith(today))
        .sort(([idA], [idB]) => idA.localeCompare(idB));
    
    if (todaysLogs.length > 0) {
        // Clear the container
        todaysLogContent.innerHTML = '';
        
        // Add each log entry
        todaysLogs.forEach(([id, log]) => {
            const logTime = id.split('_')[1]; // Extract time from ID
            const formattedTime = formatTimeString(logTime);
            
            const logEntry = document.createElement('div');
            logEntry.className = 'study-log-item';
            
            logEntry.innerHTML = `
                <div class="log-time">${formattedTime}</div>
                <div class="log-content">${log.notes}</div>
            `;
            
            // Add event listeners for edit and delete buttons
            const editBtn = logEntry.querySelector('.edit-log-btn');
            const deleteBtn = logEntry.querySelector('.delete-log-btn');
            
            editBtn.addEventListener('click', () => {
                editStudyLog(id, formattedTime, log.notes);
            });
            
            deleteBtn.addEventListener('click', () => {
                deleteStudyLog(id);
            });
            
            todaysLogContent.appendChild(logEntry);
        });
        
        // Add edit and delete buttons after rendering the logs
        setTimeout(() => addEditDeleteButtons(), 0);
    } else {
        todaysLogContent.innerHTML = '<div class="no-logs">No study logs for today yet.</div>';
    }
    
    // Update calendar view
    updateCalendarView();
}

// ... existing code and functions ... 