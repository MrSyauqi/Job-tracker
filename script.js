import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let expandedSet = new Set(); 
let openLogsSet = new Set(); 

onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = "h-4 w-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm transition-all";
    
    globalData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    updateCustomerDatalist(); // Update the auto-suggest list
    window.renderDashboard();
}, (error) => {
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = "h-4 w-4 bg-red-600 rounded-full border-2 border-white shadow-sm animate-pulse";
});

// --- (2) AUTO-SUGGEST EXISTING CUSTOMERS ---
function updateCustomerDatalist() {
    const list = document.getElementById('customerList');
    if (!list) return;
    const uniqueCustomers = [...new Set(globalData.map(j => j.client))].sort();
    list.innerHTML = uniqueCustomers.map(c => `<option value="${c}">`).join('');
}

// --- ACTIONS ---
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("Fill Mandatory Fields");
    const clientName = c.value.trim().toUpperCase();
    
    await addDoc(jobsCol, {
        title: t.value.toUpperCase(),
        client: clientName,
        priority: parseInt(p.value),
        ticket: r.value || "N/A",
        status: p.value == "1" ? 'Solved' : (p.value == "3" ? 'Critical' : 'Pending'),
        logs: [],
        createdAt: Date.now(),
        dateStr: new Date().toLocaleDateString('en-GB')
    });
    expandedSet.add(clientName);
    t.value = ''; r.value = ''; // Note: Leave 'c' if you want to add multiple for same customer
};

window.cycleStatus = async (id, currentStatus) => {
    const statusMap = { 'Pending': 'Critical', 'Critical': 'Solved', 'Solved': 'Pending' };
    const priorityMap = { 'Pending': 2, 'Critical': 3, 'Solved': 1 };
    const nextStatus = statusMap[currentStatus];
    await updateDoc(doc(db, "jobs", id), { status: nextStatus, priority: priorityMap[nextStatus] });
};

window.editField = async (id, field, currentValue) => {
    const newValue = prompt(`Edit ${field.toUpperCase()}:`, currentValue);
    if (newValue !== null && newValue !== currentValue) {
        const updateData = {};
        updateData[field === 'date' ? 'dateStr' : 'ticket'] = newValue.toUpperCase();
        await updateDoc(doc(db, "jobs", id), updateData);
    }
};

window.addLog = async (id) => {
    const input = document.getElementById(`log-in-${id}`);
    if (!input || !input.value) return;
    const job = globalData.find(j => j.id === id);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const newEntry = `[${time}] ${input.value.toUpperCase()}`;
    await updateDoc(doc(db, "jobs", id), { logs: [...(job.logs || []), newEntry] });
    input.value = '';
};

window.toggleLogHistory = (id) => {
    openLogsSet.has(id) ? openLogsSet.delete(id) : openLogsSet.add(id);
    window.renderDashboard();
};

window.toggleCust = (name) => {
    expandedSet.has(name) ? expandedSet.delete(name) : expandedSet.add(name);
    window.renderDashboard();
};

