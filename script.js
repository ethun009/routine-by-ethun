// Add this at the start of your script.js file
let notificationPermission = false;
let userRoutine = [];
const ROUTINE_STORAGE_KEY = 'userRoutine';
let draggedItem = null;
let draggedItemIndex = null;
let currentUser = null;

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

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
});

function initApp() {
    // Initialize splash screen with progress bar
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    let progress = 0;

    // Update progress every 30ms
    const progressInterval = setInterval(() => {
        progress += 2;
        if (progress <= 100) {
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
        }

        if (progress >= 100) {
            clearInterval(progressInterval);
            // Hide splash screen and show auth container
            setTimeout(() => {
                const splashScreen = document.getElementById('splash-screen');
                splashScreen.style.opacity = '0';
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                    // Show auth container if user is not logged in
                    if (!currentUser) {
                        document.getElementById('auth-container').style.display = 'flex';
                    }
                }, 500);
            }, 200);
        }
    }, 30);

    // Set current date
    updateCurrentDate();
    
    // Generate routine items
    generateRoutineItems();
    
    // Initialize calendar
    initCalendar();
    
    // Add event listeners
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    
    // Set up popup event listeners
    setupPopupEventListeners();
    
    // Update today's logs
    updateTodaysLogs();
    
    // Request notification permission
    requestNotificationPermission();
    
    // Start notification scheduler
    scheduleNotifications();
    
    // Check if it's first visit
    checkFirstVisit();
}

// Routine data
const routineData = [
    { time: '10:00 AM – 10:30 AM', description: 'Wake up & Morning Routine', type: 'regular' },
    { time: '10:30 AM - 11:00 AM', description: 'Breakfast', type: 'regular' },
    { time: '11:00 AM - 1:00 PM', description: 'Study Session (2 hours)', type: 'study', sessionId: 'session1' },
    { time: '1:00 PM - 6:00 PM', description: 'Rest / Entertainment / Free Time', type: 'regular' },
    { time: '6:00 PM - 9:00 PM', description: 'Study Session (3 hours)', type: 'study', sessionId: 'session2' },
    { time: '9:00 PM - 9:30 PM', description: 'Dinner', type: 'regular' },
    { time: '9:30 PM - 11:00 PM', description: 'Study Session (1.5 hours)', type: 'study', sessionId: 'session3' },
    { time: '11:00 PM - 12:30 AM', description: 'Rest / Entertainment', type: 'regular' },
    { time: '12:30 AM - 3:00 AM', description: 'Study Session (2.5 hours)', type: 'study', sessionId: 'session4' },
    { time: '3:00 AM - 3:30 AM', description: 'Night Routine & Sleep', type: 'regular' }
];

// Current date and calendar variables
let currentDate = new Date();
let displayedMonth = currentDate.getMonth();
let displayedYear = currentDate.getFullYear();

// Update current date display
function updateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = currentDate.toLocaleDateString('en-US', options);
    document.getElementById('current-date').textContent = dateString;
}

// Generate routine items
function generateRoutineItems() {
    const container = document.querySelector('.routine-container');
    container.innerHTML = ''; // Clear existing items
    
    userRoutine.forEach((item, index) => {
        const routineItem = document.createElement('div');
        routineItem.className = `routine-item ${item.type === 'study' ? 'study' : ''}`;
        routineItem.style.animationDelay = `${index * 0.1}s`;
        routineItem.dataset.index = index;
        routineItem.dataset.sessionId = item.sessionId || '';
        
        routineItem.innerHTML = `
            <div class="routine-time">${item.time}</div>
            <div class="routine-description">${item.description}</div>
        `;
        
        routineItem.addEventListener('click', toggleComplete);
        container.appendChild(routineItem);
    });
    
    loadCompletedStatus();
    updateTodaysLogs();
}

// Toggle complete status
function toggleComplete(e) {
    const routineItem = e.currentTarget;
    const index = routineItem.dataset.index;
    const sessionId = routineItem.dataset.sessionId;
    
    // If not already completed
    if (!routineItem.classList.contains('completed')) {
        routineItem.classList.add('completed');
        
        // If this is a study session, show the study log popup
        if (sessionId) {
            showStudyLogPopup(sessionId);
        } else {
            // Save to localStorage immediately for non-study items
            saveCompletedStatus();
        }
    } else {
        routineItem.classList.remove('completed');
        saveCompletedStatus();
    }
}

