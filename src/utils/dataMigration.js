import { fetchBookedLeaves, fetchLeavePlans, addLeave, createLeavePlan, resetAllLeaves } from '../services/leaveService';

/**
 * Export all user leaves (PL, EL, RH, WFH, Office), plans, and settings into a JSON backup file.
 */
export const exportUserDataToJson = async (leavesQuota = { pl: 15, el: 10, rh: 1 }, userId = null) => {
  try {
    const bookedLeaves = await fetchBookedLeaves(userId);
    const leavePlans = await fetchLeavePlans(userId);

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
 * Import user leaves (including WFH/Office) and plans from a JSON backup file directly into Supabase.
 * Deletes existing plans and leaves for the target profile first to prevent duplicate plans.
 */
export const importUserDataFromJson = async (jsonFile, userId = null) => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const backupData = JSON.parse(content);

        if (!backupData || !Array.isArray(backupData.leaves)) {
          throw new Error('Invalid backup file format: missing "leaves" array.');
        }

        // Clean slate: Delete existing leave plans and leaves for this user profile to prevent duplicates
        await resetAllLeaves(userId);

        let importedLeavesCount = 0;
        let importedPlansCount = 0;

        // Import plans first if available (scoped to userId)
        const planIdMap = {};
        if (Array.isArray(backupData.plans)) {
          for (const plan of backupData.plans) {
            const created = await createLeavePlan(plan.name, plan.startDate, plan.endDate, userId);
            if (created && created.id) {
              planIdMap[plan.id] = created.id;
              importedPlansCount++;
            }
          }
        }

        // Import leaves (including WFH and Office records, scoped to userId)
        for (const leaf of backupData.leaves) {
          if (!leaf.date || !leaf.type) continue;
          const mappedPlanId = leaf.plan_id ? (planIdMap[leaf.plan_id] || null) : null;
          await addLeave(leaf.date, leaf.type, leaf.note || '', mappedPlanId, leaf.duration || 1, userId);
          importedLeavesCount++;
        }

        resolve({
          success: true,
          leavesCount: importedLeavesCount,
          plansCount: importedPlansCount,
          quotaSettings: backupData.quotaSettings || null
        });
      } catch (err) {
        console.error('Import failed:', err);
        resolve({
          success: false,
          error: err.message || 'Unknown error occurred while parsing JSON backup.'
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read backup file.'
      });
    };

    reader.readAsText(jsonFile);
  });
};

/**
 * Export leave records to a formatted CSV file.
 */
export const exportUserDataToCsv = async (userId = null) => {
  try {
    const bookedLeaves = await fetchBookedLeaves(userId);
    
    if (!bookedLeaves || bookedLeaves.length === 0) {
      return { success: false, error: 'No leave records found to export.' };
    }

    const headers = ['Date', 'Leave Type', 'Duration', 'Plan Name', 'Note'];
    const rows = bookedLeaves.map(b => [
      b.date,
      (b.type || 'PL').toUpperCase(),
      b.duration || 1,
      `"${(b.plan_name || '').replace(/"/g, '""')}"`,
      `"${(b.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave_records_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: bookedLeaves.length };
  } catch (err) {
    console.error('Failed to export CSV:', err);
    return { success: false, error: err.message };
  }
};
