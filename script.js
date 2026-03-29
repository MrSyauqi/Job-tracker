import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Ensure these credentials match your Firebase Project Settings exactly
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
let globalData = [];
let expandedCustomers = new Set();

// Update Date Header
document.getElementById('currentDateTime').innerText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// REAL-TIME LISTENER & CONNECTION CHECK
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    // Turn dot GREEN when data is received
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = "h-4 w-4 bg-emerald-500 rounded-full shadow-sm";
    
    globalData = [];
    snapshot.forEach(doc => { 
        let d = doc.data(); 
        d.id = doc.id; 
        globalData.push(d); 
    });
    renderDashboard();
}, (error) => {
    console.error("Firebase Connection Error:", error);
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = "h-4 w-4 bg-red-500 animate-pulse rounded-full shadow-sm";
});

window.addJob = async (e) => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("Please fill Customer and Issue Summary");
    
    const statusVal = parseInt(p.value) === 1 ? 'Solved' : (parseInt(p.value) === 3 ? 'Critical' : 'Pending');
    
    try {
        await addDoc(jobsCol, { 
            title: t.value.trim().toUpperCase(), 
            client: c.value.trim().toUpperCase(), 
            priority: parseInt(p.value), 
            ticket: r.value.trim() || "N/A",
            status: statusVal, 
            logs: [], 
            createdAt: Date.now(), 
            dateStr: new Date().toLocaleDateString('en-GB')
        });
        t.value = ''; c.value = ''; r.value = '';
    } catch (err) {
        alert("Upload Failed. Check Firebase Rules.");
    }
};

window.addLog = async (id, existingLogs) => {
    const input = document.getElementById(`log-in-${id}`);
    if (!input.value.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const newEntry = `[${time}] ${input.value.toUpperCase()}`;
    await updateDoc(doc(db, "jobs", id), { logs: [...existingLogs, newEntry] });
    input.value = '';
};

window.editField = async (id, field, currentVal) => {
    const newVal = prompt(`Edit ${field.toUpperCase()}:`, currentVal);
    if (newVal !== null && newVal !== currentVal) {
        let update = {}; update[field] = newVal.toUpperCase();
        await updateDoc(doc(db, "jobs", id), update);
    }
};

window.changeStatus = async (id) => {
    const choice = prompt("SET STATUS:\n1. PENDING\n2. SOLVED\n3. CRITICAL\n4. DELETE RECORD");
    if (choice === "1") await updateDoc(doc(db, "jobs", id), { status: 'Pending', priority: 2 });
    else if (choice === "2") await updateDoc(doc(db, "jobs", id), { status: 'Solved', priority: 1 });
    else if (choice === "3") await updateDoc(doc(db, "jobs", id), { status: 'Critical', priority: 3 });
    else if (choice === "4") if(confirm("Permanently delete?")) await deleteDoc(doc(db, "jobs", id));
};

window.toggleCustomer = (client) => {
    expandedCustomers.has(client) ? expandedCustomers.delete(client) : expandedCustomers.add(client);
    renderDashboard();
};

window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    const searchVal = document.getElementById('search').value.toUpperCase();
    
    const groups = globalData.reduce((acc, job) => {
        if (!acc[job.client]) acc[job.client] = [];
        acc[job.client].push(job);
        return acc;
    }, {});

    const sortedClients = Object.keys(groups).sort().filter(c => c.includes(searchVal));

    container.innerHTML = sortedClients.map(client => {
        const jobs = groups[client].sort((a, b) => b.priority - a.priority);
        const pendingCount = jobs.filter(j => j.status !== 'Solved').length;
        const isExp = expandedCustomers.has(client);

        return `
            <div class="border-b">
                <div onclick="window.toggleCustomer('${client}')" class="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition">
                    <div class="flex items-center gap-4">
                        <span class="text-xl font-black text-slate-800 tracking-tighter uppercase">${client}</span>
                        <span class="${pendingCount > 0 ? 'bg-red-600' : 'bg-slate-300 text-slate-500'} text-white text-[9px] px-2 py-1 rounded-sm font-black uppercase">${pendingCount} Pending</span>
                    </div>
                    <span class="text-slate-300 font-black text-[10px] tracking-wider">${isExp ? 'CLOSE' : 'OPEN'}</span>
                </div>

                <div class="${isExp ? '' : 'hidden'} overflow-x-auto bg-white border-t">
                    <table class="w-full text-[11px] border-collapse bg-white">
                        <thead class="bg-slate-100 text-slate-500 uppercase font-black text-[9px] border-b">
                            <tr>
                                <th class="p-3 text-left w-24 border-r">Date</th>
                                <th class="p-3 text-left border-r">Issue & History Logs</th>
                                <th class="p-3 text-center w-36 border-r">Status</th>
                                <th class="p-3 text-left w-32">Ticket ID</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${jobs.map(j => {
                                const logs = j.logs || [];
                                const latestLogEntry = logs.slice(-1); // Only 1 log entry shown
                                
                                return `
                                <tr class="hover:bg-blue-50/20 group">
                                    <td onclick="window.editField('${j.id}', 'dateStr', '${j.dateStr}')" class="p-3 font-bold text-slate-400 border-r cursor-pointer hover:text-blue-500">${j.dateStr}</td>
                                    <td class="p-3 border-r">
                                        <div class="font-black text-slate-800 uppercase mb-2">${j.title}</div>
                                        <div class="space-y-1 mb-2">
                                            ${latestLogEntry.map(log => `<div class="bg-blue-50 text-blue-700 p-1 px-2 rounded-sm text-[10px] font-bold border-l-2 border-blue-400">${log}</div>`).join('')}
                                        </div>
                                        <div class="flex gap-1">
                                            <input id="log-in-${j.id}" placeholder="UPDATE LOG..." class="flex-1 bg-slate-50 border p-1 px-2 rounded text-[10px] outline-none font-semibold uppercase">
                                            <button onclick='window.addLog("${j.id}", ${JSON.stringify(logs)})' class="bg-slate-800 text-white px-3 rounded text-[9px] font-bold uppercase">Add</button>
                                        </div>
                                    </td>
                                    <td class="p-3 border-r text-center">
                                        <button onclick="window.changeStatus('${j.id}')" 
                                                class="w-full rounded-sm py-2 font-black text-[9px] uppercase shadow-sm transition active:scale-90
                                                ${j.status === 'Solved' ? 'bg-emerald-500 text-white' : (j.priority === 3 ? 'bg-red-600 text-white animate-pulse' : 'bg-orange-500 text-white')}">
                                            ${j.status}
                                        </button>
                                    </td>
                                    <td onclick="window.editField('${j.id}', 'ticket', '${j.ticket}')" class="p-3 font-mono text-slate-400 font-bold uppercase cursor-pointer hover:text-blue-500">
                                        ${j.ticket}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');
};
