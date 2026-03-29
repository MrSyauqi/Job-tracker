window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    if (!container) return;
    const searchVal = document.getElementById('search').value.toUpperCase();
    
    // Grouping
    const groups = globalData.reduce((acc, j) => { (acc[j.client] = acc[j.client] || []).push(j); return acc; }, {});
    
    container.innerHTML = Object.keys(groups).sort().filter(c => c.includes(searchVal)).map(name => {
        let jobs = groups[name];
        
        // (1) CALCULATE INDICATORS FOR THE HEADER
        const criticalCount = jobs.filter(j => j.status === 'Critical').length;
        const pendingCount = jobs.filter(j => j.status === 'Pending').length;

        // Sorting: Critical > Pending > Solved
        jobs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        const isOpen = expandedSet.has(name);

        return `
            <div class="border-b">
                <div onclick="toggleCust('${name}')" class="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <div class="flex items-center gap-4">
                        <span class="text-lg font-black uppercase tracking-tight text-slate-800">${name}</span>
                        
                        <div class="flex gap-2">
                            ${criticalCount > 0 ? `<span class="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">${criticalCount} CRITICAL</span>` : ''}
                            ${pendingCount > 0 ? `<span class="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">${pendingCount} PENDING</span>` : ''}
                        </div>
                    </div>
                    
                    <span class="text-[9px] font-bold px-3 py-1 bg-slate-100 rounded text-slate-500 uppercase tracking-widest">
                        ${isOpen ? 'Close' : 'Open'}
                    </span>
                </div>

                <div class="${isOpen ? '' : 'hidden'} bg-white border-t">
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
                                    <td onclick="editField('${j.id}', 'date', '${j.dateStr}')" class="p-4 border-r font-bold text-slate-400 cursor-pointer hover:text-blue-500">${j.dateStr}</td>
                                    <td class="p-4 border-r">
                                        <div class="font-black mb-2 text-sm uppercase text-slate-800">${j.title}</div>
                                        <div class="space-y-1 mb-3">
                                            ${displayLogs.map(log => `
                                                <div class="bg-blue-50 text-blue-700 p-2 rounded border-l-4 border-blue-400 font-bold uppercase text-[10px]">${log}</div>
                                            `).join('')}
                                            ${logs.length > 1 ? `
                                                <button onclick="toggleLogHistory('${j.id}')" class="text-[9px] font-black text-blue-500 mt-1 uppercase hover:underline">
                                                    ${isLogExpanded ? '↑ Show Less' : `↓ View All ${logs.length} Logs`}
                                                </button>
                                            ` : ''}
                                        </div>
                                        <div class="flex gap-2">
                                            <input id="log-in-${j.id}" onkeydown="if(event.key==='Enter') window.addLog('${j.id}')" 
                                                placeholder="ADD SUMMARY..." class="flex-1 border p-2 rounded text-[10px] uppercase font-bold outline-none bg-slate-50 focus:bg-white">
                                            <button onclick="addLog('${j.id}')" class="bg-slate-800 text-white px-4 rounded text-[10px] font-black">ADD</button>
                                        </div>
                                    </td>
                                    <td onclick="editField('${j.id}', 'ticket', '${j.ticket}')" class="p-4 border-r text-center font-mono font-black text-slate-400 text-xs cursor-pointer hover:text-blue-500">${j.ticket}</td>
                                    <td class="p-4 text-center">
                                        <div onclick="cycleStatus('${j.id}', '${j.status}')" 
                                            class="py-2 px-1 rounded font-black text-[9px] text-white shadow-sm cursor-pointer hover:brightness-90 transition ${
                                            j.status==='Solved'?'bg-emerald-500':(j.status==='Critical'?'bg-red-600 animate-pulse':'bg-orange-500')}">
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
