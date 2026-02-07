window.Scheduler = {
    // Simple Greedy Scheduler with Random Retries
    autoSchedule: async (allData) => {
        // 1. Get all subjects that need scheduling
        // Calculate total slots needed per subject (hours)
        let tasks = [];
        allData.subjects.forEach(s => {
            const placed = allData.timetable.filter(t => t.subject_id === s.__backendId).length;
            const needed = (s.hours || 1) - placed;
            if (needed > 0) {
                for (let i = 0; i < needed; i++) {
                    tasks.push({ subject_id: s.__backendId, subject: s });
                }
            }
        });

        if (tasks.length === 0) {
            return { success: true, message: 'ไม่มีรายวิชาที่ต้องจัดเพิ่ม' };
        }

        // Sort tasks by constraints (Hardest first)? 
        // e.g. Teachers with high constraints, or Subjects with specific room types.
        tasks.sort((a, b) => {
            // Heuristic: Teachers with fewer available slots should go first. 
            // For now, simplify: Random shuffle to vary results on retry
            return Math.random() - 0.5;
        });

        const newTimetable = [];
        const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
        const periods = [1, 2, 3, 4, 6, 7, 8, 9]; // Skip 5 (Lunch)

        // Try to place each task
        for (const task of tasks) {
            let placed = false;
            // Try all slots loosely
            // Shuffle slots to avoid bunching
            const slots = [];
            days.forEach(d => periods.forEach(p => slots.push({ day: d, period: p })));
            slots.sort(() => Math.random() - 0.5);

            for (const slot of slots) {
                // strict check against current allData + newTimetable
                // We need to verify against 'allData' AND 'newTimetable' so we don't conflict with ourselves.
                // But Constraints.validateSlot checks allData.timetable. 
                // We should temporarily push to allData.timetable or mock it.

                // Construct a temporary combined state
                const currentTimetableState = [...allData.timetable, ...newTimetable];

                // We need a helper that checks conflicts against a custom timetable array
                // But Constraints.HARD functions accept 'allData'. 
                // We can mock allData.timetable
                const tempAllData = {
                    ...allData,
                    timetable: currentTimetableState
                };

                const candidateSlot = {
                    day: slot.day,
                    period: slot.period,
                    subject_id: task.subject_id
                };

                const validation = window.Constraints.validateSlot(tempAllData, candidateSlot);

                // Also check if this slot is already taken in newTimetable (Constraints engine DOES check provided timetable)
                // Constraints.HARD.noRoomConflict and noTeacherConflict use allData.timetable.
                // Since we updated tempAllData.timetable, it should "Just Work".

                // One missing check: Is the specific slot occupied? 
                // Constraints might not check if *any* class is there if we didn't implement "Room Conflict" fully.
                // But simplified: A slot in ONE CLASSROOM map (view) is unique?
                // Wait, the current app is "School Timetable" or "Classroom Timetable"?
                // The current view seems to be "School Wide" or "Manage Subjects".
                // Actually, the Timetable View in index.html is ONE big table. 
                // This implies a SINGLE CLASSROOM or SINGLE TEACHER view?
                // OR it's a "Master Schedule" where we see everything?
                // Index.html has "Subject Pool" and "Timetable".
                // If it's a single table, then `noOverlap` is the main constraint.
                // The `handleDrop` checks `appState.allData.timetable.some(t => t.day === day && t.period == period)`.
                // This implies ONLY ONE CLASS can happen at a time in this view?
                // If so, this is a Single Classroom App.
                // BUT we have "Classrooms" table.
                // Usage: User selects a classroom (or we are generating for ALL).
                // If we are generating for ALL, we can't put everything in one table view.

                // Assumption: The implementation plan Phase 2 is "Advanced Scheduling". 
                // It likely implies generating for ALL classrooms.
                // But the UI `renderTimetable` iterates days/periods and finds `entry`.
                // `entry` is unique per slot.
                // This confirms the current UI view is a SINGLE TRACK (e.g., 1 room or 1 entity).
                // However, the data model supports multiple subjects/teachers/rooms.
                // If the user views "Page Timetable", what are they viewing?
                // They are viewing the "Master Timetable" ?? 
                // If so, checking `some` means checking if *any* class is scheduled there?
                // If 2 classes happen at 08:00 (Math in Room 1, Sci in Room 2), `some` would be true if we just check day/period.
                // This means the current `renderTimetable` only supports ONE event per slot.

                // Correction: The default view seems to be "View by Class" or "View by Teacher" but currently shows ALL?
                // If it shows ALL, it would overlap.
                // Let's look at `index.html`: `entry = appState.allData.timetable.find(...)`. 
                // `find` returns first match.
                // So yes, currently the UI only shows 1 class per slot.
                // This is a limitation.

                // For Auto Schedule, we should respect this limitation if the goal is "Fill THIS view".
                // But if the goal is "Schedule the whole school", we need to know for WHICH entity we are scheduling?
                // Or maybe we verify that we can place it *somewhere*?

                // Let's assume for now we are filling the `timetable` table which, if valid, implies:
                // For a specific Classroom?
                // The `timetable` table lacks `classroom_id`.
                // This is a major schema issue I noted earlier.
                // *For Prototype*: Maybe the User IS the "School" and we just schedule "School Timetable"?
                // If so, then 1 slot = 1 class. 
                // Example: A small tutoring school with 1 room?
                // Or maybe the user *filters* by classroom?
                // `appState.allData.timetable` loads ALL records.

                // ACTION: I will proceed assuming we want to fill *non-conflicting* slots.
                // Since `validateSlot` checks constraints, we rely on it.
                // And we check if slot is empty in `tempAllData.timetable`.

                const isSlotOccupied = tempAllData.timetable.some(t => t.day === slot.day && t.period === slot.period);

                if (validation.valid && !isSlotOccupied) {
                    newTimetable.push(candidateSlot);
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                // If strict, fail. If soft, ignore?
                // For "Auto-Schedule", we try to fit as much as possible.
            }
        }

        // Return result
        return {
            success: true,
            scheduled: newTimetable,
            count: newTimetable.length,
            totalNeeded: tasks.length
        };
    }
};
