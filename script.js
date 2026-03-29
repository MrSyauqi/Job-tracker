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

// Set Date Header
document.getElementById('currentDateTime').innerText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    document.getElementById('connectionDot').classList.replace('bg-red-500', 'bg-green-500');
    globalData = [];
    snapshot.forEach(doc => { let d = doc.data(); d.id = doc.id; globalData.push(d); });
    renderDashboard();
});

window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("REQUIRED: Customer & Issue Summary");
    await addDoc(jobsCol, { 
        title: t.value.toUpperCase(), 
        client: c.value.trim().toUpperCase(), 
        priority: parseInt(p.value), 
        ticket: r.value || "N/A",
        status: parseInt(p.value) === 1 ? 'Solved' : 'Pending', 
        remarks: "",
        createdAt: Date.now(),
        dateStr: new Date().toLocaleDateString('en-GB')
    });
    t.value = ''; c.value = ''; r.value = '';
};

window.updateRemark = async (id) => {
    const val = document.getElementById(`rem-${id}`).value;
    await updateDoc(doc(db, "jobs", id), { remarks: val });
};

window.setSolved = async (id) => await updateDoc(doc(db, "jobs", id), { status: 'Solved', priority: 1 });
window.deleteJob = async (id) => { if(confirm("Permanently delete record?")) await deleteDoc(doc(db, "jobs", id)); };

window.toggleCustomer = (client) => {
    expandedCustomers.has(client) ? expandedCustomers.delete(client) : expandedCustomers.add(client);
    renderDashboard();
};

window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    const searchTerm = document.getElementById('search').value.toUpperCase();
    
    // Group Data by Customer
    const groups = globalData.reduce((acc, job) => {
        if (!acc[job.client]) acc[job.client] = [];
        acc[job.client].push(job);
        return acc;
    }, {});

    const sortedClients = Object.keys(groups).sort().filter(c => c.includes(searchTerm));

    container.innerHTML = sortedClients.map(client => {
        const jobs = groups[client].sort((a, b) => b.priority - a.priority); // High Priority first
        const pendingCount = jobs.filter(j => j.status !== 'Solved').length;
        const solvedCount = jobs.filter(j => j.status === 'Solved').length;
        const isExpanded = expandedCustomers.has(client);

        return `
            <div class="border-b">
                <div onclick="window.toggleCustomer('${client}')" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition">
                    <div class="flex items-center gap-4">
                        <span class="text-lg font-black text-slate-800 w-32 truncate">${client}</span>
                        <div class="flex gap-2">
                            <span class="${pendingCount > 0 ? 'bg-red-600' : 'bg-slate-200'} text-white text-[10px] px-2 py-0.5 rounded font-bold">${pendingCount} PENDING</span>
                            <span class="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">${solvedCount} SOLVED</span>
                        </div>
                    </div>
                    <span class="text-slate-400 font-bold">${isExpanded ? '▲' : '▼'}</span>
                </div>

                <div class="${isExpanded ? '' : 'hidden'} bg-slate-50 border-t overflow-x-auto">
                    <table class="w-full text-[11px] border-collapse">
                        <thead>
                            <tr class="bg-slate-200/50 text-slate-500 uppercase font-black border-b">
                                <th class="p-3 text-left w-24">Date</th>
                                <th class="p-3 text-left">Issue Summary</th>
                                <th class="p-3 text-center w-24">Status</th>
                                <th class="p-3 text-left w-32">Ticket</th>
                                <th class="p-3 text-center w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${jobs.map(j => `
                                <tr class="border-b bg-white hover:bg-blue-50/30">
                                    <td class="p-3 text-slate-400 font-bold">${j.dateStr}</td>
                                    <td class="p-3">
                                        <div class="font-bold text-slate-800 mb-1">${j.title}</div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-[9px] text-slate-400 font-black uppercase">Remark:</span>
                                            <input id="rem-${j.id}" onblur="window.updateRemark('${j.id}')" value="${j.remarks}" placeholder="Add action taken..." class="bg-transparent border-b border-dotted border-slate-300 w-full outline-none focus:border-blue-500 text-blue-600">
                                        </div>
                                    </td>
                                    <td class="p-3">
                                        <div class="rounded px-2 py-1 font-black text-center text-[9px] uppercase ${j.status === 'Solved' ? 'bg-emerald-100 text-emerald-700' : (j.priority === 3 ? 'bg-red-600 text-white animate-pulse' : 'bg-orange-100 text-orange-700')}">
                                            ${j.status === 'Solved' ? 'Solved' : (j.priority === 3 ? 'Critical' : 'Pending')}
                                        </div>
                                    </td>
                                    <td class="p-3 font-mono text-slate-500 font-bold">${j.ticket}</td>
                                    <td class="p-3 text-center">
                                        <div class="flex justify-center gap-2">
                                            ${j.status !== 'Solved' ? `<button onclick="window.setSolved('${j.id}')" class="text-emerald-500 hover:scale-110">✔</button>` : ''}
                                            <button onclick="window.deleteJob('${j.id}')" class="text-slate-300 hover:text-red-500">🗑</button>
                                        </div>
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
