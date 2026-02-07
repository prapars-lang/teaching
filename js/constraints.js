window.Constraints = {
    // Hard Constraints (Must return true to be valid)
    HARD: {
        // Teacher cannot be in two places at once
        noTeacherConflict: (allData, newSlot) => {
            // newSlot: { day, period, subject_id, teacher_id? }
            // If just checking a theoretical slot, we need to know the teacher.
            // Assuming newSlot comes with 'subject_id' we can look up the teacher.

            const subject = allData.subjects.find(s => s.__backendId === newSlot.subject_id);
            if (!subject) return true; // Can't check if subject not found

            const teacherName = subject.teacher_name;
            if (!teacherName) return true;

            // Check if this teacher is teaching another subject at the same time
            const conflict = allData.timetable.find(t =>
                t.day === newSlot.day &&
                t.period == newSlot.period &&
                // If editing, exclude self (not implemented yet, assume insert)
                // Need to find subject of this existing slot
                allData.subjects.find(s => s.__backendId === t.subject_id)?.teacher_name === teacherName
            );

            return !conflict;
        },

        // Room cannot host two classes (Assuming 1 room per subject for now)
        // Wait, current schema doesn't bind Subject to a specific Room instance, just "Required Room Type" 
        // OR the Classroom is assigned to the Timetable?
        // Current Schema: Timetable -> Subject. Subject -> Teacher.
        // Where is the Room assigned?
        // The current schema DOES NOT store 'classroom_id' in 'timetable' table.
        // It seems the prototype assumes Subjects have a fixed room or it's not modeled yet in Timetable.
        // Looking at database_schema.sql: 
        // create table timetable ( ... subject_id uuid ... ); 
        // create table subjects ( ... required_room_type ... );
        // create table classrooms ( ... );
        // There is NO LINK between Timetable and Classroom currently.
        // IMPLICATION: We cannot check Room Conflict yet unless we assign a Room to the Timetable Slot.
        // For Phase 2, maybe we just skip Room Conflict or assume "Subject's default room"?
        // But Subject doesn't have a default room, only Teacher has "building".
        // Let's assume for now we don't assign specific rooms per slot, 
        // OR, we should upgrade Timetable to include 'classroom_id'.
        // The user implementation plan says "Room Conflict: A room cannot host two classes at once."
        // This implies necessary data structure change.
        // I will add 'classroom_id' to timetable in the next step if needed. 
        // For now, I'll return true.
        noRoomConflict: (allData, newSlot) => {
            return true;
        }
    },

    // Soft Constraints (Return a score 0-1 or penalty cost)
    SOFT: {

    },

    // Main Validation Function
    validateSlot: (allData, newSlot) => {
        const { timetable, subjects, teachers } = allData;
        const subject = subjects.find(s => s.__backendId === newSlot.subject_id);
        if (!subject) return { valid: false, error: 'ไม่พบรายวิชา' };

        // 1. Teacher Conflict
        if (!window.Constraints.HARD.noTeacherConflict(allData, newSlot)) {
            return { valid: false, error: `ครู ${subject.teacher_name} ติดสอนวิชาอื่นในคาบนี้` };
        }

        // 2. Teacher Unavailable Time
        const teacher = teachers.find(t => t.name === subject.teacher_name);
        if (teacher && teacher.unavailable_times) {
            // unavailable_times: [{ text: "จันทร์-1" }] or similar. 
            // Need to parse standard format. 
            // Current input is free text. Ideally strict format like "Day-Period"
            // Let's assume text contains "Day" and "Period" or match logic.
            // For prototype, simple string match if user entered "Monday-1"
            const conflict = teacher.unavailable_times.some(u => {
                const txt = u.text || "";
                return txt.includes(newSlot.day) && txt.includes(newSlot.period.toString());
            });
            if (conflict) {
                return { valid: false, error: `ครู ${teacher.name} ไม่สะดวกในช่วงเวลานี้` };
            }
        }

        // 3. Room Capacity (If we had room assignment)

        return { valid: true };
    }
};
