import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase Configuration
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

// 2. State Management
let globalData = [];
let expandedSet = new Set(); // Tracks which customer folders are "open"

// 3. Live Data Listener
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    // Turn the dot Green when connected
    const dot = document.getElementById('connectionDot');
    if(dot) dot.className = "h-4 w-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm";
    
    globalData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    window.renderDashboard();
});

// 4. Add New Job
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("Fill Mandatory Fields");
    
    const clientName = c.value.trim().toUpperCase();
    
    await addDoc(jobsCol, {
        title: t.value.toUpperCase(), 
        client: clientName, 
        priority: parseInt(p.value),
        ticket: r.value || "NA", 
        status: p.value == "1" ? 'Solved' : (p.value == "3" ? 'Critical' : 'Pending'),
        logs: [], 
        createdAt: Date.now(), 
        dateStr: new Date().toLocaleDateString('en-GB')
    });

    expandedSet.add(clientName); // Open folder for new entry
    t.value = ''; c.value = ''; r.value = '';
};

// 5. Add Log to Ticket
window.addLog = async (id) => {
    const input = document.getElementById(`log-in-${id}`);
    if (!input || !input.value) return;

    const job = globalData.find(j => j.id === id);
    const existingLogs = job.logs || [];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const newEntry = `[${time}] ${input.value.toUpperCase()}`;
    
    try {
        await updateDoc(doc(db, "jobs", id), { logs: [...existingLogs, newEntry] });
        input.value = ''; 
    } catch (e) { console.error("Update failed", e); }
};

// 6. UI Toggle Logic
window.toggleCust = (name) => {
    expandedSet.has(name) ? expandedSet.delete(name) : expandedSet.add(name);
    window.renderDashboard();
};

// 7. Render Function
window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    if (!container) return;
    
    const searchVal = document.getElementById('search').value.toUpperCase();
    const groups = globalData.reduce((acc, j) => { 
        (acc[j.client] = acc[j.client] || []).push(j); 
        return acc; 
    }, {});
    
    container.innerHTML = Object.keys(groups).sort().filter(c => c.includes(searchVal)).map(name => {
        const jobs = groups[name];
        const isOpen = expandedSet.has(name);

        return `
            <div class="border-b">
                <div onclick="toggleCust('${name}')" class="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <span class="text-lg font-black uppercase tracking-tight">${name}</span>
                    <span class="text-[9px] font-bold px-2 py-1 bg-slate-200 rounded text-slate-600">${isOpen ? 'CLOSE' : 'OPEN'}</span>
                </div>
                <div class="${isOpen ? '' : 'hidden'} bg-white border-t">
                    <table class="w-full text-[11px]">
                        <tbody class="divide-y">
                            ${jobs.map(j => {
                                const lastLog = j.logs && j.logs.length > 0 ? j.logs[j.logs.length - 1] : null;
                                return `
                                <tr>
                                    <td class="p-3 border-r w-24 font-bold text-slate-400">${j.dateStr}</td>
                                    <td class="p-3 border-r">
                                        <div class="font-black mb-1 uppercase">${j.title}</div>
                                        ${lastLog ? `<div class="bg-blue-50 text-blue-700 p-2 rounded border-l-2 border-blue-400 font-bold mb-2 uppercase">${lastLog}</div>` : ''}
                                        <div class="flex gap-1">
                                            <input id="log-in-${j.id}" onkeydown="if(event.key==='Enter') window.addLog('${j.id}')" placeholder="NEW LOG..." class="flex-1 border p-1 rounded text-[10px] uppercase font-semibold outline-none focus:bg-white bg-slate-50">
                                            <button onclick="addLog('${j.id}')" class="bg-slate-800 text-white px-3 rounded text-[9px] font-bold">ADD</button>
                                        </div>
                                    </td>
                                    <td class="p-3 border-r text-center w-32">
                                        <div class="py-2 rounded font-black text-[9px] text-white ${j.status==='Solved'?'bg-emerald-500':(j.status==='Critical'?'bg-red-600 animate-pulse':'bg-orange-500')}">${j.status}</div>
                                    </td>
                                    <td class="p-3 font-mono font-bold text-slate-400 w-32 uppercase">${j.ticket}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }).join('');
};

// Set Date display
document.getElementById('currentDateTime').innerText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
