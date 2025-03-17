// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX1wefAWh1RKtq6MmIQTvj_20GC10TIKQ",
  authDomain: "routine-aa9ea.firebaseapp.com",
  projectId: "routine-aa9ea",
  storageBucket: "routine-aa9ea.appspot.com",
  messagingSenderId: "589666199398",
  appId: "1:589666199398:web:768a35de8eb626ca4b0aa7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Enable persistence immediately before any other Firestore operations
try {
  // Check if we've already tried to enable persistence
  if (localStorage.getItem('persistenceEnabled') !== 'true') {
    firebase.firestore().enablePersistence()
      .then(() => {
        console.log("Offline persistence enabled");
        localStorage.setItem('persistenceEnabled', 'true');
      })
      .catch(err => {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time
          console.warn("Multiple tabs open, persistence only enabled in one tab");
        } else if (err.code === 'unimplemented') {
          // The current browser does not support all of the features required for persistence
          console.warn("This browser doesn't support offline persistence");
        } else {
          console.warn("Error enabling offline persistence:", err);
        }
      });
  } else {
    console.log("Persistence already enabled in a previous session");
  }
} catch (e) {
  console.error("Error setting up persistence:", e);
}

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Add this function to help debug Firebase issues
function logFirebaseError(error, operation) {
  console.error(`Firebase ${operation} error:`, error);
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  
  // Show more detailed error to user
  showError(`${operation} failed: ${error.message}`);
}

// Add this to your script.js temporarily for testing
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

// Call this function after login
// Add this line to your auth.onAuthStateChanged callback when user is logged in
testFirebaseConnection(); 

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
