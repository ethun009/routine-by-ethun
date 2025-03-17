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

    // Add event listener for modal overlay
    document.getElementById('modal-overlay').addEventListener('click', function() {
        closeDayLogsModal();
    });
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
    saveBtn.onclick = () => saveStudySession(sessionId);
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

// Update the saveStudySession function
function saveStudySession(sessionId) {
    const popup = document.getElementById('study-log-popup');
    const notes = document.getElementById('popup-study-notes').value.trim();
    
    if (notes) {
        // Save to Firebase and local storage
        saveStudyLog(sessionId, new Date(), notes);
        
        // Close popup
        popup.classList.remove('active');
        document.getElementById('popup-overlay').classList.remove('active');
        document.getElementById('popup-study-notes').value = '';
        
        // Mark as completed
        const routineItem = document.querySelector(`.routine-item[data-session-id="${sessionId}"]`);
        if (routineItem) {
            routineItem.classList.add('completed');
            saveCompletedStatus(routineItem.dataset.index, true);
        }
    }
}

// Update today's logs display
function updateTodaysLogs() {
    const todayStr = new Date().toISOString().split('T')[0];
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    const todaysLogs = studyLogs[todayStr] || {};
    
    const logContent = document.getElementById('todays-log-content');
    
    if (Object.keys(todaysLogs).length === 0) {
        logContent.innerHTML = '<div class="no-logs">No study logs for today yet.</div>';
        return;
    }
    
    let logHTML = '';
    
    // Sort logs by timestamp
    const sortedLogs = Object.entries(todaysLogs).sort((a, b) => {
        return a[1].timestamp - b[1].timestamp;
    });
    
    for (const [sessionId, logData] of sortedLogs) {
        const sessionTime = new Date(logData.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Find the routine item description
        let description = "Study Session";
        for (const item of userRoutine) {
            if (item.sessionId === sessionId) {
                description = item.description;
                break;
            }
        }
        
        logHTML += `
            <div class="log-entry">
                <div class="log-time">${sessionTime}</div>
                <div class="log-details">
                    <div class="log-title">${description}</div>
                    <div class="log-notes">${logData.notes}</div>
                </div>
            </div>
        `;
    }
    
    logContent.innerHTML = logHTML;
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Set icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    // Create notification content
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon} notification-icon"></i>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Show error notification
function showError(message) {
    showNotification(message, 'error');
}

// Show success notification
function showSuccess(message) {
    showNotification(message, 'success');
}

// Show info notification
function showInfo(message) {
    showNotification(message, 'info');
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
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) {
        console.warn('Calendar grid not found in the DOM');
        return;
    }
    
    // Make sure calendar days container exists
    if (!document.getElementById('calendar-days')) {
        console.warn('Calendar days container not found');
        return;
    }
    
    // Set current month and year
    displayedMonth = currentDate.getMonth();
    displayedYear = currentDate.getFullYear();
    
    // Update calendar display
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
    saveBtn.addEventListener('click', () => saveStudySession(popup.dataset.sessionId));
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
    
    // Reset the welcome step to be active
    document.getElementById('welcome-step').classList.add('active');
    document.getElementById('add-routine-step').classList.remove('active');
    
    // Clear any existing routine items in the preview
    userRoutine = [];
    document.getElementById('routine-preview').innerHTML = '';
    
    // Update the welcome message to be more personalized
    const welcomeStep = document.getElementById('welcome-step');
    welcomeStep.innerHTML = `
        <h3>Welcome, ${currentUser.email.split('@')[0]}! 👋</h3>
        <div class="welcome-animation">
            <img src="assets/icons/icon-192x192.png" alt="Daily Routine" class="welcome-icon">
        </div>
        <p class="welcome-text">Let's create your personalized daily routine that will help you stay organized and productive!</p>
        <p class="welcome-subtext">You can always modify it later.</p>
        <button class="next-btn" onclick="startRoutineSetup()">
            <i class="fas fa-magic"></i> Create My Routine
        </button>
    `;
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

// Add at the top of your script.js file
function logFirebaseError(error, operation) {
  console.error(`Firebase ${operation} error:`, error);
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  
  // Show more detailed error to user
  showError(`${operation} failed: ${error.message}`);
}

// Add this function to test Firebase connection
function testFirebaseConnection() {
  console.log("Testing Firebase connection...");
  
  // Test authentication
  console.log("Auth state:", auth.currentUser ? "Logged in" : "Not logged in");
  if (auth.currentUser) {
    console.log("Current user ID:", auth.currentUser.uid);
  }
  
  // Test Firestore
  db.collection('test').doc('test').set({
    test: 'This is a test',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    console.log("Firestore write test successful!");
  })
  .catch(error => {
    console.error("Firestore write test failed:", error);
  });
}

// Update the auth state observer to remove the enableOfflineSupport call
auth.onAuthStateChanged(async user => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-container').style.display = 'none';
        
        // Test Firebase connection
        testFirebaseConnection();
        
        // Load user's routine
        try {
            const doc = await db.collection('routines').doc(user.uid).get();
            if (doc.exists && doc.data().routine && doc.data().routine.length > 0) {
                userRoutine = doc.data().routine;
                generateRoutineItems();
                document.querySelector('.container').style.display = 'block';
            } else {
                // Show setup wizard if no routine exists
                showSetupWizard();
                document.querySelector('.container').style.display = 'none';
            }
            
            // Load study logs
            await loadStudyLogs();
            
        } catch (error) {
            logFirebaseError(error, 'Load routine');
            // Show setup wizard as fallback
            showSetupWizard();
        }
        
        // Add online/offline detection
        window.addEventListener('online', () => {
            document.getElementById('offline-status').style.display = 'none';
            syncStudyLogs();
            showSuccess("You're back online! Your data has been synced.");
        });
        
        window.addEventListener('offline', () => {
            document.getElementById('offline-status').style.display = 'block';
            showInfo("You're offline. Changes will be saved locally and synced when you're back online.");
        });
        
    } else {
        currentUser = null;
        document.getElementById('auth-container').style.display = 'flex';
        document.querySelector('.container').style.display = 'none';
        document.getElementById('setup-wizard').classList.remove('active');
    }
});

