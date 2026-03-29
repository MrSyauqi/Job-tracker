import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ... Keep your Firebase Config here ...

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const jobsCol = collection(db, "jobs");
let globalData = [];
let expandedCustomers = new Set();

// TOGGLE STATUS FUNCTION (The New Core Logic)
window.toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Solved' ? 'Pending' : 'Solved';
    const newPriority = newStatus === 'Solved' ? 1 : 2; // Move to Normal if reopened
    await updateDoc(doc(db, "jobs", id), { 
        status: newStatus, 
        priority: newPriority 
    });
};

// ... Keep addJob and updateRemark as they were ...

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
        const pending = jobs.filter(j => j.status !== 'Solved').length;
        const solved = jobs.filter(j => j.status === 'Solved').length;
        const isExp = expandedCustomers.has(client);

        return `
            <div class="border-b">
                <div onclick="window.toggleCustomer('${client}')" class="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition">
                    <div class="flex items-center gap-6">
                        <span class="text-xl font-black text-slate-800 tracking-tighter">${client}</span>
                        <div class="flex gap-2">
                            <span class="${pending > 0 ? 'bg-red-600 animate-pulse' : 'bg-slate-200 text-slate-500'} text-white text-[9px] px-2 py-1 rounded-sm font-black uppercase">${pending} Pending</span>
                            <span class="bg-emerald-500 text-white text-[9px] px-2 py-1 rounded-sm font-black uppercase">${solved} Solved</span>
                        </div>
                    </div>
                    <span class="text-slate-300 font-black text-[10px]">${isExp ? 'CLOSE' : 'OPEN'}</span>
                </div>

                <div class="${isExp ? '' : 'hidden'} bg-slate-50 border-t overflow-x-auto">
                    <table class="w-full text-[11px] border-collapse bg-white">
                        <thead class="bg-slate-100 text-slate-500 uppercase font-black text-[9px] border-b">
                            <tr>
                                <th class="p-3 text-left w-24 border-r">Date</th>
                                <th class="p-3 text-left border-r">Technical Issue & Action Remarks</th>
                                <th class="p-3 text-center w-32 border-r">Status</th>
                                <th class="p-3 text-left w-32">ID/Ticket</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${jobs.map(j => `
                                <tr class="hover:bg-blue-50/20">
                                    <td class="p-3 font-bold text-slate-400 border-r">${j.dateStr}</td>
                                    <td class="p-3 border-r">
                                        <div class="font-black text-slate-800 uppercase mb-2">${j.title}</div>
                                        <div class="flex items-center gap-3 bg-slate-50 p-2 rounded border border-dashed border-slate-200">
                                            <span class="text-[8px] font-black text-blue-500 uppercase whitespace-nowrap">Remark:</span>
                                            <input id="rem-${j.id}" onblur="window.updateRemark('${j.id}')" value="${j.remarks}" placeholder="Enter pending action..." class="bg-transparent w-full text-[10px] font-bold text-slate-600 outline-none">
                                        </div>
                                    </td>
                                    <td class="p-3 border-r text-center">
                                        <button onclick="window.toggleStatus('${j.id}', '${j.status}')" 
                                                class="w-full rounded-sm py-2 font-black text-[9px] uppercase shadow-sm transition active:scale-90
                                                ${j.status === 'Solved' ? 'bg-emerald-500 text-white' : (j.priority === 3 ? 'bg-red-600 text-white animate-pulse' : 'bg-orange-500 text-white')}">
                                            ${j.status === 'Solved' ? 'SOLVED' : (j.priority === 3 ? 'CRITICAL' : 'PENDING')}
                                        </button>
                                    </td>
                                    <td class="p-4 font-mono text-slate-400 font-bold flex justify-between items-center group">
                                        <span>${j.ticket}</span>
                                        <button onclick="window.deleteJob('${j.id}')" class="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">✕</button>
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
