import { fetchBookedLeaves, fetchLeavePlans, addLeave, createLeavePlan } from '../services/leaveService';

/**
 * Export all user leaves (PL, EL, RH, WFH, Office), plans, and settings into a JSON backup file.
 */
export const exportUserDataToJson = async (leavesQuota = { pl: 15, el: 10, rh: 1 }) => {
  try {
    const bookedLeaves = await fetchBookedLeaves();
    const leavePlans = await fetchLeavePlans();

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      quotaSettings: {
        pl: leavesQuota?.pl?.total || 15,
        el: leavesQuota?.el?.total || 10,
        rh: leavesQuota?.rh?.total || 1
      },
      leaves: (bookedLeaves || []).map(b => ({
        date: b.date,
        type: b.type,
        note: b.note || '',
        status: b.status || 'planned',
        duration: b.duration || 1,
        plan_id: b.plan_id || null
      })),
      plans: (leavePlans || []).map(p => ({
        id: p.id,
        name: p.name,
        startDate: p.start_date || p.startDate,
        endDate: p.end_date || p.endDate,
        status: p.status || 'planned'
      }))
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave_planner_backup_${todayStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: backupData.leaves.length };
  } catch (err) {
    console.error('Failed to export data:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Import user leaves (including WFH/Office) and plans from a JSON backup file.
 */
export const importUserDataFromJson = async (jsonFile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const backupData = JSON.parse(content);

        if (!backupData || !Array.isArray(backupData.leaves)) {
          throw new Error('Invalid backup file format: missing "leaves" array.');
        }

        let importedLeavesCount = 0;
        let importedPlansCount = 0;

        // Import plans first if available
        const planIdMap = {};
        if (Array.isArray(backupData.plans)) {
          for (const plan of backupData.plans) {
            const created = await createLeavePlan(plan.name, plan.startDate, plan.endDate);
            if (created && created.id) {
              planIdMap[plan.id] = created.id;
              importedPlansCount++;
            }
          }
        }

        // Import leaves (including WFH and Office records)
        for (const leaf of backupData.leaves) {
          if (!leaf.date || !leaf.type) continue;
          const mappedPlanId = leaf.plan_id ? (planIdMap[leaf.plan_id] || null) : null;
          await addLeave(leaf.date, leaf.type, leaf.note || '', mappedPlanId, leaf.duration || 1);
          importedLeavesCount++;
        }

        resolve({
          success: true,
          leavesCount: importedLeavesCount,
          plansCount: importedPlansCount,
          quotaSettings: backupData.quotaSettings || null
        });
      } catch (err) {
        console.error('Failed to parse or import backup file:', err);
        resolve({ success: false, error: err.message });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read backup file.' });
    };

    reader.readAsText(jsonFile);
  });
};

/**
 * Export all user leave & WFH records to a formatted CSV spreadsheet file.
 */
export const exportUserDataToCsv = async () => {
  try {
    const bookedLeaves = await fetchBookedLeaves();
    const leavePlans = await fetchLeavePlans();

    const planNameMap = {};
    (leavePlans || []).forEach(p => {
      if (p.id) planNameMap[p.id] = p.name;
    });

    const labels = {
      pl: 'Privileged Leave',
      el: 'Emergency Leave',
      rh: 'Restricted Holiday',
      wfh: 'Work From Home',
      office: 'In-Office'
    };

    const headers = ['Date', 'Type Code', 'Record Type', 'Duration (Days)', 'Plan Name', 'Notes', 'Status'];
    const rows = [headers];

    (bookedLeaves || []).forEach(b => {
      const typeCode = (b.type || '').toUpperCase();
      const recordType = labels[b.type] || b.type || 'Leave';
      const duration = b.duration || 1;
      const planName = b.leave_plans?.name || (b.plan_id ? planNameMap[b.plan_id] : '') || '-';
      const note = (b.note || '').replace(/"/g, '""');
      const status = (b.status || 'planned').toUpperCase();

      rows.push([
        `"${b.date}"`,
        `"${typeCode}"`,
        `"${recordType}"`,
        `"${duration}"`,
        `"${planName.replace(/"/g, '""')}"`,
        `"${note}"`,
        `"${status}"`
      ]);
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const todayStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave_planner_spreadsheet_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: (bookedLeaves || []).length };
  } catch (err) {
    console.error('Failed to export CSV:', err);
    return { success: false, error: err.message };
  }
};
