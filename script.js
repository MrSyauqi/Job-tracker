// 1. Import the specific parts of Firebase we need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. Your specific configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQ-z3DZqCULVOMlMNxXRhKUa9pHlhKwUc",
  authDomain: "workbasetrial.firebaseapp.com",
  projectId: "workbasetrial",
  storageBucket: "workbasetrial.firebasestorage.app",
  messagingSenderId: "122123476567",
  appId: "1:122123476567:web:aa60037c0393daeadc0d12",
  measurementId: "G-N40VS2X0C4"
};

// 3. Initialize Firebase and the Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // THIS IS THE KEY LINE
const jobsCol = collection(db, "jobs");

// 4. Test the connection and turn the dot GREEN
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = "h-4 w-4 bg-emerald-500 rounded-full shadow-sm"; // Connection Success!
    
    // ... rest of your render logic ...
}, (error) => {
    console.error("Database Error:", error);
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = "h-4 w-4 bg-red-500 animate-pulse rounded-full shadow-sm";
});
