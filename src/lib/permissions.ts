/**
 * The permission matrix, as code. `role` here is the mapped role the JWT carries
 * (see mapDatabaseRole): visitor | trial | member_everyday | member_therapy |
 * teacher | admin. Admin tier (super vs staff) is a separate axis — see
 * requireSuperAdmin() in admin-auth.ts.
 *
 * This is the single source of truth; API routes and UI should call can()
 * rather than testing role strings inline.
 */

export type MappedRole =
    | 'visitor'
    | 'trial'
    | 'member_everyday'
    | 'member_therapy'
    | 'teacher'
    | 'admin';

export type Action =
    | 'site.view'          // public marketing site
    | 'class.join'         // join the daily Everyday Yoga group class
    | 'therapy.book'       // book a 1:1 therapy session (spends a credit)
    | 'consult.book'       // book the single trial consultation
    | 'dashboard.access'   // member dashboard
    | 'admin.access'       // any /admin route
    | 'admin.classes'      // create/edit/cancel classes + Meet links
    | 'admin.users'        // view/edit users, credits, membership
    | 'admin.content'      // blog / stories / testimonials / FAQ / groups
    | 'admin.audit'        // read the audit log
    | 'admin.grant_admin'; // promote/demote to a *_ADMIN role  (super only — enforced separately)

const MATRIX: Record<Action, MappedRole[]> = {
    'site.view': ['visitor', 'trial', 'member_everyday', 'member_therapy', 'teacher', 'admin'],
    'class.join': ['trial', 'member_everyday', 'teacher', 'admin'],
    'therapy.book': ['member_therapy', 'admin'],
    'consult.book': ['trial'],
    'dashboard.access': ['trial', 'member_everyday', 'member_therapy', 'teacher', 'admin'],
    'admin.access': ['admin'],
    'admin.classes': ['admin'],
    'admin.users': ['admin'],
    'admin.content': ['admin'],
    'admin.audit': ['admin'],
    'admin.grant_admin': ['admin'], // + tier === 'super', checked by requireSuperAdmin
};

export function can(role: string | null | undefined, action: Action): boolean {
    if (!role) return action === 'site.view';
    return (MATRIX[action] ?? []).includes(role as MappedRole);
}

/** Map a DB Role enum value to its admin tier, or null for non-admins. */
export function adminTier(dbRole: string): 'super' | 'staff' | null {
    if (dbRole === 'SUPER_ADMIN') return 'super';
    if (dbRole === 'STAFF_ADMIN') return 'staff';
    return null;
}