// Show study log popup
function showStudyLogPopup(sessionId) {
    const popup = document.getElementById('study-log-popup');
    const overlay = document.getElementById('popup-overlay');
    const textarea = document.getElementById('popup-study-notes');
    const saveBtn = document.getElementById('save-popup-log');
    const cancelBtn = document.getElementById('cancel-log');
    
    // Clear previous text
    textarea.value = '';
    
    // Store the session ID for later use
    popup.dataset.sessionId = sessionId;
    
    // Show popup and overlay
    popup.classList.add('active');
    overlay.classList.add('active');
    
    // Focus on textarea
    textarea.focus();
    
    // Set up event listeners
    saveBtn.onclick = saveStudyLogFromPopup;
    cancelBtn.onclick = closeStudyLogPopup;
    
    // Close popup when clicking outside
    overlay.onclick = closeStudyLogPopup;
}

// Close study log popup
function closeStudyLogPopup() {
    const popup = document.getElementById('study-log-popup');
    const overlay = document.getElementById('popup-overlay');
    
    popup.classList.remove('active');
    overlay.classList.remove('active');
    
    // Get the session ID
    const sessionId = popup.dataset.sessionId;
    
    // We'll no longer revert the button state when closing
    // Just save the current state
    saveCompletedStatus();
}

// Save study log from popup
function saveStudyLogFromPopup() {
    const popup = document.getElementById('study-log-popup');
    const sessionId = popup.dataset.sessionId;
    const notes = document.getElementById('popup-study-notes').value.trim();
    
    if (!notes) {
        alert('Please enter what you studied during this session.');
        return;
    }
    
    // Get session time from routine data
    const sessionInfo = routineData.find(item => item.sessionId === sessionId);
    const sessionTime = sessionInfo ? sessionInfo.time : '';
    
    // Get today's date string
    const today = new Date().toLocaleDateString();
    
    // Get existing logs or initialize empty object
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    
    // Initialize today's log if it doesn't exist
    if (!studyLogs[today]) {
        studyLogs[today] = [];
    }
    
    // Add new log entry
    studyLogs[today].push({
        sessionId,
        sessionTime,
        notes,
        timestamp: new Date().toISOString()
    });
    
    // Save to localStorage
    localStorage.setItem('studyLogs', JSON.stringify(studyLogs));
    
    // Save completed status
    saveCompletedStatus();
    
    // Update today's logs display
    updateTodaysLogs();
    
    // Update calendar
    updateCalendarDisplay();
    
    // Close popup
    closeStudyLogPopup();
    
    // Show success message
    showNotification('Study log saved successfully!');
}

