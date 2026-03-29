import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Date Header
const dateHeader = document.getElementById('currentDateTime');
if(dateHeader) dateHeader.innerText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// REAL-TIME LISTENER
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = "h-4 w-4 bg-emerald-500 rounded-full shadow-sm border-2 border-white";
    
    globalData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    window.renderDashboard();
}, (err) => {
    console.error("Firebase Error:", err);
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = "h-4 w-4 bg-red-600 animate-pulse rounded-full shadow-sm";
});

// ADD NEW RECORD
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("Fill Customer and Issue");

    const clientName = c.value.trim().toUpperCase();
    const statusText = p.value == "1" ? 'Solved' : (p.value == "3" ? 'Critical' : 'Pending');

    try {
        await addDoc(jobsCol, { 
            title: t.value.toUpperCase(), 
            client: clientName, 
            priority: parseInt(p.value), 
            ticket: r.value || "NA",
            status: statusText, 
            logs: [], 
            createdAt: Date.now(), 
            dateStr: new Date().toLocaleDateString('en-GB')
        });
        expandedCustomers.add(clientName);
        t.value = ''; c.value = ''; r.value = '';
    } catch (e) { alert("Error: " + e.message); }
};

// ADD LOG (FIXED)
window.addLog = async (id) => {
    const input = document.getElementById(`log-in-${id}`);
    if (!input || !input.value) return;

    // Find current record in local data
    const job = globalData.find(j => j.id === id);
    const currentLogs = job.logs || [];
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const newLogString = `[${time}] ${input.value.toUpperCase()}`;
    
    try {
        await updateDoc(doc(db, "jobs", id), { 
            logs: [...currentLogs, newLogString] 
        });
        input.value = '';
    } catch (e) { console.error("Update failed", e); }
};

window.changeStatus = async (id) => {
    const choice = prompt("1: PENDING | 2: SOLVED | 3: CRITICAL | 4: DELETE");
    if (choice === "1") await updateDoc(doc(db, "jobs", id), { status: 'Pending', priority: 2 });
    else if (choice === "2") await updateDoc(doc(db, "jobs", id), { status: 'Solved', priority: 1 });
    else if (choice === "3") await updateDoc(doc(db, "jobs", id), { status: 'Critical', priority: 3 });
    else if (choice === "4") if(confirm("Delete record?")) await deleteDoc(doc(db, "jobs", id));
};

window.editField = async (id, field, cur) => {
    const val = prompt(`Edit ${field.toUpperCase()}:`, cur);
    if (val) await updateDoc(doc(db, "jobs", id), { [field]: val.toUpperCase() });
};

window.toggleCustomer = (c) => { 
    if (expandedCustomers.has(c)) expandedCustomers.delete(c);
    else expandedCustomers.add(c); 
    window.renderDashboard(); 
};

window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    if (!container) return;

    const searchInput = document.getElementById('search');
    const search = searchInput ? searchInput.value.toUpperCase() : "";
    
    // Grouping
    const groups = globalData.reduce((acc, j) => { 
        (acc[j.client] = acc[j.client] || []).push(j); 
        return acc; 
    }, {});

    const sortedClients = Object.keys(groups).sort().filter(c => c.includes(search));

    container.innerHTML = sortedClients.map(client => {
        const jobs = groups[client].sort((a,b) => b.priority - a.priority);
        const isOpen = expandedCustomers.has(client);
        const pendingCount = jobs.filter(j => j.status !== 'Solved').length;

        return `
            <div class="border-b">
                <div onclick="window.toggleCustomer('${client}')" class="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-black tracking-tighter uppercase">${client}</span>
                        <span class="text-[9px] px-2 py-1 rounded ${pendingCount > 0 ? 'bg-red-600' : 'bg-slate-400'} text-white font-bold">${pendingCount} PENDING</span>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400">${isOpen ? 'CLOSE' : 'OPEN'}</span>
                </div>
                
                <div class="${isOpen ? '' : 'hidden'} overflow-x-auto bg-white border-t">
                    <table class="w-full text-[11px] border-collapse">
                        <thead class="bg-slate-50 text-[9px] font-black text-slate-400 border-b">
                            <tr>
                                <th class="p-3 text-left border-r w-24">Date</th>
                                <th class="p-3 text-left border-r">Issue & Latest Log</th>
                                <th class="p-3 text-center border-r w-32">Status</th>
                                <th class="p-3 text-left w-32">Ticket ID</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${jobs.map(j => {
                                const logArray = j.logs || [];
                                const latestLog = logArray.length > 0 ? logArray[logArray.length - 1] : null;
                                return `
                                <tr class="hover:bg-blue-50/10">
                                    <td onclick="window.editField('${j.id}','dateStr','${j.dateStr}')" class="p-3 border-r font-bold text-slate-400 cursor-pointer">${j.dateStr}</td>
                                    <td class="p-3 border-r">
                                        <div class="font-black mb-1 text-slate-800 uppercase">${j.title}</div>
                                        ${latestLog ? `<div class="bg-blue-50 text-blue-700 p-1 px-2 rounded border-l-2 border-blue-400 font-bold mb-2">${latestLog}</div>` : ''}
                                        <div class="flex gap-1">
                                            <input id="log-in-${j.id}" placeholder="UPDATE LOG..." class="flex-1 bg-slate-50 border p-1 rounded text-[10px] uppercase font-semibold outline-none focus:border-blue-300">
                                            <button onclick='window.addLog("${j.id}")' class="bg-slate-800 text-white px-3 rounded text-[9px] font-bold">ADD</button>
                                        </div>
                                    </td>
                                    <td class="p-3 border-r text-center">
                                        <button onclick="window.changeStatus('${j.id}')" class="w-full py-2 rounded font-black text-[9px] text-white ${j.status === 'Solved' ? 'bg-emerald-500' : (j.status === 'Critical' ? 'bg-red-600 animate-pulse' : 'bg-orange-500')}">${j.status}</button>
                                    </td>
                                    <td onclick="window.editField('${j.id}','ticket','${j.ticket}')" class="p-3 font-mono font-bold text-slate-400 cursor-pointer">${j.ticket}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }).join('');
};
