interface users{
    id: number;
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: 'owner' | 'worker' | 'manager' | 'kitchen';
    pin:number;
    status?: 'active' | 'inactive';
    salary?: number;
    faceid?: any; 
    faceidEnabled?: boolean;
    profilePicture?: string; 
}

export const users: users[] = [
    {
        id: 1,
        name: 'semana shema parfait',
        email: 'shema@pos.com',
        password: 'securepassword',
        role: 'worker',
        pin: 123456,
        status: 'active',
        salary: 50000,
        faceid: require('@/assets/face/bebe.jpg'),
        faceidEnabled: true,
        profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg'
    },
    {
        id: 2,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: 'anothersecurepassword',
        role: 'owner',
        pin: 654321,
        status: 'active',
        salary: 80000,
        faceid: require('@/assets/face/me1.jpg'),
        faceidEnabled: false,
        profilePicture: 'https://randomuser.me/api/portraits/women/2.jpg'
    },
    {
        id: 3,
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        password: 'yetanothersecurepassword',
        role: 'kitchen',
        pin: 987654,
        status: 'active',
        salary: 50000,
        faceid: require('@/assets/face/mere.jpg'),
        faceidEnabled: true,
        profilePicture: 'https://randomuser.me/api/portraits/women/3.jpg'

    },
    {
        id: 4,
        name: 'Bob Brown',
        email: 'bob.brown@example.com',
        password: 'yetanothersecurepassword',
        role: 'worker',
        pin: 456789,
        status: 'active',
        salary: 50000,
        faceid: require('@/assets/face/taa.jpg'),
        faceidEnabled: true,
        profilePicture: 'https://randomuser.me/api/portraits/men/4.jpg'
    }


];