// Update today's logs display
function updateTodaysLogs() {
    const container = document.getElementById('todays-log-content');
    const today = new Date().toLocaleDateString();
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    const todaysLogs = studyLogs[today] || [];
    
    if (todaysLogs.length === 0) {
        container.innerHTML = '<div class="no-logs">No study logs for today yet.</div>';
        return;
    }
    
    let html = '';
    todaysLogs.forEach(log => {
        html += `
            <div class="log-entry">
                <div class="log-time">${log.sessionTime}</div>
                <div class="log-content">${log.notes}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Style the notification
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = 'var(--success-color)';
    notification.style.color = 'white';
    notification.style.padding = '15px 25px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
    notification.style.zIndex = '1000';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.transition = 'all 0.3s ease';
    
    // Add to body
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Remove from DOM after animation
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Save completed status to localStorage
function saveCompletedStatus() {
    const completed = {};
    const today = new Date().toLocaleDateString();
    
    document.querySelectorAll('.routine-item').forEach(item => {
        const index = item.dataset.index;
        completed[index] = item.classList.contains('completed');
    });
    
    // Get existing data or initialize empty object
    const allData = JSON.parse(localStorage.getItem('routineCompleted') || '{}');
    allData[today] = completed;
    
    localStorage.setItem('routineCompleted', JSON.stringify(allData));
}

// Load completed status from localStorage
function loadCompletedStatus() {
    const today = new Date().toLocaleDateString();
    const allData = JSON.parse(localStorage.getItem('routineCompleted') || '{}');
    const completed = allData[today] || {};
    
    document.querySelectorAll('.routine-item').forEach(item => {
        const index = item.dataset.index;
        if (completed[index]) {
            item.classList.add('completed');
        }
    });
}

// Initialize calendar
function initCalendar() {
    updateCalendarDisplay();
}

// Update calendar display
function updateCalendarDisplay() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('current-month').textContent = `${monthNames[displayedMonth]} ${displayedYear}`;
    
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
    
    // Get first day of month and number of days
    const firstDay = new Date(displayedYear, displayedMonth, 1);
    const lastDay = new Date(displayedYear, displayedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get day of week for first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Get study log data
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Check if this day has study logs
        const dateString = new Date(displayedYear, displayedMonth, day).toLocaleDateString();
        if (studyLogs[dateString]) {
            dayElement.classList.add('has-study');
        }
        
        // Check if this is today
        if (
            currentDate.getDate() === day && 
            currentDate.getMonth() === displayedMonth && 
            currentDate.getFullYear() === displayedYear
        ) {
            dayElement.classList.add('today');
        }
        
        // Add click event to show study details
        dayElement.addEventListener('click', () => showStudyDetails(dateString));
        
        calendarGrid.appendChild(dayElement);
    }
}

// Change month
function changeMonth(delta) {
    displayedMonth += delta;
    
    if (displayedMonth < 0) {
        displayedMonth = 11;
        displayedYear--;
    } else if (displayedMonth > 11) {
        displayedMonth = 0;
        displayedYear++;
    }
    
    updateCalendarDisplay();
}

// Show study details for a specific date
function showStudyDetails(dateString) {
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    const logs = studyLogs[dateString] || [];
    
    if (logs.length === 0) {
        document.getElementById('study-details-content').innerHTML = 'No study logs for this date.';
        return;
    }
    
    // Format date for display
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Show modal with details
    const modal = document.getElementById('study-detail-modal');
    document.getElementById('modal-date').querySelector('span').textContent = formattedDate;
    
    let modalContent = '';
    logs.forEach(log => {
        modalContent += `
            <div class="session-entry">
                <div class="session-time">${log.sessionTime}</div>
                <div class="session-notes">${log.notes}</div>
            </div>
        `;
    });
    
    document.getElementById('modal-content').innerHTML = modalContent;
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('study-detail-modal').style.display = 'none';
}

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const modal = document.getElementById('study-detail-modal');
    if (event.target === modal) {
        closeModal();
    }
});

// Add this function to your script.js
function setupPopupEventListeners() {
    // Get elements
    const popup = document.getElementById('study-log-popup');
    const overlay = document.getElementById('popup-overlay');
    const saveBtn = document.getElementById('save-popup-log');
    const cancelBtn = document.getElementById('cancel-log');
    
    // Set up event listeners
    saveBtn.addEventListener('click', saveStudyLogFromPopup);
    cancelBtn.addEventListener('click', closeStudyLogPopup);
    
    // Only close when clicking directly on the overlay, not the popup
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeStudyLogPopup();
        }
    });
    
    // Prevent clicks inside the popup from closing it
    popup.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// Schedule notifications for all routine items
function scheduleNotifications() {
    if (!notificationPermission) return;
    
    routineData.forEach(item => {
        const [startTime] = item.time.split('–');
        scheduleNotification(startTime.trim(), item.description);
    });
}

// Schedule individual notification
function scheduleNotification(timeStr, activity) {
    const now = new Date();
    const [hours, minutes] = timeStr.match(/(\d+):(\d+)/).slice(1);
    let scheduleTime = new Date(now);
    
    scheduleTime.setHours(parseInt(hours), parseInt(minutes), 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduleTime < now) {
        scheduleTime.setDate(scheduleTime.getDate() + 1);
    }
    
    const timeUntilNotification = scheduleTime - now;
    
    setTimeout(() => {
        sendNotification(activity);
        // Reschedule for next day
        scheduleNotification(timeStr, activity);
    }, timeUntilNotification);
}

// Send notification
function sendNotification(activity) {
    if (!notificationPermission) return;
    
    const options = {
        body: `Time to start: ${activity}`,
        icon: '/icon.png', // Add your icon path
        badge: '/badge.png', // Add your badge path
        vibrate: [200, 100, 200],
        tag: 'routine-notification',
        renotify: true
    };
    
    try {
        new Notification('Daily Routine', options);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Check if it's the first visit
function checkFirstVisit() {
    if (!localStorage.getItem(ROUTINE_STORAGE_KEY)) {
        showSetupWizard();
    } else {
        userRoutine = JSON.parse(localStorage.getItem(ROUTINE_STORAGE_KEY));
        generateRoutineItems();
    }
}

// Show setup wizard
function showSetupWizard() {
    const wizard = document.getElementById('setup-wizard');
    wizard.classList.add('active');
}

// Start routine setup
function startRoutineSetup() {
    document.getElementById('welcome-step').classList.remove('active');
    document.getElementById('add-routine-step').classList.add('active');
    
    // Set up form submission handler
    document.getElementById('routine-form').addEventListener('submit', handleRoutineAdd);
}

// Add time conflict detection
function hasTimeConflict(newStart, newEnd, skipIndex = -1) {
    const [newStartHours, newStartMinutes] = newStart.split(':').map(Number);
    const [newEndHours, newEndMinutes] = newEnd.split(':').map(Number);
    const newStartMins = newStartHours * 60 + newStartMinutes;
    const newEndMins = newEndHours * 60 + newEndMinutes;

    return userRoutine.some((item, index) => {
        if (index === skipIndex) return false;
        
        const [startTime, endTime] = item.time.split(' - ').map(t => convertTo24Hour(t));
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        const startMins = startHours * 60 + startMinutes;
        const endMins = endHours * 60 + endMinutes;

        return (newStartMins < endMins && newEndMins > startMins);
    });
}

// Update handleRoutineAdd to include time conflict check
function handleRoutineAdd(e) {
    e.preventDefault();
    
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const description = document.getElementById('activity-description').value;
    const type = document.getElementById('activity-type').value;

    // Check for time conflicts
    if (hasTimeConflict(startTime, endTime)) {
        showError('This time slot overlaps with an existing routine item!');
        return;
    }
    
    const routineItem = {
        time: `${formatTime(startTime)} - ${formatTime(endTime)}`,
        description: description,
        type: type,
        sessionId: type === 'study' ? `session${userRoutine.length + 1}` : null
    };
    
    userRoutine.push(routineItem);
    updateRoutinePreview();
    clearForm();
}

// Update editRoutineItem to include time conflict check
function editRoutineItem(index) {
    const item = userRoutine[index];
    const [startTime, endTime] = item.time.split(' - ').map(t => convertTo24Hour(t));
    
    // Check for time conflicts excluding the current item
    if (hasTimeConflict(startTime, endTime, index)) {
        showError('This time slot would overlap with another routine item!');
        return;
    }

    document.getElementById('start-time').value = startTime;
    document.getElementById('end-time').value = endTime;
    document.getElementById('activity-description').value = item.description;
    document.getElementById('activity-type').value = item.type;
    
    userRoutine.splice(index, 1);
    updateRoutinePreview();
}

// Add drag and drop functionality
function updateRoutinePreview() {
    const preview = document.getElementById('routine-preview');
    preview.innerHTML = '';
    
    userRoutine.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = `preview-item ${item.type}`;
        itemElement.draggable = true;
        itemElement.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="preview-content">
                <div class="preview-time">${item.time}</div>
                <div class="preview-description">${item.description}</div>
            </div>
            <div class="edit-buttons">
                <button onclick="editRoutineItem(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteRoutineItem(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add drag and drop event listeners
        itemElement.addEventListener('dragstart', handleDragStart);
        itemElement.addEventListener('dragend', handleDragEnd);
        itemElement.addEventListener('dragover', handleDragOver);
        itemElement.addEventListener('drop', handleDrop);
        itemElement.dataset.index = index;

        preview.appendChild(itemElement);
    });
}

// Drag and drop handlers
function handleDragStart(e) {
    draggedItem = e.target;
    draggedItemIndex = parseInt(e.target.dataset.index);
    e.target.classList.add('dragging');
    
    // Add visual feedback
    requestAnimationFrame(() => {
        e.target.style.opacity = '0.5';
    });
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    e.target.style.opacity = '';
    draggedItem = null;
    draggedItemIndex = null;
}

function handleDragOver(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.preview-item');
    if (!targetItem || targetItem === draggedItem) return;

    const targetIndex = parseInt(targetItem.dataset.index);
    const previewContainer = document.getElementById('routine-preview');
    const items = [...previewContainer.children];
    const draggedRect = draggedItem.getBoundingClientRect();
    const targetRect = targetItem.getBoundingClientRect();
    
    if (targetIndex > draggedItemIndex) {
        targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
    } else {
        targetItem.parentNode.insertBefore(draggedItem, targetItem);
    }
}

function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.preview-item');
    if (!targetItem || targetItem === draggedItem) return;

    const targetIndex = parseInt(targetItem.dataset.index);
    const item = userRoutine.splice(draggedItemIndex, 1)[0];
    userRoutine.splice(targetIndex, 0, item);

    // Update indices
    updateRoutinePreview();
}

// Error display function
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const form = document.getElementById('routine-form');
    form.insertBefore(errorDiv, form.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Finalize routine setup
async function finalizeRoutine() {
    if (userRoutine.length === 0) {
        alert('Please add at least one routine item.');
        return;
    }
    
    try {
        await db.collection('routines').doc(currentUser.uid).set({
            routine: userRoutine,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('setup-wizard').classList.remove('active');
        document.querySelector('.container').style.display = 'block';
        generateRoutineItems();
    } catch (error) {
        console.error('Error saving routine:', error);
        showError('Failed to save routine. Please try again.');
    }
}

// Helper functions
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes} ${period}`;
}

function convertTo24Hour(time12) {
    const [time, period] = time12.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (period === 'PM' && hours !== '12') {
        hours = parseInt(hours) + 12;
    } else if (period === 'AM' && hours === '12') {
        hours = '00';
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
}

function clearForm() {
    document.getElementById('routine-form').reset();
}

// Update the welcome step in your HTML to make it more exciting
document.getElementById('welcome-step').innerHTML = `
    <h3>Welcome! 👋</h3>
    <div class="welcome-animation">
        <img src="assets/icons/icon-192x192.png" alt="Daily Routine" class="welcome-icon">
    </div>
    <p class="welcome-text">Let's create your personalized daily routine that will help you stay organized and productive!</p>
    <p class="welcome-subtext">You can always modify it later.</p>
    <button class="next-btn" onclick="startRoutineSetup()">
        <i class="fas fa-magic"></i> Create My Routine
    </button>
`;

// Update auth state observer
auth.onAuthStateChanged(async user => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-container').style.display = 'none';
        document.querySelector('.container').style.display = 'block';
        
        // Load user's routine
        try {
            const doc = await db.collection('routines').doc(user.uid).get();
            if (doc.exists) {
                userRoutine = doc.data().routine;
                generateRoutineItems();
            } else {
                showSetupWizard();
            }
        } catch (error) {
            console.error('Error loading routine:', error);
            showError('Failed to load routine');
        }
    } else {
        currentUser = null;
        document.getElementById('auth-container').style.display = 'flex';
        document.querySelector('.container').style.display = 'none';
        document.getElementById('setup-wizard').style.display = 'none';
    }
});

// Update login function
function login(email, password) {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Clear form
            document.getElementById('login-form-element').reset();
        })
        .catch(error => {
            showError(error.message);
        })
        .finally(() => {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        });
}