// Update finalizeRoutine function
async function finalizeRoutine() {
    if (userRoutine.length === 0) {
        alert('Please add at least one routine item.');
        return;
    }
    
    try {
        console.log("Saving routine for user:", currentUser.uid);
        console.log("Routine data:", userRoutine);
        
        await db.collection('routines').doc(currentUser.uid).set({
            routine: userRoutine,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('setup-wizard').classList.remove('active');
        document.querySelector('.container').style.display = 'block';
        generateRoutineItems();
        showSuccess('Routine saved successfully!');
    } catch (error) {
        logFirebaseError(error, 'Save routine');
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

// Update login function
function login(email, password) {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Clear form
            document.getElementById('login-form-element').reset();
            showSuccess('Login successful! Welcome back.');
        })
        .catch(error => {
            // Handle specific auth errors
            let errorMessage = error.message;
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email. Please register.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email format.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed login attempts. Please try again later.';
                    break;
            }
            showError(errorMessage);
            console.error('Auth error code:', error.code);
            console.error('Auth error message:', error.message);
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
            showSuccess('Account created successfully! Welcome to Daily Routine.');
        })
        .catch(error => {
            let errorMessage = error.message;
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'This email is already registered. Please login instead.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Please use at least 6 characters.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email format.';
                    break;
            }
            showError(errorMessage);
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

// Add these functions to handle study log synchronization with Firebase

// Save study log to Firestore and local storage
async function saveStudyLog(sessionId, date, notes) {
    if (!currentUser) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const timestamp = firebase.firestore.Timestamp.fromDate(date);
    
    // Get existing logs from localStorage first
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    
    // Update local storage
    if (!studyLogs[dateStr]) {
        studyLogs[dateStr] = {};
    }
    studyLogs[dateStr][sessionId] = {
        notes: notes,
        timestamp: date.getTime()
    };
    localStorage.setItem('studyLogs', JSON.stringify(studyLogs));
    
    // Update Firestore (will queue if offline)
    try {
        await db.collection('studyLogs').doc(currentUser.uid).set({
            [dateStr]: {
                [sessionId]: {
                    notes: notes,
                    timestamp: timestamp
                },
                ...((await getExistingFirestoreLogs(dateStr)) || {})
            }
        }, { merge: true });
        
        console.log("Study log saved to Firestore");
    } catch (error) {
        console.error("Error saving study log to Firestore:", error);
        // Will be synced later when online
    }
    
    // Update UI
    updateTodaysLogs();
    updateCalendarDisplay();
}

// Get existing logs for a specific date from Firestore
async function getExistingFirestoreLogs(dateStr) {
    if (!currentUser) return null;
    
    try {
        const doc = await db.collection('studyLogs').doc(currentUser.uid).get();
        if (doc.exists && doc.data()[dateStr]) {
            return doc.data()[dateStr];
        }
        return null;
    } catch (error) {
        console.error("Error getting existing logs:", error);
        return null;
    }
}

// Load study logs from Firestore and merge with local storage
async function loadStudyLogs() {
    if (!currentUser) return;
    
    try {
        const doc = await db.collection('studyLogs').doc(currentUser.uid).get();
        if (doc.exists) {
            const firestoreLogs = doc.data();
            const localLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
            
            // Merge logs (prioritize local logs as they might be newer)
            const mergedLogs = { ...firestoreLogs, ...localLogs };
            
            // Update local storage with merged logs
            localStorage.setItem('studyLogs', JSON.stringify(mergedLogs));
            
            // Update UI
            updateTodaysLogs();
            updateCalendarDisplay();
            
            console.log("Study logs loaded and merged");
        }
    } catch (error) {
        console.error("Error loading study logs:", error);
        // Continue with local logs
    }
}

// Sync local logs with Firestore (call this when coming online)
async function syncStudyLogs() {
    if (!currentUser) return;
    
    const localLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    if (Object.keys(localLogs).length === 0) return;
    
    try {
        // Get all logs from Firestore
        const doc = await db.collection('studyLogs').doc(currentUser.uid).get();
        const firestoreLogs = doc.exists ? doc.data() : {};
        
        // Merge logs (prioritize local logs)
        const mergedLogs = { ...firestoreLogs };
        
        // Convert local timestamps to Firestore timestamps
        for (const dateStr in localLogs) {
            if (!mergedLogs[dateStr]) mergedLogs[dateStr] = {};
            
            for (const sessionId in localLogs[dateStr]) {
                mergedLogs[dateStr][sessionId] = {
                    notes: localLogs[dateStr][sessionId].notes,
                    timestamp: firebase.firestore.Timestamp.fromMillis(
                        localLogs[dateStr][sessionId].timestamp
                    )
                };
            }
        }
        
        // Update Firestore with merged logs
        await db.collection('studyLogs').doc(currentUser.uid).set(mergedLogs);
        console.log("Study logs synced with Firestore");
        showSuccess("Your study logs have been synced");
    } catch (error) {
        console.error("Error syncing study logs:", error);
        showError("Failed to sync study logs. Will try again later.");
    }
}

// Add a fallback for the calendar update function
function updateCalendarDisplay() {
    // Get the current month and year
    const month = displayedMonth;
    const year = displayedYear;
    
    // Update the month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('current-month').textContent = `${monthNames[month]} ${year}`;
    
    // Generate the calendar
    generateCalendar(month, year);
}

// Add this function to your script.js file
function generateCalendar(month, year) {
    const calendarDays = document.getElementById('calendar-days');
    if (!calendarDays) {
        console.error('Calendar days container not found');
        return;
    }
    
    calendarDays.innerHTML = '';
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the number of days in the month
    const daysInMonth = lastDay.getDate();
    
    // Get the day of the week for the first day (0-6)
    const firstDayIndex = firstDay.getDay();
    
    // Create empty cells for days before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarDays.appendChild(emptyDay);
    }
    
    // Get study logs for highlighting days with logs
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    
    // Create cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Check if this is today
        const currentDate = new Date();
        if (currentDate.getDate() === day && 
            currentDate.getMonth() === month && 
            currentDate.getFullYear() === year) {
            dayElement.classList.add('today');
        }
        
        // Check if this day has study logs
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (studyLogs[dateStr] && Object.keys(studyLogs[dateStr]).length > 0) {
            dayElement.classList.add('has-logs');
            
            // Add click event to show logs for this day
            dayElement.addEventListener('click', () => showDayLogs(dateStr));
        }
        
        calendarDays.appendChild(dayElement);
    }
}

// Add this function to show logs for a specific day
function showDayLogs(dateStr) {
    const studyLogs = JSON.parse(localStorage.getItem('studyLogs') || '{}');
    const dayLogs = studyLogs[dateStr] || {};
    
    if (Object.keys(dayLogs).length === 0) {
        showInfo('No study logs for this day.');
        return;
    }
    
    // Format the date for display
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Create modal content
    let modalContent = `<h3>Study Logs for ${formattedDate}</h3><div class="day-logs">`;
    
    // Sort logs by timestamp
    const sortedLogs = Object.entries(dayLogs).sort((a, b) => {
        return a[1].timestamp - b[1].timestamp;
    });
    
    for (const [sessionId, logData] of sortedLogs) {
        const sessionTime = new Date(logData.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Find the routine item description
        let description = "Study Session";
        for (const item of userRoutine) {
            if (item.sessionId === sessionId) {
                description = item.description;
                break;
            }
        }
        
        modalContent += `
            <div class="log-entry">
                <div class="log-time">${sessionTime}</div>
                <div class="log-details">
                    <div class="log-title">${description}</div>
                    <div class="log-notes">${logData.notes}</div>
                </div>
            </div>
        `;
    }
    
    modalContent += '</div>';
    
    // Show modal with logs
    const dayLogsModal = document.getElementById('day-logs-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    
    if (dayLogsModal && modalOverlay) {
        document.getElementById('day-logs-content').innerHTML = modalContent;
        dayLogsModal.classList.add('active');
        modalOverlay.classList.add('active');
    } else {
        console.error('Day logs modal or overlay not found');
        // Fallback to notification if modal doesn't exist
        showInfo(`Study logs for ${formattedDate}: ${sortedLogs.length} entries`);
    }
}

// Add this function to close the day logs modal
function closeDayLogsModal() {
    const dayLogsModal = document.getElementById('day-logs-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    
    if (dayLogsModal && modalOverlay) {
        dayLogsModal.classList.remove('active');
        modalOverlay.classList.remove('active');
    }
} 