
const SUPABASE_URL = 'https://yefpafuqjbdvkyiynziw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZnBhZnVxamJkdmt5aXlueml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzc1NTksImV4cCI6MjA4NTk1MzU1OX0.QljXcAwYwkNYJjfBdmt9iIA5aHoFdZkU2MJXda7f4TU';

const appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Data SDK Wrapper to match original interface somewhat but using Supabase
const dataSdk = {
    async init(callback) {
        // Determine what data to fetch
        // For now, fetch everything to keep it simple like lostorage version
        try {
            const [teachers, subjects, classrooms, timetable, substitutes] = await Promise.all([
                appSupabaseClient.from('teachers').select('*'),
                appSupabaseClient.from('subjects').select('*'),
                appSupabaseClient.from('classrooms').select('*'),
                appSupabaseClient.from('timetable').select('*'),
                appSupabaseClient.from('substitutes').select('*')
            ]);

            const allData = [
                ...teachers.data.map(d => ({ ...d, type: 'teacher', __backendId: d.id })),
                ...subjects.data.map(d => ({ ...d, type: 'subject', __backendId: d.id })),
                ...classrooms.data.map(d => ({ ...d, type: 'classroom', __backendId: d.id })),
                ...timetable.data.map(d => ({ ...d, type: 'timetable', __backendId: d.id })),
                ...substitutes.data.map(d => ({ ...d, type: 'substitute', __backendId: d.id }))
            ];

            if (callback && callback.onDataChanged) {
                callback.onDataChanged(allData);
            }
            return allData;
        } catch (error) {
            console.error("Error init data:", error);
            return [];
        }
    },

    async create(item) {
        const tableMap = {
            'teacher': 'teachers',
            'subject': 'subjects',
            'classroom': 'classrooms',
            'timetable': 'timetable',
            'substitute': 'substitutes'
        };
        const table = tableMap[item.type];
        if (!table) return { isOk: false };

        // Remove client-side only props
        const { type, __backendId, ...data } = item;

        const { data: created, error } = await appSupabaseClient.from(table).insert(data).select().single();

        if (error) {
            console.error("Create error:", error);
            return { isOk: false, error };
        }

        // Refresh data (naive approach for prototype)
        this.init(window.appDataHandler);
        return { isOk: true, data: created };
    },

    async delete(item) {
        const tableMap = {
            'teacher': 'teachers',
            'subject': 'subjects',
            'classroom': 'classrooms',
            'timetable': 'timetable',
            'substitute': 'substitutes'
        };
        const table = tableMap[item.type];
        if (!table || !item.__backendId) return { isOk: false };

        const { error } = await appSupabaseClient.from(table).delete().eq('id', item.__backendId);

        if (error) {
            console.error("Delete error:", error);
            return { isOk: false, error };
        }

        // Refresh
        this.init(window.appDataHandler);
        return { isOk: true };
    }
};

window.dataSdk = dataSdk; // Expose to window
