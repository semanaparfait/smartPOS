interface users{
    id: number;
    name: string;
    email: string;
    password: string;
    role: 'owner' | 'worker';
    pin:number;
}

export const users: users[] = [
    {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'securepassword',
        role: 'worker',
        pin: 123456
    },
    {
        id: 2,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: 'anothersecurepassword',
        role: 'owner',
        pin: 654321
    },
    {
        id: 3,
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        password: 'yetanothersecurepassword',
        role: 'worker',
        pin: 987654

    }


];