// Update register function
function register(email, password) {
    const registerBtn = document.getElementById('register-btn');
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            // Clear form
            document.getElementById('register-form-element').reset();
            showSuccess('Account created successfully!');
        })
        .catch(error => {
            showError(error.message);
        })
        .finally(() => {
            registerBtn.disabled = false;
            registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
        });
}

// Add event listeners for auth
document.addEventListener('DOMContentLoaded', () => {
    // Login form submission
    document.getElementById('login-form-element').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        login(email, password);
    });

    // Register form submission
    document.getElementById('register-form-element').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        register(email, password);
    });

    // Form toggle
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'flex';
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'flex';
    });

    // Profile Management
    document.getElementById('change-password-btn').addEventListener('click', showPasswordResetModal);
    document.getElementById('send-reset-link').addEventListener('click', sendPasswordReset);
    document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

    // Data Management
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importData(e.target.files[0]);
        }
    });
});

// Profile Management
function showProfileModal() {
    const modal = document.getElementById('profile-modal');
    document.getElementById('profile-email').textContent = currentUser.email;
    modal.style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

// Password Reset
function showPasswordResetModal() {
    document.getElementById('password-reset-modal').style.display = 'flex';
    document.getElementById('reset-email').value = currentUser.email;
}

function closePasswordModal() {
    document.getElementById('password-reset-modal').style.display = 'none';
}

async function sendPasswordReset() {
    const email = document.getElementById('reset-email').value;
    try {
        await auth.sendPasswordResetEmail(email);
        showSuccess('Password reset link sent to your email!');
        closePasswordModal();
    } catch (error) {
        showError(error.message);
    }
}

// Data Export/Import
function exportData() {
    const data = {
        routine: userRoutine,
        completedTasks: JSON.parse(localStorage.getItem('completedTasks') || '{}'),
        studyLogs: JSON.parse(localStorage.getItem('studyLogs') || '{}'),
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-routine-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function importData(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Validate data structure
        if (!data.routine || !Array.isArray(data.routine)) {
            throw new Error('Invalid backup file format');
        }

        // Update routine
        userRoutine = data.routine;
        await db.collection('routines').doc(currentUser.uid).set({
            routine: userRoutine,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update local storage
        if (data.completedTasks) {
            localStorage.setItem('completedTasks', JSON.stringify(data.completedTasks));
        }
        if (data.studyLogs) {
            localStorage.setItem('studyLogs', JSON.stringify(data.studyLogs));
        }

        // Refresh UI
        generateRoutineItems();
        showSuccess('Data imported successfully!');
    } catch (error) {
        showError('Error importing data: ' + error.message);
    }
}

// Success message function
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    const form = document.querySelector('.container');
    form.insertBefore(successDiv, form.firstChild);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
} 