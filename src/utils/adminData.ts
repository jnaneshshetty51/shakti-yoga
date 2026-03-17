export type User = {
    id: string;
    name: string;
    email: string;
    role: 'member_everyday' | 'member_therapy' | 'trial' | 'visitor' | 'admin';
    status: 'Active' | 'Inactive' | 'Trial';
    plan?: string;
    lastLogin: string;
    joinedAt: string;
};

export type Subscription = {
    id: string;
    userId: string;
    userName: string;
    plan: 'Everyday Yoga' | 'Yoga Therapy' | 'Trial';
    amount: number;
    status: 'Active' | 'Cancelled' | 'Paused' | 'Trial';
    renewalDate: string;
};

export type ClassBatch = {
    id: string;
    name: string;
    time: string;
    days: string[];
    teacher: string;
    active: boolean;
};

export type Booking = {
    id: string;
    userId: string;
    userName: string;
    type: 'Therapy' | 'Consultation';
    date: string;
    time: string;
    status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
    teacher: string;
};

export const mockUsers: User[] = [
    { id: '1', name: 'Jnanesh Shetty', email: 'jnanesh@example.com', role: 'member_everyday', status: 'Active', plan: 'Everyday Yoga', lastLogin: '2 hours ago', joinedAt: 'Nov 1, 2025' },
    { id: '2', name: 'Sarah Jones', email: 'sarah@example.com', role: 'member_therapy', status: 'Active', plan: 'Yoga Therapy', lastLogin: '1 day ago', joinedAt: 'Oct 15, 2025' },
    { id: '3', name: 'Mike Ross', email: 'mike@example.com', role: 'trial', status: 'Trial', plan: 'Trial', lastLogin: '3 days ago', joinedAt: 'Nov 20, 2025' },
    { id: '4', name: 'Rachel Green', email: 'rachel@example.com', role: 'visitor', status: 'Inactive', lastLogin: '1 week ago', joinedAt: 'Sep 10, 2025' },
    { id: '5', name: 'Harvey Specter', email: 'harvey@example.com', role: 'member_everyday', status: 'Active', plan: 'Everyday Yoga', lastLogin: '5 hours ago', joinedAt: 'Aug 5, 2025' },
];

export const mockSubscriptions: Subscription[] = [
    { id: 'sub_1', userId: '1', userName: 'Jnanesh Shetty', plan: 'Everyday Yoga', amount: 59, status: 'Active', renewalDate: 'Dec 1, 2025' },
    { id: 'sub_2', userId: '2', userName: 'Sarah Jones', plan: 'Yoga Therapy', amount: 199, status: 'Active', renewalDate: 'Dec 15, 2025' },
    { id: 'sub_3', userId: '3', userName: 'Mike Ross', plan: 'Trial', amount: 0, status: 'Trial', renewalDate: 'Nov 27, 2025' },
    { id: 'sub_4', userId: '5', userName: 'Harvey Specter', plan: 'Everyday Yoga', amount: 59, status: 'Active', renewalDate: 'Dec 5, 2025' },
];

export const mockBatches: ClassBatch[] = [
    { id: 'b_1', name: 'Morning Flow A', time: '06:00 AM IST', days: ['Mon', 'Wed', 'Fri'], teacher: 'Priya', active: true },
    { id: 'b_2', name: 'Evening Unwind', time: '07:00 PM IST', days: ['Tue', 'Thu'], teacher: 'Rahul', active: true },
    { id: 'b_3', name: 'Weekend Warrior', time: '08:00 AM IST', days: ['Sat', 'Sun'], teacher: 'Sarah', active: true },
];

export const mockBookings: Booking[] = [
    { id: 'bk_1', userId: '2', userName: 'Sarah Jones', type: 'Therapy', date: 'Nov 23, 2025', time: '10:00 AM', status: 'Confirmed', teacher: 'Dr. Rao' },
    { id: 'bk_2', userId: '4', userName: 'Rachel Green', type: 'Consultation', date: 'Nov 24, 2025', time: '02:00 PM', status: 'Pending', teacher: 'Priya' },
];
