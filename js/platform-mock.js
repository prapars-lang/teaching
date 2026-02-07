
// Mock Platform Database Service
// In production, this would query the 'schools' and 'platform_users' tables in the Platform DB.

const MOCK_PLATFORM_DATA = {
    schools: [
        {
            id: 'school-a-uuid',
            name: 'โรงเรียนสาธิต (Demo School A)',
            subdomain: 'demo-a',
            db_config: {
                url: 'https://yefpafuqjbdvkyiynziw.supabase.co', // Using current project as School A
                key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZnBhZnVxamJkdmt5aXlueml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzc1NTksImV4cCI6MjA4NTk1MzU1OX0.QljXcAwYwkNYJjfBdmt9iIA5aHoFdZkU2MJXda7f4TU'
            }
        },
        {
            id: 'school-b-uuid',
            name: 'โรงเรียนนานาชาติ (International School B)',
            subdomain: 'inter-b',
            db_config: {
                url: 'https://yefpafuqjbdvkyiynziw.supabase.co', // Reuse same DB for prototype, but logically separate in mind
                key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZnBhZnVxamJkdmt5aXlueml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzc1NTksImV4cCI6MjA4NTk1MzU1OX0.QljXcAwYwkNYJjfBdmt9iIA5aHoFdZkU2MJXda7f4TU'
            }
        }
    ],
    // Map emails to schools
    user_memberships: {
        'admin@test.com': ['school-a-uuid', 'school-b-uuid'], // Admin belongs to both
        'teacher@test.com': ['school-a-uuid']
    }
};

const PlatformService = {
    async resolveUserSchools(email) {
        // Simulate API delay
        await new Promise(r => setTimeout(r, 500));

        const schoolIds = MOCK_PLATFORM_DATA.user_memberships[email] || [];
        if (schoolIds.length === 0) {
            // Default fall back for unknown users for prototype: Assign to School A
            return [MOCK_PLATFORM_DATA.schools[0]];
        }

        return MOCK_PLATFORM_DATA.schools.filter(s => schoolIds.includes(s.id));
    },

    async getSchoolConfig(schoolId) {
        await new Promise(r => setTimeout(r, 300));
        return MOCK_PLATFORM_DATA.schools.find(s => s.id === schoolId)?.db_config;
    }
};

window.PlatformService = PlatformService;