// --- CORE UI RENDERER ---
window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    if (!container) return;
    const searchVal = document.getElementById('search').value.toUpperCase();
    
    // Grouping
    const groups = globalData.reduce((acc, j) => { (acc[j.client] = acc[j.client] || []).push(j); return acc; }, {});
    
    // --- (1) SORT CUSTOMERS BY CRITICALITY ---
    const sortedCustomerNames = Object.keys(groups).sort((a, b) => {
        const aCrit = groups[a].filter(j => j.status === 'Critical').length;
        const bCrit = groups[b].filter(j => j.status === 'Critical').length;
        const aPend = groups[a].filter(j => j.status === 'Pending').length;
        const bPend = groups[b].filter(j => j.status === 'Pending').length;

        // Sort priority: Most Critical first, then most Pending
        if (bCrit !== aCrit) return bCrit - aCrit;
        return bPend - aPend;
    });

    container.innerHTML = sortedCustomerNames.filter(c => c.includes(searchVal)).map(name => {
        let jobs = groups[name];
        const critCount = jobs.filter(j => j.status === 'Critical').length;
        const pendCount = jobs.filter(j => j.status === 'Pending').length;
        
        // Inside table sort: Critical > Pending > Solved
        jobs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        const isOpen = expandedSet.has(name);

        return `
            <div class="border-b">
                <div onclick="toggleCust('${name}')" class="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-black uppercase tracking-tight text-slate-800">${name}</span>
                        <div class="flex gap-1">
                            ${critCount > 0 ? `<span class="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded animate-pulse">${critCount} CRIT</span>` : ''}
                            ${pendCount > 0 ? `<span class="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded">${pendCount} PEND</span>` : ''}
                        </div>
                    </div>
                    <span class="text-[9px] font-bold px-3 py-1 bg-slate-100 rounded text-slate-500 uppercase tracking-widest">${isOpen ? 'Close' : 'Open'}</span>
                </div>

                <div class="${isOpen ? '' : 'hidden'} bg-white border-t overflow-x-auto">
                    <table class="w-full text-[10px]">
                        <thead class="bg-slate-50 border-b text-slate-400 font-black uppercase tracking-widest text-[9px]">
                            <tr>
                                <th class="p-3 text-left w-28 border-r">Date</th>
                                <th class="p-3 text-left">Issue & Summary</th>
                                <th class="p-3 text-center w-32 border-r border-l">Ticket</th>
                                <th class="p-3 text-center w-32">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${jobs.map(j => {
                                const isLogExpanded = openLogsSet.has(j.id);
                                const logs = j.logs || [];
                                const displayLogs = isLogExpanded ? logs : (logs.length > 0 ? [logs[logs.length - 1]] : []);

                                return `
                                <tr class="hover:bg-slate-50/50 transition">
                                    <td onclick="editField('${j.id}', 'date', '${j.dateStr}')" class="p-4 border-r font-bold text-slate-400 cursor-pointer hover:text-blue-500 transition">${j.dateStr}</td>
                                    <td class="p-4 border-r">
                                        <div class="font-black mb-2 text-sm uppercase text-slate-800">${j.title}</div>
                                        <div class="space-y-1 mb-3">
                                            ${displayLogs.map(log => `<div class="bg-blue-50 text-blue-700 p-2 rounded border-l-4 border-blue-400 font-bold uppercase text-[10px]">${log}</div>`).join('')}
                                            ${logs.length > 1 ? `<button onclick="toggleLogHistory('${j.id}')" class="text-[9px] font-black text-blue-500 mt-1 uppercase hover:underline">${isLogExpanded ? '↑ Show Less' : `↓ View All ${logs.length} Logs`}</button>` : ''}
                                        </div>
                                        <div class="flex gap-2">
                                            <input id="log-in-${j.id}" onkeydown="if(event.key==='Enter') window.addLog('${j.id}')" placeholder="ADD SUMMARY..." class="flex-1 border p-2 rounded text-[10px] uppercase font-bold outline-none bg-slate-50 focus:bg-white transition-all">
                                            <button onclick="addLog('${j.id}')" class="bg-slate-800 text-white px-4 rounded text-[10px] font-black hover:bg-black">ADD</button>
                                        </div>
                                    </td>
                                    <td onclick="editField('${j.id}', 'ticket', '${j.ticket}')" class="p-4 border-r text-center font-mono font-black text-slate-400 text-xs cursor-pointer hover:text-blue-500 transition">${j.ticket}</td>
                                    <td class="p-4 text-center">
                                        <div onclick="cycleStatus('${j.id}', '${j.status}')" class="py-2 px-1 rounded font-black text-[9px] text-white shadow-sm cursor-pointer hover:brightness-90 transition ${j.status==='Solved'?'bg-emerald-500':(j.status==='Critical'?'bg-red-600 animate-pulse':'bg-orange-500')}">
                                            ${j.status}
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }).join('');
};

document.getElementById('currentDateTime').innerText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
