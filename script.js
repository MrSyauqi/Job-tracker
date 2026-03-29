import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDQ-z3DZqCULVOMlMNxXRhKUa9pHlhKwUc",
    authDomain: "workbasetrial.firebaseapp.com",
    projectId: "workbasetrial",
    storageBucket: "workbasetrial.firebasestorage.app",
    messagingSenderId: "122123476567",
    appId: "1:122123476567:web:aa60037c0393daeadc0d12"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const jobsCol = collection(db, "jobs");

// --- 2. GLOBAL STATE ---
let globalData = [];
let expandedSet = new Set(); // Tracks which "Customer" folders are open

// --- 3. LIVE DATA LISTENER (DATABASE TO UI) ---
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    // Connection indicator logic
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = "h-4 w-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm";
    
    // Sync local array with Firebase data
    globalData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Refresh the view
    window.renderDashboard();
});

// --- 4. REGISTER CASE (NEW RECORD) ---
window.addJob = async () => {
    const t = document.getElementById('jt'), // Issue Summary
          c = document.getElementById('jc'), // Customer
          p = document.getElementById('jp'), // Priority/Status
          r = document.getElementById('rt'); // Ticket ID

    if (!t.value || !c.value) return alert("Please fill Customer and Issue fields");

    const clientName = c.value.trim().toUpperCase();
    
    try {
        await addDoc(jobsCol, {
            title: t.value.toUpperCase(),
            client: clientName,
            priority: parseInt(p.value),
            ticket: r.value || "N/A",
            // Mapping selection to human-readable status
            status: p.value == "1" ? 'Solved' : (p.value == "3" ? 'Critical' : 'Pending'),
            logs: [],
            createdAt: Date.now(),
            dateStr: new Date().toLocaleDateString('en-GB')
        });

        // Auto-open the folder for the customer we just added to
        expandedSet.add(clientName);
        
        // Clear inputs
        t.value = ''; c.value = ''; r.value = '';
    } catch (e) {
        console.error("Error adding case: ", e);
    }
};

// --- 5. LOG TRACKING (ADD NEW LOG TO EXISTING CASE) ---
window.addLog = async (id) => {
    const input = document.getElementById(`log-in-${id}`);
    if (!input || !input.value) return;

    const job = globalData.find(j => j.id === id);
    const existingLogs = job.logs || [];
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const newEntry = `[${time}] ${input.value.toUpperCase()}`;
    
    try {
        await updateDoc(doc(db, "jobs", id), { 
            logs: [...existingLogs, newEntry] 
        });
        input.value = ''; // Clear input
    } catch (e) {
        console.error("Log update failed:", e);
    }
};

// --- 6. UI TOGGLE (OPEN/CLOSE FOLDERS) ---
window.toggleCust = (name) => {
    if (expandedSet.has(name)) expandedSet.delete(name);
    else expandedSet.add(name);
    window.renderDashboard();
};

// --- 7. RENDER DASHBOARD (THE UI GENERATOR) ---
window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    if (!container) return;
    
    const searchVal = document.getElementById('search').value.toUpperCase();
    
    // Group all tickets by Customer Name
    const groups = globalData.reduce((acc, j) => { 
        (acc[j.client] = acc[j.client] || []).push(j); 
        return acc; 
    }, {});
    
    // Build the HTML string
    container.innerHTML = Object.keys(groups).sort().filter(c => c.includes(searchVal)).map(name => {
        const jobs = groups[name];
        const isOpen = expandedSet.has(name);

        return `
            <div class="border-b">
                <div onclick="toggleCust('${name}')" class="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <span class="text-lg font-black uppercase tracking-tighter text-slate-800">${name}</span>
                    <span class="text-[9px] font-bold px-3 py-1 bg-slate-100 rounded text-slate-500 uppercase tracking-widest">
                        ${isOpen ? 'Close' : 'Open'}
                    </span>
                </div>

                <div class="${isOpen ? '' : 'hidden'} bg-white border-t">
                    <table class="w-full text-[10px]">
                        <thead class="bg-slate-50 border-b text-slate-400 font-black uppercase tracking-widest text-[9px]">
                            <tr>
                                <th class="p-3 text-left w-28 border-r">Date</th>
                                <th class="p-3 text-left">Issue and Log Tracking</th>
                                <th class="p-3 text-center w-32 border-r border-l">Ticket</th>
                                <th class="p-3 text-center w-32">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${jobs.map(j => {
                                const lastLog = j.logs && j.logs.length > 0 ? j.logs[j.logs.length - 1] : null;
                                return `
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td class="p-4 border-r font-bold text-slate-400 bg-slate-50/30">${j.dateStr}</td>
                                    
                                    <td class="p-4 border-r">
                                        <div class="font-black mb-2 text-sm uppercase text-slate-700">${j.title}</div>
                                        ${lastLog ? `
                                            <div class="bg-blue-50 text-blue-700 p-2 rounded border-l-4 border-blue-400 font-bold mb-3 uppercase text-[11px] shadow-sm">
                                                ${lastLog}
                                            </div>
                                        ` : ''}
                                        <div class="flex gap-2">
                                            <input id="log-in-${j.id}" 
                                                onkeydown="if(event.key==='Enter') window.addLog('${j.id}')" 
                                                placeholder="ADD LOG..." 
                                                class="flex-1 border p-2 rounded text-[10px] uppercase font-bold outline-none focus:ring-1 focus:ring-blue-300 bg-white">
                                            <button onclick="addLog('${j.id}')" class="bg-slate-800 text-white px-4 rounded text-[10px] font-black hover:bg-black transition">ADD</button>
                                        </div>
                                    </td>

                                    <td class="p-4 border-r text-center font-mono font-black text-slate-400 text-xs">
                                        ${j.ticket}
                                    </td>

                                    <td class="p-4 text-center">
                                        <div class="py-2 px-1 rounded font-black text-[9px] text-white shadow-sm ${
                                            j.status==='Solved' ? 'bg-emerald-500' : 
                                            (j.status==='Critical' ? 'bg-red-600 animate-pulse' : 'bg-orange-500')
                                        }">
                                            ${j.status}
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }).join('') || `<div class="p-10 text-center text-slate-300 font-black uppercase text-xs tracking-widest">No Cases Found</div>`;
};

// --- 8. INITIALIZE PAGE ---
document.getElementById('currentDateTime').innerText = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
});
